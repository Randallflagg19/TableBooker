import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: '07ebdb21-248a-4519-9511-25f0aa16081c',
  })
  tableId: string;

  @ApiProperty({
    example: '0fe60283-cac0-4d7b-90bf-d65c6da44c42',
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
