import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProcessedWebhookEventDocument = ProcessedWebhookEvent & Document;

/**
 * Persistent store for processed Stripe webhook event IDs.
 * Replaces the in-memory Map in PaymentsController — survives server restarts
 * and works correctly across multiple backend instances.
 *
 * Unique index on eventId ensures at-most-once processing even under concurrency.
 * TTL index auto-deletes records after 30 days (Stripe retries stop after 3 days).
 */
@Schema({ timestamps: true })
export class ProcessedWebhookEvent {
  @Prop({ required: true, unique: true })
  eventId: string;
}

export const ProcessedWebhookEventSchema = SchemaFactory.createForClass(ProcessedWebhookEvent);

// Auto-delete after 30 days — Stripe stops retrying after ~3 days
ProcessedWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
