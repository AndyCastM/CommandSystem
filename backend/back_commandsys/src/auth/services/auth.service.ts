import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/services/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma : PrismaService,
        private usersService: UsersService,
        private jwtService: JwtService
    ){}

    async logIn(username: string, pass: string): Promise<{ access_token: string }> {
        const user = await this.usersService.findOne(username);

        if (!user) {
            new UnauthorizedException('Usuario no encontrado');
        }

        // Verificar contraseña con bcrypt
        const passwordValid = await bcrypt.compare(pass, user?.password);

        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Estandarizar payload (sub = subject)
        const payload = { sub: user.id, role: user.rol_id };

        const access_token = await this.jwtService.signAsync(payload);
        return {
            access_token
        };
    }


}
