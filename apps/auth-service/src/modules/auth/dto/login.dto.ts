import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'lex@example.com',
    description: 'Optional, but email or phone must be provided',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '+79991234567',
    description: 'Optional, but email or phone must be provided',
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '12341234' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiHideProperty()
  @ValidateIf((dto: LoginDto) => !dto.email && !dto.phone)
  @IsString({ message: 'Either email or phone must be provided' })
  protected readonly contactRequired?: string;
}
