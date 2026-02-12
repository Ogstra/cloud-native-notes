import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Req,
    Put,
    UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateCategoryDto) {
        return this.categoriesService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.categoriesService.findAll(req.user.userId);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.remove(req.user.userId, id);
    }

    @Put(':id')
    update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
        return this.categoriesService.update(req.user.userId, id, dto);
    }
}
