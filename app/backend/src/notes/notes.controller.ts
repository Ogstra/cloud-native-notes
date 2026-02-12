import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
    ParseIntPipe,
    ParseBoolPipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
    constructor(private readonly notesService: NotesService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateNoteDto) {
        return this.notesService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Req() req: any, @Query() query: any) {
        const { isArchived, isDeleted, categoryId, categoryIds, search, cursor, limit, hasReminder } = query;
        const parsedCategoryIds = categoryIds
            ? String(categoryIds)
                .split(',')
                .map((id: string) => Number(id))
                .filter((id: number) => !Number.isNaN(id))
            : undefined;
        return this.notesService.findAll(
            req.user.userId,
            isArchived === 'true',
            isDeleted === 'true',
            categoryId ? Number(categoryId) : undefined,
            parsedCategoryIds,
            search,
            cursor ? Number(cursor) : undefined,
            limit ? Number(limit) : 20,
            hasReminder === 'true'
        );
    }

    @Put('reorder')
    reorder(@Body() body: { notes: { id: number; position: number }[] }) {
        return this.notesService.reorder(body.notes);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.notesService.findOne(req.user.userId, id);
    }

    @Put(':id')
    update(
        @Req() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateNoteDto,
    ) {
        return this.notesService.update(req.user.userId, id, dto);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.notesService.remove(req.user.userId, id);
    }

    @Post(':id/restore')
    restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.notesService.restore(req.user.userId, id);
    }

    @Delete(':id/permanent')
    deletePermanent(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.notesService.deletePermanent(req.user.userId, id);
    }
}
