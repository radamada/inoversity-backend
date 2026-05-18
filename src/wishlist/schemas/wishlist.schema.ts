import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

// Un user nu poate salva același curs de două ori
WishlistSchema.index({ userId: 1, courseId: 1 }, { unique: true });
// Covers listing a user's wishlist sorted by most recently added
WishlistSchema.index({ userId: 1, createdAt: -1 });
