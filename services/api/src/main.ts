import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ---------------------------------------------------------------------------
  // Middleware de reescritura de URL: Permite peticiones con o sin prefijo /api/
  // Resuelve errores cuando el frontend solicita http://domain/auth/login directamente
  // ---------------------------------------------------------------------------
  app.use((req: any, res: any, next: any) => {
    if (
      !req.url.startsWith('/api') &&
      !req.url.startsWith('/docs') &&
      req.url !== '/' &&
      req.url !== '/health' &&
      req.url !== '/metrics'
    ) {
      req.url = `/api${req.url}`;
    }
    next();
  });

  app.setGlobalPrefix('api');

  // ---------------------------------------------------------------------------
  // Configuración dinámica de CORS
  // ---------------------------------------------------------------------------
  const allowedOriginsString = configService.get<string>('ALLOWED_ORIGINS') || '';
  const allowedOrigins = allowedOriginsString
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin header Origin (curl, server-to-server, apps móviles Expo)
      if (!origin) return callback(null, true);

      // Si ALLOWED_ORIGINS tiene '*' o 'all', reflejar el origen
      if (allowedOrigins.includes('*') || allowedOrigins.includes('all')) {
        return callback(null, true);
      }

      // Si el origen coincide explícitamente
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Permitir automáticamente localhost y 127.0.0.1
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      // Permitir dominios sslip.io (despliegues Coolify / VPS)
      if (origin.includes('.sslip.io')) {
        return callback(null, true);
      }

      // Fallback permisivo si no hay lista blanca estricta
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // ============================================================================
  // Especificación OpenAPI / Swagger (Metodología SDD - Nivel 2: REST Contract)
  // ============================================================================
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RadioTaxi SaaS Platform API')
    .setDescription(
      'Especificación formal de la API REST para la plataforma RadioTaxi SaaS bajo metodología SDD. ' +
      'Contratos formalizados para autenticación, ciclo de vida de viajes, despacho asistido por IA, ' +
      'telemetría y tarificación.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su token JWT de autenticación Bearer',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticación, Login y Credenciales')
    .addTag('trips', 'Ciclo de vida y máquina de estados del viaje (ASSIGNED -> ARRIVED -> IN_PROGRESS -> COMPLETED)')
    .addTag('trip-requests', 'Solicitudes de viajes de pasajeros y despacho')
    .addTag('vehicles', 'Gestión de flota y estado operativo de vehículos')
    .addTag('drivers', 'Gestión, documentación y estado de conductores')
    .addTag('pricing', 'Motor de tarificación, tarifas base y recargos por geocercas')
    .addTag('maps', 'Geocodificación y enrutamiento con OpenStreetMap / OSRM')
    .addTag('ai', 'Despacho inteligente asistido por Google Gemini con degradación elegante')
    .addTag('users', 'Administración de usuarios y roles del sistema')
    .addTag('reports', 'Reportes corporativos y métricas de facturación B2B')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  SwaggerModule.setup('api/docs', app, document);

  // Exportar especificación OpenAPI en JSON para clientes y tooling SDD
  try {
    const specsDir = path.resolve(__dirname, '../../../docs/specs');
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(specsDir, 'openapi.json'), JSON.stringify(document, null, 2));
  } catch {
    // Si no se puede escribir localmente en tiempo de ejecución, no bloquea el arranque
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`API service running on http://localhost:${port}/api`);
  console.log(`OpenAPI Swagger documentation available on http://localhost:${port}/docs`);
}

bootstrap();
