import { Controller, Post, Get, Body } from '@nestjs/common';

@Controller('chaos')
export class ChaosController {
  private static shouldCrash = false;

  @Post('toggle')
  toggleChaos(@Body('enabled') enabled: boolean) {
    ChaosController.shouldCrash = enabled;
    return { chaosMode: ChaosController.shouldCrash ? 'ON' : 'OFF' };
  }

  @Get('status')
  getStatus() {
    return { chaosMode: ChaosController.shouldCrash ? 'ON' : 'OFF' };
  }

  public static isChaosOn(): boolean {
    return this.shouldCrash;
  }
}
