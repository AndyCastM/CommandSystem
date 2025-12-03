import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import express from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
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
            path: '/',
            maxAge: 8 * 60 * 60 * 1000, // 8 horas
        });
        
        return { message, user };
    }

    @UseGuards(JwtAuthGuard) // Proteger esta ruta con el guard de JWT
    @Get('me')
    me(@CurrentUser() user: any) {
        return user; // { id_user, username, role, id_company, id_branch }
    }
    
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: express.Response, @CurrentUser() user: any) {
        res.clearCookie('access_token');
        return { ok: true };
    }

   @Get('waiter_sessions')
async logoutWaiter(@CurrentUser() user: any){
  console.log("ENTRÓ A WAITER_SESSIONS");
  console.log("USER:", user);

  const activeSessions = await this.authService.validateSessionsActive(user);
  console.log("ANSWER:", activeSessions);

  return activeSessions;
}

}
