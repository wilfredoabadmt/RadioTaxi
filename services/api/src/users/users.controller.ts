import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Audit('CREATE', 'User')
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Audit('UPDATE', 'User')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  // Baja lógica (status=inactive), no borrado físico.
  @Delete(':id')
  @Audit('DEACTIVATE', 'User')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deactivate(id);
  }
}
