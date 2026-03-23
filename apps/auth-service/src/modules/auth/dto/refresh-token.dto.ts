import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N2YyMjE4ZS1mN2IyLTRiNjItYTAwNC1lYWFjMzhkMDQ0NjMiLCJlbWFpbCI6ImxleEBleGFtcGxlLmNvbSIsInJvbGUiOiJHVUVTVCIsImlhdCI6MTc3Mzk0ODIwMSwiZXhwIjoxNzc0NTUzMDAxfQ.RU_TejAo2Gq8E0Suolkz6MB5X_M0KSXviZPbB433ioY',
  })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
