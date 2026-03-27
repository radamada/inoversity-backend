import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<import("./schemas/user.schema").UserDocument>;
    updateProfile(user: any, dto: UpdateUserDto): Promise<import("./schemas/user.schema").UserDocument>;
}
