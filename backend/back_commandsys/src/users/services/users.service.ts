import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { encrypt } from "src/libs/bcrypt";

@Injectable()
export class UsersService {
    
    constructor(private prisma: PrismaService){}
    async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
        const hashedPassword = await encrypt(dto.password);
        const user = await this.prisma.users.create({ 
            data: {
                name: dto.name,
                user: dto.user,
                password: hashedPassword,
                rol_id: dto.rol_id,
            }
        });
        const { id_user, name, rol_id, createdAt, updatedAt } = user;

        return { id: id_user, name, rol_id, createdAt, updatedAt};
    }

    async getUsers(): Promise<UserResponseDto[]> {
        const users = await this.prisma.users.findMany();
        return users.map(({ id_user, name, rol_id, createdAt, updatedAt }) => ({
        id: id_user,
        name,
        rol_id,
        createdAt,
        updatedAt,
        }));
    }
}

