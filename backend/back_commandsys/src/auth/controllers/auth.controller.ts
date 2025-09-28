import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @Public() // Ruta pública, no requiere autenticación
    @Post('login')
    // En el promise esperamos el dto que se definio en auth-response.dto, y 
    // que a su vez es el que se regresa en el auth.service
    logIn(@Body() loginDto: LoginDto) : Promise<AuthResponseDto>{
        return this.authService.logIn(loginDto.username, loginDto.password);
    }

}
