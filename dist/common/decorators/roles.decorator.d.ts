export type UserRole = 'student' | 'instructor' | 'admin';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
