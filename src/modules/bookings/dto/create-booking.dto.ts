import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '07ebdb21-248a-4519-9511-25f0aa16081c' })
  @IsUUID()
  tableId: string;

  @ApiProperty({ example: '0fe60283-cac0-4d7b-90bf-d65c6da44c42' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  guests: number;

  @ApiProperty({ example: '2026-03-17T18:00:00Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-03-17T20:00:00Z' })
  @IsDateString()
  endAt: string;
}
