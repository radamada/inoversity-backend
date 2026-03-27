import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
declare const JwtRefreshStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    private config;
    constructor(config: ConfigService);
    validate(req: Request, payload: {
        sub: string;
        email: string;
        role: string;
    }): Promise<{
        refreshToken: any;
        sub: string;
        email: string;
        role: string;
    }>;
}
export {};
