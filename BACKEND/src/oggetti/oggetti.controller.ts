import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard, type RichiestaAutenticata } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { ListaOggettiQuery } from './dto/lista-oggetti.query.js';
import { OggettoRequest } from './dto/oggetto-request.dto.js';
import { OggettiService, type PaginaOggetti } from './oggetti.service.js';
import type { OggettoAdminDto, OggettoPublicDto } from './oggetti.mapper.js';

@Controller('oggetti')
export class OggettiController {
  constructor(private readonly oggetti: OggettiService) {}

  /** Pubblica: un visitatore vede i capi pubblicati, un admin anche bozze e dati riservati. */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  lista(@Query() query: ListaOggettiQuery, @Req() req: RichiestaAutenticata): Promise<PaginaOggetti<OggettoPublicDto | OggettoAdminDto>> {
    return this.oggetti.lista(query, req.user?.roles.includes('ADMIN') ?? false);
  }

  // Va dichiarata PRIMA di ':id', altrimenti "statistiche" verrebbe letto come un id.
  @Get('statistiche')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  statistiche() {
    return this.oggetti.statistiche();
  }

  @Get(':id')
  dettaglio(@Param('id', ParseUUIDPipe) id: string): Promise<OggettoPublicDto> {
    return this.oggetti.pubblico(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  crea(@Body() dto: OggettoRequest): Promise<OggettoAdminDto> {
    return this.oggetti.crea(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  aggiorna(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OggettoRequest): Promise<OggettoAdminDto> {
    return this.oggetti.aggiorna(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  elimina(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.oggetti.elimina(id);
  }
}
