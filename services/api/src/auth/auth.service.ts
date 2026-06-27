import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, VALID_ROLES } from './dto/register.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * Autentica a un usuario y devuelve un JWT + los datos públicos del usuario.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(`Cuenta ${user.status}. Contacta al administrador.`);
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.sanitize(user)
    };
  }

  /**
   * Registra un nuevo usuario.
   * El rol por defecto es USER. La asignación de roles privilegiados
   * (DISPATCHER, ADMIN) debería restringirse con @Roles('ADMIN') en el controller.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: VALID_ROLES.includes(dto.role as any) ? dto.role! : 'USER',
          companyId: dto.companyId
        }
      });

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        accessToken,
        user: this.sanitize(user)
      };
    } catch (err) {
      throw new InternalServerErrorException('No se pudo crear el usuario');
    }
  }

  /**
   * Valida un payload de JWT (lo llama la JwtStrategy).
   */
  async validatePayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  }

  // Quita el password de cualquier objeto user
  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
