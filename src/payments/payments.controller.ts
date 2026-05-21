import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';
import {
  ProcessedWebhookEvent,
  ProcessedWebhookEventDocument,
} from './schemas/processed-webhook-event.schema';

@ApiTags('Payments')
@Controller('orders')
export class PaymentsController {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private ordersService: OrdersService,
    private config: ConfigService,
    @InjectModel(ProcessedWebhookEvent.name)
    private processedEventModel: Model<ProcessedWebhookEventDocument>,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10' as any,
    });
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'Stripe webhook – confirmare plată' })
  async handleWebhook(
    @Req() req: any,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    // Fail closed dacă secretul nu e configurat. Cu secret gol Stripe.constructEvent
    // calculează HMAC cu cheie vidă, ceea ce un atacator poate replica trivial →
    // webhook spoofing și enrollment gratuit. Nu aruncăm la boot ca să nu spargem
    // mediile de dev fără Stripe configurat — eșuăm doar pe request.
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET nu este configurat — webhook respins');
      return res.status(503).send('Webhook indisponibil — configurare lipsă');
    }

    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      this.logger.error('rawBody is not available — webhook signature verification will fail');
      return res.status(500).send('Server configuration error');
    }

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Atomic deduplication via MongoDB unique index on eventId.
    // Works across server restarts and multiple backend instances.
    // If two instances receive the same event simultaneously, only one
    // will succeed the insert — the other gets a duplicate key error (11000).
    try {
      await this.processedEventModel.create({ eventId: event.id });
    } catch (err: any) {
      if (err.code === 11000) {
        // Already processed by this or another instance
        this.logger.log(`Duplicate webhook event skipped: ${event.id}`);
        return res.json({ received: true });
      }
      throw err;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      try {
        const enrolled = await this.ordersService.confirmPayment(paymentIntent.id);
        if (enrolled) {
          this.logger.log(`Payment confirmed and enrolled: ${paymentIntent.id}`);
        }
      } catch (err: any) {
        this.logger.error(`Error confirming payment: ${err.message}`);
        // Delete the event record so Stripe can retry and enrollments are retried
        await this.processedEventModel.deleteOne({ eventId: event.id }).catch(() => {});
        return res.status(500).json({ error: 'Enrollment failed, will retry' });
      }
    }

    res.json({ received: true });
  }
}
