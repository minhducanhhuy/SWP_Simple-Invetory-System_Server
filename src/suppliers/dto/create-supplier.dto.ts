export class CreateSupplierDto {}
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @IsNotEmpty({ message: 'Mã nhà cung cấp không được để trống' })
  @IsString()
  code: string; // VD: SUP001

  @IsNotEmpty({ message: 'Tên nhà cung cấp không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialDebt?: number; // Nợ đầu kỳ (nếu có)
}
