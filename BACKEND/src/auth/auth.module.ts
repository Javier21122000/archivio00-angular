import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../config/env.js';
import { UtentiModule } from '../utenti/utenti.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [
    UtentiModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [{ ttl: 60_000, limit: config.get('AUTH_RATE_LIMIT') }],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: config.get('JWT_EXPIRES_IN') as never },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  // Gli altri moduli importano AuthModule per poter usare i guard nei propri controller.
  exports: [SessionService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, UtentiModule],
})
export class AuthModule {}
