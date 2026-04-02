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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';

@ApiTags('Payments')
@Controller('orders')
export class PaymentsController {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private ordersService: OrdersService,
    private config: ConfigService,
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

    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      this.logger.error('rawBody is not available — webhook signature verification will fail');
      return res.status(500).send('Server configuration error');
    }

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret ?? '',
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      try {
        await this.ordersService.confirmPayment(paymentIntent.id);
        this.logger.log(`Payment confirmed: ${paymentIntent.id}`);
      } catch (err: any) {
        this.logger.error(`Error confirming payment: ${err.message}`);
      }
    }

    res.json({ received: true });
  }
}
