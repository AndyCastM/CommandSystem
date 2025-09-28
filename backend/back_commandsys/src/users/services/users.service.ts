import { Injectable, NotFoundException} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { encrypt } from "src/libs/bcrypt";
import { UpdateUserDto } from "../dto/update-user.dto";

@Injectable()
export class UsersService {
    
    constructor(private prisma: PrismaService){}

    async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
        const hashedPassword = await encrypt(dto.password);
        
        const user = await this.prisma.users.create({ 
            data: {
                id_company: dto.id_company,
                id_branch: dto.id_branch,
                id_role: dto.id_role,
                name: dto.name,
                last_name: dto.last_name,
                last_name2: dto.last_name2,
                username: dto.username,
                password: hashedPassword
            }
        });
        return {
            id_user: user.id_user,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            id_role: user.id_role,
            created_at: user.created_at,
            };
    }

    async getUsers(): Promise<UserResponseDto[]> {
        const users = await this.prisma.users.findMany({
            include: { roles: true },
        });

        return users.map((u) => ({
            id_user: u.id_user,
            username: u.username,
            name: u.name,
            last_name: u.last_name,
            role_name: u.roles.name,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }));
    }

    async findOneByUsername(username: string) {
        const user = await this.prisma.users.findUnique({
            where: { username },
            include: { roles: true },
        });

        if (!user) throw new NotFoundException(`Usuario "${username}" no encontrado`);

        return user; // devolvemos el objeto completo
    }

    async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
        let data = { ...dto };

        // Si se proporciona una nueva contraseña, la encriptamos
        if (dto.password) {
            data = {
                ...data,
                password: await encrypt(dto.password),
            };
        }

        const user = await this.prisma.users.update({
            where: { id_user: id },
            data,
            // Evitamos multiples consultas incluyendo el rol
            include: { roles: true }, // Se incluye la relación con roles para obtener el nombre del rol
        });

        return {
            id_user: user.id_user,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            id_role: user.id_role,
            role_name: user.roles.name,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }
}



