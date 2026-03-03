import { Injectable, BadRequestException } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@Injectable()
export class MasterDataService {
  constructor(private prisma: PrismaService) {}

  // ================= CATEGORY =================
  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } }, // Đếm xem có bao nhiêu SP thuộc danh mục này
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    // Check xem có sản phẩm nào đang dùng danh mục này không
    const count = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang chứa sản phẩm!',
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }

  // ================= UNIT =================
  async createUnit(dto: CreateUnitDto) {
    // Check trùng tên đơn vị tính
    const exist = await this.prisma.unit.findUnique({
      where: { name: dto.name },
    });
    if (exist) throw new BadRequestException('Đơn vị tính này đã tồn tại');

    return this.prisma.unit.create({ data: dto });
  }

  async findAllUnits() {
    return this.prisma.unit.findMany();
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async removeUnit(id: string) {
    const count = await this.prisma.product.count({ where: { unitId: id } });
    if (count > 0) {
      throw new BadRequestException('Không thể xóa ĐVT đang được sử dụng!');
    }
    return this.prisma.unit.delete({ where: { id } });
  }
}
