import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv, type Env } from './config/env.js';
import { buildDataSourceOptions } from './database/data-source.js';
import { HealthModule } from './health/health.module.js';
import { OggettiModule } from './oggetti/oggetti.module.js';
import { PreferitiModule } from './preferiti/preferiti.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildDataSourceOptions({
          DATABASE_URL: config.get('DATABASE_URL'),
          DB_HOST: config.get('DB_HOST'),
          DB_PORT: config.get('DB_PORT'),
          DB_USER: config.get('DB_USER'),
          DB_PASSWORD: config.get('DB_PASSWORD'),
          DB_NAME: config.get('DB_NAME'),
          DB_SSL: config.get('DB_SSL'),
        }),
    }),
    AuthModule,
    OggettiModule,
    PreferitiModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
