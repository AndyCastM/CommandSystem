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

        if (user.id_branch === null) {
            
        } else {
            await this.validateTimeOff(user.id_branch);
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
        // Se resta 1 porque lo tenemos de 0-6 y aqui se regresa de 1-7
        const currentDay = now.getDay() - 1 ; // 0 (Domingo) a 6 (Sábado)
        const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

        const schedule = branch.branch_schedules.find(s => s.day_of_week === currentDay && s.is_open);
        if (!schedule) {
            throw new ForbiddenException('Sucursal cerrada hoy');
        }

        console.log(schedule);
        // Normalizar hora a formato "HH:MM" sin ajustar zona horaria
        const normalizeTime = (value: any): string => {
            if (!value) return '00:00';

            // Si viene como Date (Prisma lo hace así para TIME)
            if (value instanceof Date) {
                // Forzamos a hora local “plana”, sin offset
                const utcHours = value.getUTCHours().toString().padStart(2, '0');
                const utcMinutes = value.getUTCMinutes().toString().padStart(2, '0');
                return `${utcHours}:${utcMinutes}`;
            }

            // Si viene como string ("09:00:00" o "09:00")
            if (typeof value === 'string') {
                return value.slice(0, 5);
            }
            return '00:00';
        };

        const openTimeStr = normalizeTime(schedule.open_time);
        const closeTimeStr = normalizeTime(schedule.close_time);

        if (currentTime < openTimeStr || currentTime > closeTimeStr) {
            throw new ForbiddenException('Sucursal cerrada en este momento');
        }

    }
}
