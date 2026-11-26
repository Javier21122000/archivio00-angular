import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Oggetto } from './oggetto.entity.js';
import { OggettiController } from './oggetti.controller.js';
import { OggettiService } from './oggetti.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Oggetto]), AuthModule],
  controllers: [OggettiController],
  providers: [OggettiService],
  exports: [OggettiService],
})
export class OggettiModule {}
