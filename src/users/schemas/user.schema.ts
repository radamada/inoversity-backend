import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  /** null for OAuth-only accounts (e.g. Google sign-in) */
  @Prop({ type: String, required: false, select: false, default: null })
  passwordHash: string | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: ['student', 'instructor', 'admin'], default: 'student' })
  role: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: false })
  emailVerified: boolean;

  // Tokens & secrets — select:false ca să nu se scurgă prin findById direct sau
  // alte endpoint-uri care întorc userul fără sanitizare explicită. Pentru
  // citirile legitime (consum token la reset/confirm), filtrul de query
  // funcționează indiferent de select; doar reads after-load au nevoie
  // de `.select('+field')`.
  @Prop({ type: String, default: null, select: false })
  emailVerificationToken: string | null;

  @Prop({ type: String, default: null, select: false })
  passwordResetToken: string | null;

  @Prop({ type: Date, default: null, select: false })
  passwordResetExpires: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  termsAccepted: boolean;

  @Prop({ type: Date, default: null })
  termsAcceptedAt: Date | null;

  @Prop({ default: false })
  darkMode: boolean;

  /** Google OAuth ID — null for email+password accounts */
  @Prop({ type: String, required: false, default: null })
  googleId: string | null;

  /** Incremented on logout to invalidate all existing refresh tokens.
   *  select:false: nu trebuie să apară în /users/me sau /auth/me — e o stare
   *  internă de auth. Cele 2 strategies (jwt + jwt-refresh) îl citesc explicit
   *  prin findByIdForAuth(). */
  @Prop({ default: 0, select: false })
  tokenVersion: number;

  /** Percentage of course revenue the instructor pays to the platform (0-100) */
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  revenueSharePercent: number;

  /** Email nou în așteptarea confirmării duble */
  @Prop({ type: String, default: null })
  pendingEmail: string | null;

  /** Token pentru fluxul de schimbare email (aceleași token pentru ambii pași) */
  @Prop({ type: String, default: null, select: false })
  emailChangeToken: string | null;

  @Prop({ type: Date, default: null, select: false })
  emailChangeTokenExpires: Date | null;

  /** True după ce adresa veche a confirmat — pasul 1 din 2 */
  @Prop({ default: false })
  emailChangeOldConfirmed: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
// `default: null` scrie googleId:null explicit pe conturile email+parolă, iar un
// index `sparse` tot indexează valorile null prezente → al doilea cont fără Google
// se ciocnea de unique (E11000). partialFilterExpression indexează DOAR string-urile
// reale, deci unicitatea se aplică între Google ID-uri, nu între null-uri.
UserSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);
UserSchema.index({ emailChangeToken: 1 }, { sparse: true });
