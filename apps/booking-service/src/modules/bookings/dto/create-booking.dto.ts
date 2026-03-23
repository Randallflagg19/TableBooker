import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'd5870e60-60e2-4b60-94bf-c5c39085939e' })
  @IsUUID()
  tableId: string;

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
