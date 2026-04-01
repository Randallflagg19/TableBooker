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

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'anna@example.com',
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

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiHideProperty()
  @ValidateIf((dto: RegisterDto) => !dto.email && !dto.phone)
  @IsString({ message: 'Either email or phone must be provided' })
  protected readonly contactRequired?: string;
}
