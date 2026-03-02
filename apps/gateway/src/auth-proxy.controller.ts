import {
  BadGatewayException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthProxyController {
  constructor(private readonly httpService: HttpService) {}

  private identityUrls() {
    const preferred = process.env.IDENTITY_SERVICE_URL;
    const dockerDefault = 'http://identity:3001';
    const localhostDefault = 'http://localhost:3001';

    return preferred
      ? [preferred, localhostDefault]
      : [dockerDefault, localhostDefault];
  }

  private async postToIdentity(
    path: '/auth/login' | '/auth/register',
    body: any,
  ) {
    let lastError: any;

    for (const baseUrl of this.identityUrls()) {
      try {
        const res = await firstValueFrom(
          this.httpService.post(`${baseUrl}${path}`, body, {
            timeout: 5000,
          }),
        );
        return res.data;
      } catch (error: any) {
        lastError = error;

        const status = error?.response?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) {
          throw new HttpException(
            error.response?.data ?? 'Identity request failed',
            status,
          );
        }
      }
    }

    if (lastError?.response?.status) {
      throw new HttpException(
        lastError.response?.data ?? 'Identity request failed',
        lastError.response.status,
      );
    }

    throw new BadGatewayException('Identity service unavailable');
  }

  @Post('register')
  register(
    @Body() body: { studentId: string; name: string; password: string },
  ) {
    return this.postToIdentity('/auth/register', body);
  }

  @Post('login')
  login(@Body() body: { studentId: string; password: string }) {
    return this.postToIdentity('/auth/login', body);
  }
}
