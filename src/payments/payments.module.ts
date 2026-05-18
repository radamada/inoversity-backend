import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProcessedWebhookEvent, ProcessedWebhookEventSchema } from './schemas/processed-webhook-event.schema';

@Module({
  imports: [
    OrdersModule,
    MongooseModule.forFeature([
      { name: ProcessedWebhookEvent.name, schema: ProcessedWebhookEventSchema },
    ]),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
