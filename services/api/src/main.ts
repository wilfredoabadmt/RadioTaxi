import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const allowedOriginsString = configService.get<string>('ALLOWED_ORIGINS') || '';
  const allowedOrigins = allowedOriginsString
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

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

  await app.listen(3000);
  console.log('API service running on http://localhost:3000/api');
  console.log('OpenAPI Swagger documentation available on http://localhost:3000/docs');
}

bootstrap();
