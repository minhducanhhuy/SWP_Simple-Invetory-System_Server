// src/stock-tickets/dto/create-stock-ticket.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketType, TicketStatus, ReasonCode } from '@prisma/client';
import { IsDateString } from 'class-validator'; // <--- Thêm import này ở trên cùng
class TicketDetailDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number; // Giá nhập hoặc giá bán tại thời điểm tạo phiếu

  @IsOptional()
  @IsNumber()
  systemQty?: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  date?: string; // <--- Thêm dòng này vào DTO
}

export class CreateStockTicketDto {
  @IsNotEmpty({ message: 'Loại phiếu (Nhập/Xuất) không được để trống' })
  @IsEnum(TicketType)
  type: TicketType;

  @IsNotEmpty({ message: 'Bắt buộc phải chọn lý do cụ thể (Reason Code)' })
  @IsEnum(ReasonCode, { message: 'Mã lý do không hợp lệ' })
  reason: ReasonCode; // SCRAP, GIFT, TRANSFER, RETURN...

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus = TicketStatus.COMPLETED;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  supplierId?: string; // Dùng cho IMPORT



  @IsOptional()
  @IsString()
  customerId?: string; // Dùng cho SELL


  @IsOptional()
  @IsString()
  sourceLocationId?: string; // Kho xuất (Dùng cho SELL, TRANSFER)

  @IsOptional()
  @IsString()
  destLocationId?: string; // Kho nhập (Dùng cho IMPORT, TRANSFER)

  @IsArray()
  @IsNotEmpty({ message: 'Danh sách sản phẩm không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => TicketDetailDto)
  details: TicketDetailDto[];
}
