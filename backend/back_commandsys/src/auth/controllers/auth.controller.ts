import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import express from 'express';
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
    async logIn(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: express.Response
    ) {
        const {message, access_token, user} = await this.authService.logIn(loginDto.username, loginDto.password);
        // Guardar el token en una cookie HTTP-only
        res.cookie('access_token', access_token, {
            httpOnly: true,
            // secure: true, // Usar solo en producción con HTTPS
            maxAge: 8 * 60 * 60 * 1000, // 8 horas
        });
        
        return { message, user };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: express.Response) {
        res.clearCookie('access_token');
        return { ok: true };
    }
}
