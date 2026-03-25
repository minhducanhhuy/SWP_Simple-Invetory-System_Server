import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsPhoneNumber,
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
  @IsPhoneNumber('VN', { message: 'Số điện thoại không đúng định dạng' })
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
  // bỏ qua trường hợp người dùng không nhập gì hoặc nhập chuỗi rỗng, mặc định là 0
  initialDebt?: number; // Nợ đầu kỳ (nếu có)

  @IsString()
  @IsNotEmpty()
  locationId: string;
}
