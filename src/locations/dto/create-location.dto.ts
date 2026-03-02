import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã kho (code) không được để trống' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên kho (name) không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  address?: string;
}
