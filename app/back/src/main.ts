// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module.js';
// import cookieParser from 'cookie-parser';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { join, dirname } from 'path';
// import { readFile } from 'fs/promises';
// import { fileURLToPath } from 'url';
// import { env } from 'process';

// async function bootstrap() {
//   // Very Very Bad solution because this line ignores cert key chain checks!
//   env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//   const certs = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs');
//   const httpsOptions = {
//     key: await readFile(join(certs, 'cert.key')),
//     cert: await readFile(join(certs, 'cert.crt')),
//   };
//   const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(
//     AppModule,
//     {
//       httpsOptions,
//       logger: ['debug', 'log', 'warn', 'error'],
//       bodyParser: false,
//     });
//   app.enableCors(); // CORSを有効にする
//   app.use(cookieParser());
//   await app.listen(3000);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { env } from 'process';

async function bootstrap() {
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const certs = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs');
  const httpsOptions = {
    key: await readFile(join(certs, 'cert.key')),
    cert: await readFile(join(certs, 'cert.crt')),
  };
  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    bodyParser: false,
  });
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
