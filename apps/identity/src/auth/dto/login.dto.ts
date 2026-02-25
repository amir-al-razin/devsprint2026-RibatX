import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  studentId: string;

  @IsString()
  @MinLength(6)
  password: string;
}
