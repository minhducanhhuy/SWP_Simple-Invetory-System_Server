import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/roles.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@Controller('master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ================= CATEGORY API =================

  @Get('categories')
  getAllCategories() {
    return this.masterDataService.findAllCategories();
  }

  @Post('categories')
  @Roles(Role.ADMIN_SYSTEM) // Chỉ Admin/Manager được tạo
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.masterDataService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(Role.ADMIN_SYSTEM)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.masterDataService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(Role.ADMIN_SYSTEM)
  removeCategory(@Param('id') id: string) {
    return this.masterDataService.removeCategory(id);
  }

  // ================= UNIT API =================

  @Get('units')
  getAllUnits() {
    return this.masterDataService.findAllUnits();
  }

  @Post('units')
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER)
  createUnit(@Body() dto: CreateUnitDto) {
    return this.masterDataService.createUnit(dto);
  }

  @Patch('units/:id')
  @Roles(Role.ADMIN_SYSTEM)
  updateUnit(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.masterDataService.updateUnit(id, dto);
  }

  @Delete('units/:id')
  @Roles(Role.ADMIN_SYSTEM)
  removeUnit(@Param('id') id: string) {
    return this.masterDataService.removeUnit(id);
  }
}
