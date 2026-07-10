import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: this.publicSelect,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.publicSelect,
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: data.role ?? 'USER',
        companyId: data.companyId,
      },
      select: this.publicSelect,
    });
  }

  async update(id: number, data: UpdateUserDto) {
    await this.findOne(id); // 404 si no existe

    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.role !== undefined) patch.role = data.role;
    if (data.status !== undefined) patch.status = data.status;
    if (data.companyId !== undefined) patch.companyId = data.companyId;
    if (data.password !== undefined) {
      patch.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: patch,
      select: this.publicSelect,
    });
  }

  // Baja lógica: no borra la fila (preserva historial/auditoría), la marca inactiva.
  async deactivate(id: number) {
    await this.findOne(id); // 404 si no existe
    return this.prisma.user.update({
      where: { id },
      data: { status: 'inactive' },
      select: this.publicSelect,
    });
  }

  // Proyección sin el campo password.
  private readonly publicSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    phone: true,
    status: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
    driver: true,
  };
}
