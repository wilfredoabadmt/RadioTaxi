import { PartialType } from '@nestjs/swagger';
import { CreateCorporateAccountDto } from './create-corporate-account.dto';

export class UpdateCorporateAccountDto extends PartialType(CreateCorporateAccountDto) {}
