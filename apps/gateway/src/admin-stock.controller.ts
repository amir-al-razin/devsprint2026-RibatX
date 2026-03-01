import {
  Controller,
  Patch,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from './common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Controller('admin/stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminStockController {
  constructor(private readonly httpService: HttpService) {}

  // PATCH /admin/stock/restock  { quantity: number }
  // Authenticated admins call this to set the Meal Box quantity.
  // The gateway proxies to the stock service internal endpoint.
  @Patch('restock')
  async restock(@Body('quantity') quantity: number) {
    if (
      typeof quantity !== 'number' ||
      quantity < 0 ||
      !Number.isInteger(quantity)
    ) {
      throw new BadRequestException('quantity must be a non-negative integer');
    }
    const stockUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';
    const res = await firstValueFrom(
      this.httpService.patch(`${stockUrl}/stock/restock`, { quantity }),
    );
    return res.data;
  }
}
