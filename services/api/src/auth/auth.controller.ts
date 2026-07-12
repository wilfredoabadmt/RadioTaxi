import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/auth/login  -> público
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /api/auth/health -> público para Docker healthcheck
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // POST /api/auth/register -> público (crea usuarios USER por defecto)
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // GET /api/auth/me -> requiere token válido
  @Get('me')
  me(@Request() req: any) {
    return req.user;
  }

  // Ejemplo de ruta protegida por rol (solo ADMIN)
  @Roles('ADMIN')
  @Get('admin-only')
  adminOnly(@Request() req: any) {
    return { message: `Hola ${req.user.email}, eres ADMIN` };
  }
}
