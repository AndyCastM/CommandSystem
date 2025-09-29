import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import morgan from 'morgan';
import { CORS } from './constants';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(morgan('dev'));
  app.use(cookieParser());
  
  // Habilitado para validar información
  app.useGlobalPipes(
    new ValidationPipe({
      transformOptions: {
        enableImplicitConversion: true,
      }
    })
  );

  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT');

  app.enableCors(CORS);
  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  await app.listen(PORT ?? 3000);
}
bootstrap();
