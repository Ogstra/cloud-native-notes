import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoteDto {
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsArray()
    categoryIds?: number[];

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    reminder?: Date;
}

export class UpdateNoteDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsBoolean()
    isArchived?: boolean;

    @IsOptional()
    @IsBoolean()
    isPinned?: boolean;

    @IsOptional()
    @IsArray()
    categoryIds?: number[];

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    reminder?: Date;
}
