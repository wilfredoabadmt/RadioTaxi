import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return '<h1>RadioTaxi API is Online</h1><p>Use <code>/api</code> prefix for endpoints.</p>';
  }
}
