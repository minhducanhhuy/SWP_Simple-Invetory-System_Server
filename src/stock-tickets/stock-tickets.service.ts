import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { TicketStatus, TicketType, ReasonCode } from '@prisma/client';

@Injectable()
export class StockTicketsService {
  constructor(private prisma: PrismaService) { }

  // Trả về danh sách lý do để hiện lên dropdown ở React
  getReasonCodes() {
    return Object.values(ReasonCode);
  }

  // src/stock-tickets/stock-tickets.service.ts

  async create(dto: CreateStockTicketDto, creatorId: string) {
    const { details, ...ticketData } = dto;

    return await this.prisma.$transaction(async (tx) => {

      // =========================================================================
      // [THÊM MỚI] 1. KIỂM TRA TỒN KHO NGAY TỪ ĐẦU (Chặn ngay từ vòng gửi xe)
      // Nếu là lệnh lấy hàng ra khỏi kho (Xuất/Chuyển) -> Phải check tồn kho ngay
      // =========================================================================
      if (dto.type !== TicketType.STOCKTAKE && dto.sourceLocationId) {
        for (const item of details) {
          const currentInv = await tx.inventoryItem.findUnique({
            where: { locationId_productId: { locationId: dto.sourceLocationId, productId: item.productId } },
          });

          if (!currentInv || currentInv.quantity < item.quantity) {
            // Lấy thêm tên sản phẩm để báo lỗi bằng tiếng Việt cho người dùng dễ hiểu
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            throw new BadRequestException(`Sản phẩm "${prod?.name || item.productId}" chỉ còn ${currentInv?.quantity || 0} trong kho xuất. Không đủ số lượng để tạo yêu cầu (${item.quantity})!`);
          }
        }
      }

      // 1. Lưu phiếu vào bảng
      const ticket = await tx.stockTicket.create({
        data: {
          ...ticketData,
          code: `TK-${Date.now()}`,
          creatorId: creatorId,
          // [SỬA LẠI] Ép chết trạng thái PENDING_APPROVAL nếu là Kiểm kê, cấm cãi!
          status: (dto.type === 'STOCKTAKE' || String(dto.type) === 'STOCKTAKE')
            ? 'PENDING_APPROVAL' as any
            : (ticketData.status ?? 'COMPLETED' as any),

          details: {
            create: details.map((item) => {
              // 1. KHAI BÁO RÕ RÀNG KIỂU DỮ LIỆU LÀ Date HOẶC null
              let parsedExpiryDate: Date | null = null; 

              if (dto.type === 'IMPORT' && item.expiryDate) {
                const parts = item.expiryDate.split('/');
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  parsedExpiryDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

                  // 2. CHUYỂN LOGIC CHECK VÀO TRONG NÀY ĐỂ TRÁNH LỖI "POSSIBLY NULL"
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); 

                  if (parsedExpiryDate <= today) {
                    throw new BadRequestException('Hạn sử dụng của sản phẩm nhập vào phải sau ngày hôm nay!');
                  }
                } else {
                  throw new BadRequestException('Hạn sử dụng phải đúng định dạng dd/mm/yyyy');
                }
              }

              return {
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                systemQty: item.systemQty,
                actualQty: item.actualQty,
                note: item.note,
                expiryDate: parsedExpiryDate, 
              };
            }),
          },
        },
      });


      // 2. XỬ LÝ KHO (Dựa theo trạng thái phiếu)

      // TRƯỜNG HỢP A: Phiếu Hoàn Thành (Nhập/Xuất bình thường) -> Trừ và Cộng kho ngay
      // [QUAN TRỌNG] Khóa cửa không cho phiếu Kiểm kê lọt vào đây!
      if (ticket.status === TicketStatus.COMPLETED && ticket.type !== 'STOCKTAKE') {
        for (const item of details) {
          if (dto.sourceLocationId) {
            const currentInv = await tx.inventoryItem.findUnique({
              where: { locationId_productId: { locationId: dto.sourceLocationId, productId: item.productId } },
            });
            if (!currentInv || currentInv.quantity < item.quantity) {
              throw new BadRequestException(`Sản phẩm ${item.productId} không đủ tồn kho để xuất!`);
            }
            await tx.inventoryItem.update({
              where: { locationId_productId: { locationId: dto.sourceLocationId, productId: item.productId } },
              data: { quantity: { decrement: item.quantity } },
            });
          }

          if (dto.destLocationId) {
            await tx.inventoryItem.upsert({
              where: { locationId_productId: { locationId: dto.destLocationId, productId: item.productId } },
              update: { quantity: { increment: item.quantity } },
              create: { locationId: dto.destLocationId, productId: item.productId, quantity: item.quantity },
            });
          }
        }
      }


      // TRƯỜNG HỢP B: Phiếu Đi Đường (Owner tạo chuyển kho) -> Hàng lên xe tải, CHỈ TRỪ KHO NGUỒN
      else if (ticket.status === TicketStatus.IN_TRANSIT) {
        for (const item of details) {
          if (dto.sourceLocationId) {
            const currentInv = await tx.inventoryItem.findUnique({
              where: { locationId_productId: { locationId: dto.sourceLocationId, productId: item.productId } },
            });
            if (!currentInv || currentInv.quantity < item.quantity) {
              throw new BadRequestException(`Sản phẩm không đủ tồn kho để xuất đi!`);
            }
            await tx.inventoryItem.update({
              where: { locationId_productId: { locationId: dto.sourceLocationId, productId: item.productId } },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        }
      }
      // TRƯỜNG HỢP C: PENDING_APPROVAL -> Không làm gì cả, chờ Sếp duyệt.

      return ticket;
    });
  }

  async approve(id: string, user: any) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.stockTicket.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!ticket) throw new NotFoundException('Phiếu không tồn tại');
      if (ticket.status !== TicketStatus.PENDING_APPROVAL) {
        throw new BadRequestException('Phiếu chỉ có thể duyệt khi ở trạng thái PENDING_APPROVAL');
      }

