import { Controller, Get, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Verifica anche la connessione a PostgreSQL: utile a script di avvio e deploy. */
  @Get()
  async stato(): Promise<{ status: 'ok'; database: 'up' }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'up' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
