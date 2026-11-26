import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emailMinuscola = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** DTO di registrazione: le regole stanno nei decoratori. */
export class RegisterDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80)
  username!: string;

  @Transform(emailMinuscola) @IsEmail() @MaxLength(160)
  email!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80)
  firstName!: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80)
  lastName!: string;
}

export class LoginDto {
  @Transform(emailMinuscola) @IsEmail()
  email!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  password!: string;
}
