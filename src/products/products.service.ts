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
  constructor(private prisma: PrismaService) { }

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
          suppliers: {
            create: supplierIds && supplierIds.length > 0
              ? supplierIds.map((id: string) => ({
                  supplierId: id,
                }))
              : [], 
          },
        },
      });

      // B2: Khởi tạo Inventory = 0 cho TẤT CẢ kho đang hoạt động
      // Để sau này vào trang quản lý kho không bị lỗi "null"
      const locations = await tx.location.findMany({
        where: { isActive: true },
      });
      
      return product;
    });
  }

  async findAll(query: {
  search?: string;
  categoryId?: string;
  locationId?: string;
  minPrice?: string;
  maxPrice?: string;
  sortPrice?: 'asc' | 'desc';
}, userRole?: Role) {

  const { search, categoryId, locationId, minPrice, maxPrice, sortPrice } = query;
  const whereCondition: any = { isActive: true };

  // 1. Filter Search & Category
  if (search) {
    whereCondition.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) whereCondition.categoryId = categoryId;

  // 2. Filter Price (Parse về số để Prisma hiểu)
  if (minPrice || maxPrice) {
    whereCondition.sellPrice = {};
    if (minPrice) whereCondition.sellPrice.gte = parseFloat(minPrice);
    if (maxPrice) whereCondition.sellPrice.lte = parseFloat(maxPrice);
  }

  // 3. Sắp xếp
  const orderBy: any = sortPrice 
    ? { sellPrice: sortPrice } 
    : { createdAt: 'desc' };

  // 4. Truy vấn
  const products = await this.prisma.product.findMany({
    where: whereCondition,
    include: {
      category: true,
      unit: true,
      inventory: locationId ? { where: { locationId } } : true,
      suppliers: {
        include: { supplier: true }
      },
    },
    orderBy: orderBy,
  });

  // 5. Trả về data đã xử lý
  return products.map((p) => {
    // Tính tồn kho thông minh: theo kho lẻ hoặc tổng kho
    const stock = locationId 
      ? (p.inventory?.[0]?.quantity || 0)
      : p.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;

    const safeCostPrice = userRole === 'SALESPERSON' ? 0 : Number(p.costPrice);

    return {
      ...p,
      costPrice: safeCostPrice, 
      sellPrice: Number(p.sellPrice),
      currentStock: stock,
      displaySuppliers: p.suppliers?.map(ps => ps.supplier) || [],
    };
  });
}

  async findOne(id: string) {
    return await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, unit: true, inventory: true },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { supplierIds, ...productData } = updateProductDto as any;
    // Chỉ update thông tin cơ bản, không can thiệp vào quantity ở đây
    return await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        // Nếu có gửi mảng supplierIds lên -> Cập nhật quan hệ
        ...(supplierIds !== undefined && {
          suppliers: {
            deleteMany: {}, // Xóa các liên kết NCC cũ
            create: supplierIds.map((sid: string) => ({ supplierId: sid })), // Tạo mới
          },
        }),
      },
    });
  }

  async remove(id: string) {
    // Soft delete: Chỉ set isActive = false
    return await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // [MỚI] Lấy lịch sử giao dịch của sản phẩm
  async getProductHistory(productId: string) {
    // Tìm sản phẩm trước để đảm bảo tồn tại
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, transactions: true }, // Lấy info cơ bản
    });

    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    // Lấy danh sách transaction
    const transactions = await this.prisma.stockTransaction.findMany({
      where: { productId },
      include: {
        ticket: {
          select: {
            code: true,
            type: true,
            reason: true, // <--- QUAN TRỌNG: Lấy lý do điều chỉnh
            createdAt: true,
            creator: { select: { fullName: true } }, // Người tạo
          },
        },
      },
      orderBy: { ticket: { createdAt: 'desc' } }, // Mới nhất lên đầu
    });

    return { product, history: transactions };
  }
}
