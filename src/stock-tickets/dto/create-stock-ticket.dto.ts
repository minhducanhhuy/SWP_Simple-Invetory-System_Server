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

class TicketDetailDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number; // Giá nhập hoặc giá bán tại thời điểm tạo phiếu
}

export class CreateStockTicketDto {
  @IsNotEmpty()
  @IsEnum(TicketType)
  type: TicketType; // IMPORT, SELL, TRANSFER...

  @ValidateIf((o) => o.type === TicketType.ADJUSTMENT)
  @IsNotEmpty({ message: 'Phải chọn lý do điều chỉnh (Xuất hủy/Nội bộ...)' })
  @IsEnum(ReasonCode, { message: 'Mã lý do không hợp lệ' })
  reason?: ReasonCode;

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
  @ValidateNested({ each: true })
  @Type(() => TicketDetailDto)
  details: TicketDetailDto[];
}
