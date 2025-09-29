import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/services/users.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
        private jwtService: JwtService
    ){}

    async logIn(username: string, pass: string): Promise<AuthResponseDto> {
        const user = await this.usersService.findOneByUsername(username);

        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        // Verificar contraseña con bcrypt
        const passwordValid = await bcrypt.compare(pass, user.password);

        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        
        // Estandarizar payload (sub = subject)
        const payload = { 
            sub: user.id_user, 
            role: user.roles.name,    
            id_company: user.id_company,
            id_branch: user.id_branch,
        };

        const access_token = await this.generateUserToken(payload);
        
        return {
            access_token,
            user: {
                id_user: user.id_user,
                username: user.username,
                name: user.name,
                last_name: user.last_name,
                role: user.roles.name,
                id_company: user.id_company ?? null,
                id_branch: user.id_branch ?? null,
            }
        };
    }

    async generateUserToken(payload: any) {
        const access_token = await this.jwtService.signAsync(payload);
        return access_token;
    } 

}
