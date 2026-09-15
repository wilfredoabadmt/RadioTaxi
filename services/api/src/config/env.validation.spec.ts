import { validateEnvironment, Environment } from './env.validation';

describe('Environment Validation (Fase 9.11)', () => {
  it('debe validar exitosamente con configuración por defecto de desarrollo', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    };

    const result = validateEnvironment(config);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.PORT).toBe(3000);
  });

  it('debe rechazar NODE_ENV inválido', () => {
    const config = {
      NODE_ENV: 'staging_invalid',
    };

    expect(() => validateEnvironment(config)).toThrow(/Config Validation Error/);
  });

  it('debe rechazar puerto que no sea numérico', () => {
    const config = {
      PORT: 'abc_not_a_number',
    };

    expect(() => validateEnvironment(config)).toThrow(/Config Validation Error/);
  });

  it('debe exigir JWT_SECRET >= 32 caracteres en producción', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'short-secret-1234',
    };

    expect(() => validateEnvironment(config)).toThrow(
      /En producción, JWT_SECRET debe tener al menos 32 caracteres/,
    );
  });

  it('debe rechazar el secreto por defecto en producción', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'dev-insecure-secret-change-in-production',
    };

    expect(() => validateEnvironment(config)).toThrow(
      /En producción, JWT_SECRET no puede usar el valor inseguro/,
    );
  });

  it('debe aceptar configuración de producción válida con secreto fuerte', () => {
    const config = {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:pass@prod-db:5432/radiotaxi',
      JWT_SECRET: 'super-secure-production-jwt-secret-key-2026-radiotaxi',
    };

    const result = validateEnvironment(config);
    expect(result.NODE_ENV).toBe(Environment.Production);
    expect(result.JWT_SECRET).toBe('super-secure-production-jwt-secret-key-2026-radiotaxi');
  });
});
