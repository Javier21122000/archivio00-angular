import { Controller, Delete, Get, HttpCode, HttpStatus, Module, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthUser } from '../common/auth-user.js';
import { Oggetto } from '../oggetti/oggetto.entity.js';
import { PreferitiService, type PreferitoDto } from './preferiti.service.js';
import { Preferito } from './preferito.entity.js';

/** L'utente viene sempre dal token, mai dal percorso: nessuno può leggere i preferiti di un altro. */
@Controller('preferiti')
@UseGuards(JwtAuthGuard)
export class PreferitiController {
  constructor(private readonly preferiti: PreferitiService) {}

  @Get()
  lista(@CurrentUser() utente: AuthUser): Promise<PreferitoDto[]> {
    return this.preferiti.lista(utente.id);
  }

  @Post(':oggettoId')
  aggiungi(@CurrentUser() utente: AuthUser, @Param('oggettoId', ParseUUIDPipe) oggettoId: string): Promise<PreferitoDto> {
    return this.preferiti.aggiungi(utente.id, oggettoId);
  }

  @Delete(':oggettoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  rimuovi(@CurrentUser() utente: AuthUser, @Param('oggettoId', ParseUUIDPipe) oggettoId: string): Promise<void> {
    return this.preferiti.rimuovi(utente.id, oggettoId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Preferito, Oggetto]), AuthModule],
  controllers: [PreferitiController],
  providers: [PreferitiService],
})
export class PreferitiModule {}
