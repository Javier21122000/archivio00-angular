import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity.js';
import { Utente } from './utente.entity.js';
import { UtentiService } from './utenti.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Utente, Role])],
  providers: [UtentiService],
  exports: [UtentiService],
})
export class UtentiModule {}
