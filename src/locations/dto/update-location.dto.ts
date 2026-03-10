import { PartialType } from '@nestjs/mapped-types';
import { CreateLocationDto } from './create-location.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // [MỚI] Cho phép cập nhật trạng thái
}
