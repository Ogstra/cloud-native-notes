import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { NotesService } from '../notes/notes.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private notesService: NotesService,
    ) { }

    async loginGuest() {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const email = `guest_${Date.now()}_${suffix}@demo.local`;
        const password = `guest_${Date.now()}`;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email,
                username: `Guest ${suffix}`,
                password: hashedPassword,
            },
        });

        await this.notesService.seedDemoData(user.id);

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
}
