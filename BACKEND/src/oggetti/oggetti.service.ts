import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity.js';
import { deriveCategoria, escapeLike } from './categorie.js';
import type { ListaOggettiQuery } from './dto/lista-oggetti.query.js';
import type { OggettoRequest } from './dto/oggetto-request.dto.js';
import { IMMAGINE_NON_DISPONIBILE, Oggetto } from './oggetto.entity.js';
import { toAdmin, toPublic, type OggettoAdminDto, type OggettoPublicDto } from './oggetti.mapper.js';

export interface PaginaOggetti<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  catalogCount: number;
}

@Injectable()
export class OggettiService {
  constructor(
    @InjectRepository(Oggetto) private readonly repo: Repository<Oggetto>,
    private readonly dataSource: DataSource,
  ) {}

  /** Catalogo paginato. Filtri, ricerca e ordinamento vengono eseguiti da PostgreSQL: una sola pagina per volta. */
  async lista(query: ListaOggettiQuery, admin: boolean): Promise<PaginaOggetti<OggettoPublicDto | OggettoAdminDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const qb = this.repo.createQueryBuilder('o');

    if (!admin) qb.andWhere('o.pubblicato = true');
    else if (query.soloBozze) qb.andWhere('o.pubblicato = false');
    if (query.categoria) qb.andWhere('o.categoria = :categoria', { categoria: query.categoria });
    if (query.special) qb.andWhere('o.specialEdition = true');
    if (query.chiavi?.length) qb.andWhere('o.seedKey IN (:...chiavi)', { chiavi: query.chiavi });
    if (query.q?.trim()) {
      qb.andWhere('(o.nome ILIKE :q OR o.variante ILIKE :q)', { q: `%${escapeLike(query.q.trim())}%` });
    }

    // L'id chiude sempre l'ordinamento: senza un tie-break le pagine potrebbero ripetere o saltare capi.
    if (query.ordine === 'prezzo-asc') qb.orderBy('o.prezzo', 'ASC').addOrderBy('o.createdAt', 'DESC');
    else if (query.ordine === 'prezzo-desc') qb.orderBy('o.prezzo', 'DESC').addOrderBy('o.createdAt', 'DESC');
    else qb.orderBy('o.inEvidenza', 'DESC').addOrderBy('o.createdAt', 'DESC');
    qb.addOrderBy('o.id', 'ASC');

    qb.skip((page - 1) * limit).take(limit);
    const [righe, total] = await qb.getManyAndCount();
    const catalogCount = await this.repo.countBy(admin ? {} : { pubblicato: true });

    return {
      items: righe.map(admin ? toAdmin : toPublic),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      catalogCount,
    };
  }

  async statistiche(): Promise<{ totale: number; pubblicati: number; bozze: number }> {
    const [totale, pubblicati] = await Promise.all([this.repo.count(), this.repo.countBy({ pubblicato: true })]);
    return { totale, pubblicati, bozze: totale - pubblicati };
  }

  async pubblico(id: string): Promise<OggettoPublicDto> {
    const oggetto = await this.repo.findOneBy({ id, pubblicato: true });
    if (!oggetto) throw new NotFoundException('Oggetto non trovato');
    return toPublic(oggetto);
  }

  async crea(input: OggettoRequest): Promise<OggettoAdminDto> {
    const variante = input.variante ?? '';
    await this.verificaDuplicato(input.nome, variante);
    return this.dataSource.transaction(async (em) => {
      const oggetto = em.create(Oggetto, {
        nome: input.nome,
        prezzo: input.prezzo,
        prezzoAcquisto: input.prezzoAcquisto,
        fornitore: input.fornitore,
        pubblicato: input.pubblicato,
        inEvidenza: input.inEvidenza,
        immagineUrl: input.immagineUrl?.trim() || IMMAGINE_NON_DISPONIBILE,
        specialEdition: input.isSpecialEdition ?? false,
        rating: input.rating ?? 0,
        numeroRecensioni: input.numeroRecensioni ?? 0,
        categoria: input.categoria || deriveCategoria(input.nome),
        variante,
        seedKey: null,
      });
      const salvato = await em.save(oggetto);
      await this.allineaAssetPrincipale(em, salvato);
      return toAdmin(salvato);
    });
  }

  async aggiorna(id: string, input: OggettoRequest): Promise<OggettoAdminDto> {
    const oggetto = await this.trova(id);
    const variante = input.variante ?? oggetto.variante;
    await this.verificaDuplicato(input.nome, variante, id);
    return this.dataSource.transaction(async (em) => {
      oggetto.nome = input.nome;
      oggetto.prezzo = input.prezzo;
      oggetto.prezzoAcquisto = input.prezzoAcquisto;
      oggetto.fornitore = input.fornitore;
      oggetto.pubblicato = input.pubblicato;
      oggetto.inEvidenza = input.inEvidenza;
      oggetto.immagineUrl = input.immagineUrl?.trim() || IMMAGINE_NON_DISPONIBILE;
      // Un client più vecchio può omettere i nuovi campi senza cancellare i metadati del catalogo.
      oggetto.specialEdition = input.isSpecialEdition ?? oggetto.specialEdition;
      oggetto.rating = input.rating ?? oggetto.rating;
      oggetto.numeroRecensioni = input.numeroRecensioni ?? oggetto.numeroRecensioni;
      oggetto.categoria = input.categoria ?? oggetto.categoria;
      oggetto.variante = variante;
      const salvato = await em.save(oggetto);
      await this.allineaAssetPrincipale(em, salvato);
      return toAdmin(salvato);
    });
  }

  /** I preferiti e gli asset collegati spariscono con il capo (ON DELETE CASCADE nel database). */
  async elimina(id: string): Promise<void> {
    const { affected } = await this.repo.delete({ id });
    if (!affected) throw new NotFoundException('Oggetto non trovato');
  }

  private async trova(id: string): Promise<Oggetto> {
    const oggetto = await this.repo.findOneBy({ id });
    if (!oggetto) throw new NotFoundException('Oggetto non trovato');
    return oggetto;
  }

  private async verificaDuplicato(nome: string, variante: string, escludiId?: string): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('lower(o.nome) = :nome AND lower(o.variante) = :variante', {
        nome: nome.toLowerCase(),
        variante: variante.trim().toLowerCase(),
      });
    if (escludiId) qb.andWhere('o.id <> :escludiId', { escludiId });
    if (await qb.getExists()) throw new ConflictException('Nome e variante già presenti');
  }

  /** Tiene l'asset principale uguale a `immagine_url`; se l'immagine cambia sale la versione. */
  private async allineaAssetPrincipale(em: EntityManager, oggetto: Oggetto): Promise<void> {
    const principale = await em.findOneBy(Asset, { oggettoId: oggetto.id, principale: true });
    if (!principale) {
      await em.save(em.create(Asset, { oggettoId: oggetto.id, tipo: 'IMAGE', url: oggetto.immagineUrl, principale: true, ordine: 0 }));
    } else if (principale.url !== oggetto.immagineUrl) {
      principale.url = oggetto.immagineUrl;
      principale.versione += 1;
      await em.save(principale);
    }
  }
}
