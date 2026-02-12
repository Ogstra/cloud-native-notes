import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JsonLogger } from './logging/json-logger.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(JsonLogger);
  const configService = app.get(ConfigService);
  app.useLogger(logger);
  app.enableShutdownHooks();

  app.enableCors();

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'healthz', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');

  let shuttingDown = false;
  const handleSignal = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log(`Received ${signal}, starting graceful shutdown`, 'Bootstrap');

    await app.close();
    logger.log('Graceful shutdown completed', 'Bootstrap');
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void handleSignal('SIGTERM');
  });
  process.on('SIGINT', () => {
    void handleSignal('SIGINT');
  });
}
bootstrap();
