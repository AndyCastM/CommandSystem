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

        if (!user || user.is_active === 0) {
            throw new UnauthorizedException('Usuario inactivo o no encontrado');
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

    async validateTimeOff(id_branch: number) {
        const branch = await this.prisma.branches.findFirst({
            where: { id_branch : id_branch, is_active: 1},
            include: {branch_schedules: true}
        });

        if (!branch) {
            throw new ForbiddenException('Sucursal inactiva');
        }

        const now = new Date();
        const currentDay = now.getDay(); // 0 (Domingo) a 6 (Sábado)
        const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

        const schedule = branch.branch_schedules.find(s => s.day_of_week === currentDay && s.is_open);
        if (!schedule) {
            throw new ForbiddenException('Sucursal cerrada hoy');
        }

        // Convertir open_time y close_time a formato "HH:MM"
        const openTimeStr = typeof schedule.open_time === 'string'
            ? schedule.open_time
            : schedule.open_time.toTimeString().slice(0, 5);
        const closeTimeStr = typeof schedule.close_time === 'string'
            ? schedule.close_time
            : schedule.close_time.toTimeString().slice(0, 5);

        if (currentTime < openTimeStr || currentTime > closeTimeStr) {
            throw new ForbiddenException('Sucursal cerrada en este momento');
        }
    }
}
