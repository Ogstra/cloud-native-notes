import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('healthz')
  async healthz() {
    try {
      await this.appService.isHealthy();
      return { status: 'ok' };
    } catch {
      throw new InternalServerErrorException({ status: 'error' });
    }
  }
}