      // =========================================================================
      // [THÊM MỚI] CHẶN QUẢN LÝ TỰ DUYỆT PHIẾU CỦA MÌNH TẠO
      // Owner (Sếp tổng) thì có quyền sinh sát tối cao, duyệt thoải mái
      // =========================================================================
      if (ticket.creatorId === user.id && user.role !== 'OWNER') {
        throw new BadRequestException('Vui lòng liên hệ với Owner để được duyệt');
      }

      for (const item of ticket.details) {
        // --- LOGIC 1: PHIẾU KIỂM KÊ ---
        if (ticket.type === 'STOCKTAKE') {
          const diff = (item.actualQty ?? 0) - (item.systemQty ?? 0);
          if (diff !== 0) {
            const locationId = ticket.sourceLocationId;
            if (!locationId) throw new BadRequestException('Lỗi: Không có kho kiểm kê!');

            if (diff > 0) {
              await tx.inventoryItem.upsert({
                where: { locationId_productId: { locationId, productId: item.productId } },
                update: { quantity: { increment: diff } },
                create: { locationId, productId: item.productId, quantity: diff },
              });
            } else if (diff < 0) {
              await tx.inventoryItem.update({
                where: { locationId_productId: { locationId, productId: item.productId } },
                data: { quantity: { decrement: Math.abs(diff) } },
              });
            }
          }
        }
        // --- LOGIC 2: YÊU CẦU CHUYỂN KHO (MANAGER TẠO) ---
        else if (ticket.reason === 'TRANSFER') {
          // Sếp duyệt -> Hàng chính thức bốc lên xe tải (Trừ kho Source)
          if (ticket.sourceLocationId) {

            // 1. KIỂM TRA TỒN KHO TRƯỚC KHI TRỪ (THÊM ĐOẠN NÀY VÀO ĐỂ BẮT LỖI 500)
            const currentInv = await tx.inventoryItem.findUnique({
              where: { locationId_productId: { locationId: ticket.sourceLocationId, productId: item.productId } },
            });

            if (!currentInv || currentInv.quantity < item.quantity) {
              // Bắn ra lỗi 400 cực kỳ thân thiện để Frontend hiện alert()
              throw new BadRequestException(`Lỗi: Sản phẩm (ID: ${item.productId}) chỉ còn ${currentInv?.quantity || 0} sản phẩm trong kho xuất, không đủ để luân chuyển ${item.quantity} sản phẩm!`);
            }

            // 2. NẾU ĐỦ HÀNG THÌ MỚI TRỪ KHO
            await tx.inventoryItem.update({
              where: { locationId_productId: { locationId: ticket.sourceLocationId, productId: item.productId } },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        }
      }

      // Đổi trạng thái: Chuyển kho thì thành IN_TRANSIT (đi đường), Kiểm kê thì thành COMPLETED (chốt sổ)
      const newStatus = ticket.reason === 'TRANSFER' ? TicketStatus.IN_TRANSIT : TicketStatus.COMPLETED;

      return tx.stockTicket.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  }

  async findAll() {
    return this.prisma.stockTicket.findMany({
      include: { details: true, creator: { select: { fullName: true } }, sourceLocation: { select: { name: true } }, destLocation: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.stockTicket.findUnique({
      where: { id },
      include: { details: { include: { product: { include: { unit: true } } } }, sourceLocation: { select: { name: true } }, destLocation: { select: { name: true } }, creator: { select: { fullName: true } } },
    });
  }

  async cancel(id: string, reason?: string) {
    const ticket = await this.prisma.stockTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Phiếu không tồn tại');
    if (ticket.status !== TicketStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể từ chối phiếu đang chờ duyệt');
    }

    // Ghi đè hoặc thêm lý do hủy vào cột note hiện tại
    const updatedNote = reason ? `[LÝ DO HỦY]: ${reason}` : ticket.note;

    return this.prisma.stockTicket.update({
      where: { id },
      data: {
        status: TicketStatus.CANCELLED,
        note: updatedNote
      },
    });
  }

  // --- KHO ĐÍCH NHẬN HÀNG CHUYỂN ĐẾN ---
  // [SỬA Ở ĐÂY] - Nhận thêm biến userLocationId
  async receiveTransfer(id: string, actualDetails: any[], userLocationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.stockTicket.findUnique({ where: { id }, include: { details: true } });

      if (!ticket) throw new NotFoundException('Phiếu không tồn tại');
      if (ticket.status !== TicketStatus.IN_TRANSIT) throw new BadRequestException('Phiếu này không ở trạng thái đang giao hàng!');
      if (!ticket.destLocationId) throw new BadRequestException('Lỗi: Không xác định được kho đích!');

      // CHẶN 2: Kiểm tra chéo xem Thủ kho có đang đứng đúng ở Kho Đích không
      if (ticket.destLocationId !== userLocationId) {
        throw new BadRequestException('Gian lận: Bạn đang thao tác ở kho khác, không được phép nhận hàng thay cho kho đích!');
      }

      // Vòng lặp cộng hàng vào kho Đích dựa trên số lượng ĐẾM THỰC TẾ
      const importDetailsData: any[] = []; // Ép kiểu thành any[] để TypeScript ngừng báo lỗi
      for (const item of ticket.details) {
        // Tìm số lượng thực nhận từ Frontend gửi lên
        const receivedItem = actualDetails.find(d => d.productId === item.productId);
        const qtyToReceive = receivedItem ? receivedItem.actualQty : item.quantity;

        // 1. Cộng hàng cho kho đích
        await tx.inventoryItem.upsert({
          where: { locationId_productId: { locationId: ticket.destLocationId, productId: item.productId } },
          update: { quantity: { increment: qtyToReceive } },
          create: { locationId: ticket.destLocationId, productId: item.productId, quantity: qtyToReceive },
        });

        // 2. Cập nhật lại số lượng thực nhận vào chi tiết phiếu Transfer
        await tx.stockTransaction.update({
          where: { id: item.id },
          data: { actualQty: qtyToReceive }
        });

        // Chuẩn bị dữ liệu cho Phiếu Nhập tự động
        if (qtyToReceive > 0) {
          importDetailsData.push({
            productId: item.productId,
            quantity: qtyToReceive,
            price: item.price, // Kế thừa giá vốn từ phiếu chuyển
            note: 'Nhận từ lệnh chuyển kho',
          });
        }
      }

      // 3. Hoàn tất chuyến đi (Cập nhật phiếu TRANSFER thành COMPLETED)
      const updatedTransferTicket = await tx.stockTicket.update({
        where: { id },
        data: { status: TicketStatus.COMPLETED },
      });

      // 4. [TÍNH NĂNG MỚI] TỰ ĐỘNG SINH PHIẾU NHẬP KHO (Giống Nhanh.vn)
      if (importDetailsData.length > 0) {
        await tx.stockTicket.create({
          data: {
            code: `PN-CK-${Date.now()}`, // Tạo mã phiếu có chữ PN-CK (Phiếu Nhập - Chuyển Kho)
            type: TicketType.IMPORT,
            reason: ReasonCode.TRANSFER, // Lý do: Nhận chuyển kho
            status: TicketStatus.COMPLETED,
            destLocationId: ticket.destLocationId,
            sourceLocationId: ticket.sourceLocationId, // Lưu lại dấu vết kho gửi
            creatorId: ticket.creatorId, // Lấy người tạo lệnh gốc (Hoặc bạn có thể truyền ID thủ kho nhận vào đây)
            note: `[HỆ THỐNG TỰ ĐỘNG] Nhập hàng từ lệnh chuyển kho ${ticket.code}`,
            details: {
              create: importDetailsData,
            },
          },
        });
      }

      return updatedTransferTicket;
    });
  }
}