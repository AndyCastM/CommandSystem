import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UserSigninDto } from '../dto/user-login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @Post('log-in')
    logIn(@Body() user: UserSigninDto){
        return this.authService.logIn(user.user, user.password);
    }

}
