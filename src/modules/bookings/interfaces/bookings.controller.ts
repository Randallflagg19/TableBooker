import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BookingsService } from '../application/bookings.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  public async create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '2b0def79-e057-4e7a-999e-bf5e3c65fcbc',
  })
  public async findById(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }
}
