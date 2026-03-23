import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'lex@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '12341234' })
  @IsString()
  @MinLength(8)
  password: string;
}
