import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangeEmailDto {
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  newEmail: string;

  /** Obligatoriu pentru conturi email+parolă, opțional pentru conturi Google */
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
