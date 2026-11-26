import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, type AuthResponse } from './auth.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

/** Limite di richieste per IP su login e registrazione: frena il brute force sulle password. */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /** Il JWT è stateless: il logout vero è dimenticare il token nel client. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {}
}
