// src/invoices/dto/create-invoice.dto.ts
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

class InvoiceDetailDto {
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
    unitPrice: number;
}

export class CreateInvoiceDto {
    @IsNotEmpty()
    @IsString()
    locationId: string; // Chi nhánh đang bán hàng

    @IsOptional()
    @IsString()
    customerId?: string; // Khách hàng (nếu có)

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    amountPaid: number; // Tiền khách đưa

    @IsOptional()
    @IsNumber()
    discount?: number = 0; // Giảm giá

    @IsNotEmpty()
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceDetailDto)
    details: InvoiceDetailDto[];
}