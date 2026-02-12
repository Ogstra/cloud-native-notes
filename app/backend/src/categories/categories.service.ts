import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: number, dto: CreateCategoryDto) {
        const existing = await this.prisma.category.findFirst({
            where: { userId, name: dto.name },
        });

        if (existing) throw new ConflictException('Category already exists');

        return this.prisma.category.create({
            data: {
                name: dto.name,
                userId,
            },
        });
    }

    async findAll(userId: number) {
        return this.prisma.category.findMany({
            where: { userId },
        });
    }

    async remove(userId: number, id: number) {
        const category = await this.prisma.category.findFirst({
            where: { id, userId },
        });

        if (!category) throw new NotFoundException('Category not found');

        return this.prisma.category.delete({
            where: { id },
        });
    }

    async update(userId: number, id: number, dto: UpdateCategoryDto) {
        const category = await this.prisma.category.findFirst({
            where: { id, userId },
        });

        if (!category) throw new NotFoundException('Category not found');

        return this.prisma.category.update({
            where: { id },
            data: { name: dto.name },
        });
    }
}
