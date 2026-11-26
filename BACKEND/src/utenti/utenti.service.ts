import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, type NomeRuolo } from './role.entity.js';
import { Utente } from './utente.entity.js';

export interface UtenteResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface NuovoUtente {
  username: string;
  email: string;
  password: string; // già hashata
  firstName: string;
  lastName: string;
}

@Injectable()
export class UtentiService {
  constructor(
    @InjectRepository(Utente) private readonly utenti: Repository<Utente>,
    @InjectRepository(Role) private readonly ruoli: Repository<Role>,
  ) {}

  trovaPerEmail(email: string): Promise<Utente | null> {
    return this.utenti
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('lower(u.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  trovaPerId(id: string): Promise<Utente | null> {
    return this.utenti.findOne({ where: { id } });
  }

  async crea(dati: NuovoUtente): Promise<Utente> {
    const esiste = await this.utenti
      .createQueryBuilder('u')
      .where('lower(u.email) = :email OR lower(u.username) = :username', {
        email: dati.email.toLowerCase(),
        username: dati.username.toLowerCase(),
      })
      .getExists();
    if (esiste) throw new ConflictException('Username o email già registrati');
    const ruolo = await this.ruolo('USER');
    return this.utenti.save(this.utenti.create({ ...dati, email: dati.email.toLowerCase(), enabled: true, roles: [ruolo] }));
  }

  /** Aggiunge o toglie ADMIN. Operazione idempotente; l'ADMIN mantiene anche USER. */
  async impostaAdmin(idTarget: string, idRichiedente: string, diventaAdmin: boolean): Promise<UtenteResponse> {
    if (idTarget === idRichiedente) throw new BadRequestException('Non puoi modificare il tuo stesso ruolo');
    const utente = await this.trovaPerId(idTarget);
    if (!utente) throw new NotFoundException('Utente non trovato');
    const senzaAdmin = utente.roles.filter((r) => r.name !== 'ADMIN');
    utente.roles = diventaAdmin ? [...senzaAdmin, await this.ruolo('ADMIN')] : senzaAdmin;
    return this.comeResponse(await this.utenti.save(utente));
  }

  comeResponse(utente: Utente): UtenteResponse {
    return {
      id: utente.id,
      email: utente.email,
      firstName: utente.firstName,
      lastName: utente.lastName,
      roles: utente.roles.map((r) => r.name),
    };
  }

  /** Il ruolo viene creato se manca: l'app funziona anche prima del seed. */
  private async ruolo(name: NomeRuolo): Promise<Role> {
    return (await this.ruoli.findOneBy({ name })) ?? this.ruoli.save(this.ruoli.create({ name }));
  }
}
