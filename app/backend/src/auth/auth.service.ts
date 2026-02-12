import {
    ConflictException,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { NotesService } from '../notes/notes.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AuthService.name);
    private readonly guestPoolTargetSize = 3;
    private readonly guestCleanupMaxAgeMs = 24 * 60 * 60 * 1000;
    private readonly maintenanceIntervalMs = 60 * 60 * 1000;
    private maintenanceTimer?: NodeJS.Timeout;
    private maintenanceRunning = false;
    private poolPasswordHash?: string;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private notesService: NotesService,
    ) { }

    onModuleInit() {
        void this.runGuestMaintenance();
        this.maintenanceTimer = setInterval(() => {
            void this.runGuestMaintenance();
        }, this.maintenanceIntervalMs);
    }

    onModuleDestroy() {
        if (this.maintenanceTimer) {
            clearInterval(this.maintenanceTimer);
        }
    }

    async loginGuest() {
        const claimedGuest = await this.claimPrewarmedGuest();
        let user = claimedGuest;

        if (!user) {
            user = await this.createTimestampGuest();
            void this.notesService.seedDemoData(user.id).catch((error: unknown) => {
                this.logger.error(
                    'Failed to seed demo data for on-demand guest',
                    this.formatError(error),
                );
            });
        }

        void this.ensureGuestPool().catch((error: unknown) => {
            this.logger.error('Failed to refill guest pool', this.formatError(error));
        });

        return this.generateToken(user);
    }

    async register(dto: RegisterDto) {
        const normalizedEmail = dto.email.toLowerCase().trim();

        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: normalizedEmail,
                username: dto.username,
                password: hashedPassword,
            },
        });

        return this.generateToken(user);
    }

    async login(dto: LoginDto) {
        const input = dto.email.toLowerCase().trim();

        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: input },
                    { username: input }
                ]
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateToken(user);
    }

    private generateToken(user: any) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                username: user.username ?? null,
            },
        };
    }

    private async runGuestMaintenance() {
        if (this.maintenanceRunning) {
            return;
        }

        this.maintenanceRunning = true;
        try {
            await this.cleanupExpiredTimestampGuests();
            await this.ensureGuestPool();
        } finally {
            this.maintenanceRunning = false;
        }
    }

    private async ensureGuestPool() {
        const poolCount = await this.prisma.user.count({
            where: {
                email: {
                    startsWith: 'guest_pool_',
                },
            },
        });

        const missingUsers = Math.max(0, this.guestPoolTargetSize - poolCount);
        if (missingUsers === 0) {
            return;
        }

        for (let i = 0; i < missingUsers; i++) {
            await this.createPrewarmedGuest();
        }
    }

    private async createPrewarmedGuest() {
        const unique = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}_${randomUUID().slice(0, 8)}`;
        const hashedPassword = await this.getPoolPasswordHash();

        const user = await this.prisma.user.create({
            data: {
                email: `guest_pool_${unique}@demo.local`,
                username: `GuestPool_${unique}`,
                password: hashedPassword,
            },
        });

        await this.notesService.seedDemoData(user.id);
    }

    private async claimPrewarmedGuest() {
        for (let attempt = 0; attempt < 3; attempt++) {
            const candidate = await this.prisma.user.findFirst({
                where: {
                    email: {
                        startsWith: 'guest_pool_',
                    },
                },
                orderBy: {
                    id: 'asc',
                },
            });

            if (!candidate) {
                return null;
            }

            const unique = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            const updated = await this.prisma.user.updateMany({
                where: {
                    id: candidate.id,
                    email: candidate.email,
                },
                data: {
                    email: `guest_${unique}@demo.local`,
                    username: `Guest_${unique}`,
                },
            });

            if (updated.count === 1) {
                return this.prisma.user.findUnique({
                    where: {
                        id: candidate.id,
                    },
                });
            }
        }

        return null;
    }

    private async createTimestampGuest() {
        const unique = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const password = `guest_${unique}`;
        const hashedPassword = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: {
                email: `guest_${unique}@demo.local`,
                username: `Guest_${unique}`,
                password: hashedPassword,
            },
        });
    }

    private async cleanupExpiredTimestampGuests() {
        const now = Date.now();
        const candidates = await this.prisma.user.findMany({
            where: {
                email: {
                    startsWith: 'guest_',
                },
            },
            select: {
                id: true,
                email: true,
            },
        });

        const expiredGuestIds = candidates
            .filter((candidate) => {
                const match = candidate.email.match(/^guest_(\d+)_\d+@demo\.local$/);
                if (!match) {
                    return false;
                }
                const createdAt = Number(match[1]);
                return Number.isFinite(createdAt) && now - createdAt >= this.guestCleanupMaxAgeMs;
            })
            .map((candidate) => candidate.id);

        if (expiredGuestIds.length === 0) {
            return;
        }

        await this.prisma.$transaction([
            this.prisma.note.deleteMany({
                where: {
                    userId: { in: expiredGuestIds },
                },
            }),
            this.prisma.category.deleteMany({
                where: {
                    userId: { in: expiredGuestIds },
                },
            }),
            this.prisma.user.deleteMany({
                where: {
                    id: { in: expiredGuestIds },
                },
            }),
        ]);

        this.logger.log(`Deleted ${expiredGuestIds.length} expired guest users`);
    }

    private async getPoolPasswordHash() {
        if (!this.poolPasswordHash) {
            this.poolPasswordHash = await bcrypt.hash(`guest_pool_${randomUUID()}`, 10);
        }
        return this.poolPasswordHash;
    }

    private formatError(error: unknown) {
        if (error instanceof Error) {
            return error.stack ?? error.message;
        }
        return String(error);
    }
}
