import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
export declare class PaymentsController {
    private ordersService;
    private config;
    private stripe;
    private readonly logger;
    constructor(ordersService: OrdersService, config: ConfigService);
    handleWebhook(req: Request, res: Response, sig: string): Promise<any>;
}
