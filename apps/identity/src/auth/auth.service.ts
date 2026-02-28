import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
    });

    if (existing) {
      throw new ConflictException('Student already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.student.create({
      data: {
        studentId: dto.studentId,
        name: dto.name,
        password: hashedPassword,
      },
    });

    return {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
    };
  }

  async login(dto: LoginDto) {
    const student = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      student.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Determine role: comma-separated ADMIN_STUDENT_IDS env var
    const adminIds = (process.env.ADMIN_STUDENT_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const role = adminIds.includes(student.studentId) ? 'admin' : 'student';

    const payload = { sub: student.studentId, name: student.name, role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      studentId: student.studentId,
      name: student.name,
      role,
    };
  }
}
