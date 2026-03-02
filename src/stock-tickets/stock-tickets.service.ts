import { Injectable } from '@nestjs/common';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { UpdateStockTicketDto } from './dto/update-stock-ticket.dto';

@Injectable()
export class StockTicketsService {
  create(createStockTicketDto: CreateStockTicketDto) {
    return 'This action adds a new stockTicket';
  }

  findAll() {
    return `This action returns all stockTickets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} stockTicket`;
  }

  update(id: number, updateStockTicketDto: UpdateStockTicketDto) {
    return `This action updates a #${id} stockTicket`;
  }

  remove(id: number) {
    return `This action removes a #${id} stockTicket`;
  }
}
