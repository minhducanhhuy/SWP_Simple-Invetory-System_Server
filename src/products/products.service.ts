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
    const { ...productData } = createProductDto;

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
          supplierId: productData.supplierId, // <--- BỔ SUNG DÒNG NÀY ĐỂ LƯU VÀO DB
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

  // --- 2. LẤY DANH SÁCH (Hỗ trợ lọc & Search) ---
  async findAll(query: {
    search?: string;
    categoryId?: string;
    locationId?: string;
    minPrice?: string;
    maxPrice?: string;
    sortPrice?: 'asc' | 'desc';
  }, userRole?: Role) {

    const { search, categoryId, locationId } = query;

    const whereCondition: any = { isActive: true };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

  
  // PRICE FILTER
const priceFilter: any = {};

    if (query.minPrice) {
      priceFilter.gte = Number(query.minPrice);
    }

    if (query.maxPrice) {
      priceFilter.lte = Number(query.maxPrice);
    }

    if (Object.keys(priceFilter).length > 0) {
      whereCondition.sellPrice = priceFilter;
    }

    const products = await this.prisma.product.findMany({
      where: whereCondition,
      include: {
        category: true,
        unit: true,
        inventory: locationId ? { where: { locationId } } : false,
        supplier: true, // <--- THÊM DÒNG NÀY ĐỂ KÉO THEO NHÀ CUNG CẤP
      },
      orderBy: query.sortPrice
        ? { sellPrice: query.sortPrice }
        : { createdAt: 'desc' },
    });

    // Format lại data để trả về Total Stock hoặc Stock theo kho
    return products.map((p) => {
      const stock = p.inventory?.[0]?.quantity || 0;

      // Logic bảo mật: Nếu là Salesperson thì costPrice = 0
      const safeCostPrice =
        userRole === Role.SALESPERSON ? 0 : Number(p.costPrice);

      return {
        ...p,
        costPrice: safeCostPrice, // Trả về giá vốn đã xử lý
        currentStock: stock,
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
    // Chỉ update thông tin cơ bản, không can thiệp vào quantity ở đây
    return await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
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
