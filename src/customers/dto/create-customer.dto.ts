import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'Mã khách hàng không được để trống' })
  @IsString()
  code: string; // VD: KH001

  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Bạn có thể thêm email nếu schema có (hiện tại schema customer chưa có email, nhưng nếu cần có thể thêm)
}
