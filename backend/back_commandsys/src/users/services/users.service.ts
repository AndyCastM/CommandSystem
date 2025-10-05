import { Injectable, NotFoundException, ForbiddenException} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { encrypt } from "src/libs/bcrypt";
import { UpdateUserDto } from "../dto/update-user.dto";
import { formatResponse } from "src/common/helpers/response.helper";

@Injectable()
export class UsersService {
    
    constructor(private prisma: PrismaService){}

    async createUser(dto: CreateUserDto) {
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

        const userCreated =  {
            id_user: user.id_user,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            id_role: user.id_role,
            created_at: user.created_at,
        };

        return formatResponse(
            `Usuario ${user.username} creado correctamente.`, 
            userCreated, 
            201
        );

    }

    async getUsers(currentUser : any ) {
        const where: any = {};

        switch (currentUser.role) {
            case 'Superadmin':
            // Superadmin ve solo Admins
            where.roles = { name: 'Admin' };
            break;

            case 'Admin':
            // Admin ve Gerentes de su empresa
            where.id_company = currentUser.id_company;
            where.roles = { name: 'Gerente' };
            break;

            case 'Gerente':
            // Gerente ve usuarios de su sucursal
            where.id_branch = currentUser.id_branch;
            break;

            default:
            throw new ForbiddenException('No tienes permiso para ver usuarios.');
        }

        const users = await this.prisma.users.findMany({
            where,
            include: { roles: true },
        });

        const formattedUsers = users.map((u) => ({
            id_user: u.id_user,
            username: u.username,
            name: u.name,
            last_name: u.last_name,
            role_name: u.roles.name,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }));

        return formatResponse("Lista de usuarios obtenida correctamente.", formattedUsers);
    }

    async findOneByUsername(username: string) {
        const user = await this.prisma.users.findUnique({
            where: { username },
            include: { roles: true },
        });

        if (!user) throw new NotFoundException(`Usuario "${username}" no encontrado`);

        return user; // devolvemos el objeto completo
    }

    async updateUser(id: number, dto: UpdateUserDto) {
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

        const userUpdated = {
            id_user: user.id_user,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            id_role: user.id_role,
            role_name: user.roles.name,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        return formatResponse(
            `Usuario ${user.username} actualizado correctamente.`, 
            userUpdated, 
            201
        );
    }

    // (soft delete)
    async deactivateUser(id: number) {
        const user = await this.prisma.users.update({
        where: { id_user: id },
        data: { is_active: 0 },
        });

        return formatResponse(`Usuario ${user.username} desactivado correctamente.`);
    }

    async activateUser(id: number) {
        const user = await this.prisma.users.update({
        where: { id_user: id },
        data: { is_active: 1 },
        });

        return formatResponse(`Usuario ${user.username} activado correctamente.`);
    }
}



