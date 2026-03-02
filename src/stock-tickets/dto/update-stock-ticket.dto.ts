import { PartialType } from '@nestjs/mapped-types';
import { CreateStockTicketDto } from './create-stock-ticket.dto';

export class UpdateStockTicketDto extends PartialType(CreateStockTicketDto) {}
