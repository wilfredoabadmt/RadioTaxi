import { ConfigService } from '@nestjs/config';

const INSECURE_DEFAULT = 'dev-insecure-secret';

/**
 * Fuente única del secreto JWT.
 *
 * - En producción (`NODE_ENV=production`) exige un `JWT_SECRET` presente,
 *   distinto del default inseguro y de longitud mínima; de lo contrario
 *   detiene el arranque.
 * - En desarrollo cae al default inseguro con una advertencia, para no
 *   bloquear el flujo local.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (isProduction) {
    if (!secret || secret === INSECURE_DEFAULT || secret.length < 32) {
      throw new Error(
        'JWT_SECRET inválido: en producción define un secreto aleatorio de al menos 32 caracteres.',
      );
    }
    return secret;
  }

  if (!secret) {
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] JWT_SECRET no definido; usando un secreto de desarrollo inseguro. NO usar en producción.',
    );
    return INSECURE_DEFAULT;
  }

  return secret;
}
