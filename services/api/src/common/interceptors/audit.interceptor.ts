import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_METADATA_KEY, AuditOptions } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      handler,
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          let entityId: number | null = null;
          if (request.params && request.params.id) {
            const parsed = parseInt(request.params.id, 10);
            if (!isNaN(parsed)) entityId = parsed;
          } else if (response && typeof response === 'object' && 'id' in response) {
            const parsed = parseInt(response.id, 10);
            if (!isNaN(parsed)) entityId = parsed;
          }

          await this.prisma.auditLog.create({
            data: {
              companyId: user?.companyId || null,
              entityType: auditOptions.entityType,
              entityId: entityId,
              action: auditOptions.action,
              performedBy: user?.id || null,
              data: response ? JSON.parse(JSON.stringify(response)) : null,
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[AuditInterceptor] Error registrando auditoría:', error);
        }
      }),
    );
  }
}
