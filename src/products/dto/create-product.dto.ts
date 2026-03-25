import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  unitId: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  sellPrice: number;

  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
