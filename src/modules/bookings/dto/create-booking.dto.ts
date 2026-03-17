import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: 'id_стола',
  })
  tableId: string;

  @ApiProperty({
    example: 'id_пользователя',
  })
  userId: string;

  @ApiProperty({
    example: 2,
  })
  guests: number;

  @ApiProperty({
    example: '2026-03-17T18:00:00Z',
  })
  startAt: string;

  @ApiProperty({
    example: '2026-03-17T20:00:00Z',
  })
  endAt: string;
}
