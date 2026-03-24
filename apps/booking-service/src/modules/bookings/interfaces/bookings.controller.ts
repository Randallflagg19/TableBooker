import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { BookingsService } from '../application/bookings.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthClientService } from '../../../infrastructure/auth-client/auth-client.service';
import type { Request } from 'express';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly authClientService: AuthClientService,
  ) {}

  @Post()
  @ApiBearerAuth()
  public async create(@Body() dto: CreateBookingDto, @Req() request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, accessToken] = authorization.split(' ');

    if (scheme !== 'Bearer' || !accessToken) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const authResult =
      await this.authClientService.validateAccessToken(accessToken);

    if (!authResult.isValid) {
      throw new UnauthorizedException('Invalid access token');
    }

    return this.bookingsService.create(dto, authResult.userId);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '2b0def79-e057-4e7a-999e-bf5e3c65fcbc',
  })
  public async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.findById(id);
  }

  @Get('user/:userId')
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'e67747cb-70c2-4883-9ae5-d73c21d00a4a',
  })
  public async findByUserId(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.bookingsService.findByUserId(userId);
  }

  @Patch(':id/cancel')
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '2b0def79-e057-4e7a-999e-bf5e3c65fcbc',
  })
  public async cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.cancel(id);
  }

  @Patch(':id/confirm')
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '2b0def79-e057-4e7a-999e-bf5e3c65fcbc',
  })
  public async confirm(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.confirm(id);
  }
}
