import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oggetto } from '../oggetti/oggetto.entity.js';
import { toPublic, type OggettoPublicDto } from '../oggetti/oggetti.mapper.js';
import { Preferito } from './preferito.entity.js';

export interface PreferitoDto {
  id: string;
  oggetto: OggettoPublicDto;
  createdAt: Date;
}

@Injectable()
export class PreferitiService {
  constructor(
    @InjectRepository(Preferito) private readonly preferiti: Repository<Preferito>,
    @InjectRepository(Oggetto) private readonly oggetti: Repository<Oggetto>,
  ) {}

  /** Un solo SELECT con JOIN sul capo (nessun N+1); i capi tornati in bozza non compaiono. */
  async lista(utenteId: string): Promise<PreferitoDto[]> {
    const righe = await this.preferiti
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.oggetto', 'o')
      .where('p.utenteId = :utenteId AND o.pubblicato = true', { utenteId })
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .getMany();
    return righe.map((p) => this.comeDto(p));
  }

  async aggiungi(utenteId: string, oggettoId: string): Promise<PreferitoDto> {
    const oggetto = await this.oggetti.findOneBy({ id: oggettoId, pubblicato: true });
    if (!oggetto) throw new NotFoundException('Oggetto non trovato');
    if (await this.preferiti.existsBy({ utenteId, oggettoId })) throw new ConflictException('Oggetto già preferito');
    const salvato = await this.preferiti.save(this.preferiti.create({ utenteId, oggettoId }));
    salvato.oggetto = oggetto;
    return this.comeDto(salvato);
  }

  async rimuovi(utenteId: string, oggettoId: string): Promise<void> {
    const { affected } = await this.preferiti.delete({ utenteId, oggettoId });
    if (!affected) throw new NotFoundException('Preferito non trovato');
  }

  private comeDto(p: Preferito): PreferitoDto {
    return { id: p.id, oggetto: toPublic(p.oggetto as Oggetto), createdAt: p.createdAt };
  }
}
