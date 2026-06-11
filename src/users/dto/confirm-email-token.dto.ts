import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body pentru confirmarea schimbării de email (pașii 1 și 2). Tip DTO real
 * (nu inline `{ token?: string }`, care ar dezactiva ValidationPipe), ca să
 * blocheze injecția de operatori NoSQL — ex. `{"token":{"$gt":""}}` matcha
 * tokenul oricărei victime fără să-l cunoască. Token-ul e
 * crypto.randomBytes(32).toString('hex') => 64 caractere hex.
 */
export class ConfirmEmailTokenDto {
  @ApiProperty({ example: 'a1b2...64hex' })
  @IsString({ message: 'Token invalid' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'Token invalid' })
  token: string;
}
