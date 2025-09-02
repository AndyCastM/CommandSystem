import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import morgan from 'morgan';
import { CORS } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(morgan('dev'));
  
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT');

  app.enableCors(CORS);
  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  await app.listen(PORT ?? 3000);
}
bootstrap();
