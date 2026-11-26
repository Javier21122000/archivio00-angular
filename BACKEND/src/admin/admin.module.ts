import { Controller, Delete, HttpCode, HttpStatus, Module, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import type { AuthUser } from '../common/auth-user.js';
import { UtentiService, type UtenteResponse } from '../utenti/utenti.service.js';

/** Gestione dei ruoli: tutto il controller è riservato agli admin. */
@Controller('admin/utenti')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUtentiController {
  constructor(private readonly utenti: UtentiService) {}

  @Post(':id/ruolo-admin')
  @HttpCode(HttpStatus.OK)
  concedi(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser): Promise<UtenteResponse> {
    return this.utenti.impostaAdmin(id, admin.id, true);
  }

  @Delete(':id/ruolo-admin')
  revoca(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser): Promise<UtenteResponse> {
    return this.utenti.impostaAdmin(id, admin.id, false);
  }
}

@Module({ imports: [AuthModule], controllers: [AdminUtentiController] })
export class AdminModule {}
