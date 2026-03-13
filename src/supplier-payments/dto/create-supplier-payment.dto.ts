import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsNotEmpty()
  @IsUUID()
  supplierId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1000) // Thanh toán tối thiểu 1000đ
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
