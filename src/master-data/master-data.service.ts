import { Injectable, BadRequestException } from '@nestjs/common';

import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Category, Unit } from '@prisma/client';

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
    return this.prisma.unit.findMany({
      include: { _count: { select: { products: true } } },
    });
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

  // ================= CATEGORY SYNC =================
  async syncCategories(dtos: CreateCategoryDto[]) {
    // 1. Chuẩn hóa dữ liệu từ Excel
    const excelNames = [
      ...new Set(
        dtos.map((d) => String(d.name || '').trim()).filter((n) => n !== ''),
      ),
    ];

    // 2. Lấy dữ liệu hiện có
    const currentItems = await this.prisma.category.findMany();
    const currentNames = currentItems.map((c) => c.name.toLowerCase());

    // 3. Phân loại hành động
    const toCreate = excelNames.filter(
      (name) => !currentNames.includes(name.toLowerCase()),
    );
    const toRemove = currentItems.filter(
      (curr) =>
        !excelNames.some((ex) => ex.toLowerCase() === curr.name.toLowerCase()),
    );

    // 4. Xóa an toàn (Safe Delete)
    const skipped: string[] = [];
    let deletedCount = 0;

    for (const item of toRemove) {
      const productCount = await this.prisma.product.count({
        where: { categoryId: item.id },
      });
      if (productCount > 0) {
        skipped.push(item.name);
      } else {
        await this.prisma.category.delete({ where: { id: item.id } });
        deletedCount++;
      }
    }

    // 5. Thêm mới
    if (toCreate.length > 0) {
      await this.prisma.category.createMany({
        data: toCreate.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    return {
      createdCount: toCreate.length,
      deletedCount,
      skippedDeletions: skipped,
    };
  }

  // ================= UNIT SYNC =================
  async syncUnits(dtos: CreateUnitDto[]) {
    const excelNames = [
      ...new Set(
        dtos.map((d) => String(d.name || '').trim()).filter((n) => n !== ''),
      ),
    ];

    const currentItems = await this.prisma.unit.findMany();
    const currentNames = currentItems.map((u) => u.name.toLowerCase());

    const toCreate = excelNames.filter(
      (name) => !currentNames.includes(name.toLowerCase()),
    );
    const toRemove = currentItems.filter(
      (curr) =>
        !excelNames.some((ex) => ex.toLowerCase() === curr.name.toLowerCase()),
    );

    const skipped: string[] = [];
    let deletedCount = 0;

    for (const item of toRemove) {
      const productCount = await this.prisma.product.count({
        where: { unitId: item.id },
      });
      if (productCount > 0) {
        skipped.push(item.name);
      } else {
        await this.prisma.unit.delete({ where: { id: item.id } });
        deletedCount++;
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.unit.createMany({
        data: toCreate.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    return {
      createdCount: toCreate.length,
      deletedCount,
      skippedDeletions: skipped,
    };
  }
}
