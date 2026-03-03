import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUnitDto {
  @IsNotEmpty({ message: 'Tên đơn vị tính không được để trống' })
  @IsString()
  name: string; // VD: Cái, Hộp, Thùng
}

export class UpdateUnitDto extends CreateUnitDto {}
