import { IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  studentId: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}
