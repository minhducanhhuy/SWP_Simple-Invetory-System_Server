import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Role, TicketStatus, TicketType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // --- 1. TẠO SẢN PHẨM MỚI ---
  async create(createProductDto: CreateProductDto) {
    const { supplierIds, ...productData } = createProductDto;

    // Check trùng SKU
    const exist = await this.prisma.product.findUnique({
      where: { sku: productData.sku },
    });
    if (exist) throw new BadRequestException('Mã SKU đã tồn tại!');

    return await this.prisma.$transaction(async (tx) => {
      // B1: Tạo Product (Core data)
      const product = await tx.product.create({
        data: {
          sku: productData.sku,
          name: productData.name,
          categoryId: productData.categoryId,
          unitId: productData.unitId,
          costPrice: productData.costPrice || 0,
          sellPrice: productData.sellPrice || 0,
          minStockLevel: productData.minStockLevel ?? 10,
          description: productData.description,
          imageUrl: productData.imageUrl,
          isActive: true,
          // FIX LỖI SUPPLIER: Lưu supplierId đầu tiên nếu FE gửi lên 1 mảng
          suppliers:
            supplierIds && supplierIds.length > 0
              ? {
                  connect: supplierIds.map((id) => ({ id })),
                }
              : undefined,
        },
      });

      // B2: Khởi tạo tồn kho bằng 0 cho tất cả các kho hiện có
      const locations = await tx.location.findMany({
        where: { isActive: true },
      });
      if (locations.length > 0) {
        const inventoryData = locations.map((loc) => ({
          productId: product.id,
          locationId: loc.id,
          quantity: 0,
        }));
        await tx.inventoryItem.createMany({ data: inventoryData });
      }

      return product;
    });
  }

  // --- 2. LẤY DANH SÁCH & TỒN KHO ---
  async findAll(
    query: {
      search?: string;
      categoryId?: string;
      locationId?: string;
      minPrice?: string;
      maxPrice?: string;
      sortPrice?: 'asc' | 'desc';
    },
    userRole?: string,
  ) {
    const { search, categoryId, locationId, minPrice, maxPrice, sortPrice } =
      query;

    const whereCondition: any = { isActive: true };

    console.log(query);

    // --- Search & Filters (Giữ nguyên) ---
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) whereCondition.categoryId = categoryId;
    if (minPrice || maxPrice) {
      whereCondition.sellPrice = {};
      if (minPrice) whereCondition.sellPrice.gte = Number(minPrice);
      if (maxPrice) whereCondition.sellPrice.lte = Number(maxPrice);
    }

    const products = await this.prisma.product.findMany({
      where: whereCondition,
      include: {
        category: true,
        unit: true,
        suppliers: true,
        inventory: locationId ? { where: { locationId: locationId } } : true,
      },
      // [QUAN TRỌNG]: ĐOẠN CODE NÀY DÙNG ĐỂ SẮP XẾP GIÁ BÁN
      orderBy: sortPrice ? { sellPrice: sortPrice } : { createdAt: 'desc' },
    });

    return products.map((p) => {
      // FIX LỖI TS2339: p.inventory bây giờ đã tồn tại nhờ lệnh include bên trên
      const stock = locationId
        ? p.inventory?.[0]?.quantity || 0
        : p.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;

      const safeCostPrice =
        userRole === Role.SALESPERSON ? 0 : Number(p.costPrice);

      return {
        ...p,
        costPrice: safeCostPrice,
        currentStock: stock,
        // Trả về array để frontend cũ không bị lỗi map()
        displaySuppliers: p.suppliers || [],
      };
    });
  }

  async findOne(id: string) {
    return await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, unit: true, inventory: true, suppliers: true },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { supplierIds, ...productData } = updateProductDto;

    return await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        // FIX LỖI SUPPLIER UPDATE
        ...(supplierIds !== undefined && {
          suppliers: {
            set: supplierIds.map((id) => ({ id })), // Dùng 'set' để xóa kết nối cũ, ghi đè kết nối mới
          },
        }),
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // [MỚI] Lấy lịch sử giao dịch của sản phẩm
  async getProductHistory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true },
    });

    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const transactions = await this.prisma.stockTransaction.findMany({
      where: { productId },
      include: {
        ticket: {
          select: {
            code: true,
            type: true,
            reason: true,
            createdAt: true,
            creator: { select: { fullName: true } },
          },
        },
      },
      orderBy: { ticket: { createdAt: 'desc' } },
    });

    return { product, history: transactions };
  }
}
