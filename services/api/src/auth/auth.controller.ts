import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './roles.decorator';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña (JWT)' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa, retorna access_token y datos de usuario' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Healthcheck público para observabilidad y Docker' })
  @ApiResponse({ status: 200, description: 'Servicio en funcionamiento' })
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registro público de nuevos clientes/pasajeros' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya se encuentra registrado' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Obtener datos del usuario autenticado actual' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario actual' })
  @ApiResponse({ status: 401, description: 'No autenticado o token expirado' })
  me(@Request() req: any) {
    return req.user;
  }

  @ApiBearerAuth('JWT-auth')
  @Roles('ADMIN')
  @Get('admin-only')
  @ApiOperation({ summary: 'Ruta de prueba restringida exclusivamente a rol ADMIN' })
  adminOnly(@Request() req: any) {
    return { message: `Hola ${req.user.email}, eres ADMIN` };
  }
}
