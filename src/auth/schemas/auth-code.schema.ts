import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthCodeDocument = AuthCode & Document;

/**
 * Cod single-use, short-lived (60s) folosit la finalizarea flow-ului Google OAuth.
 *
 * Înlocuiește practica de a returna JWT-ul direct în query string (?token=...),
 * care lăsa token-ul în browser history, Referer headers și log-uri server.
 * Acum redirect-ul conține doar `?code=<authCode>`; FE face POST /auth/google/exchange
 * pentru a-l schimba pe tokens. Codul e șters atomic la consum (findOneAndDelete).
 */
@Schema({ timestamps: true })
export class AuthCode {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;
}

export const AuthCodeSchema = SchemaFactory.createForClass(AuthCode);

// TTL index: MongoDB șterge automat documentele când `expiresAt` < acum.
AuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
