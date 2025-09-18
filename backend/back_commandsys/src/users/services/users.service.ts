import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserLoginDto } from "../dto/user-login.dto";
import { encrypt } from "src/libs/bcrypt";
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class UsersService {
    
    constructor(private prisma: PrismaService){}
    async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
        const hashedPassword = await encrypt(dto.password);
        const user = await this.prisma.users.create({ 
            data: {
                id_role: dto.id_role,
                id_branch: dto.id_branch,
                name: dto.name,
                last_name: dto.last_name,
                username: dto.username,
                password: hashedPassword
            }
        });
        return {
            id: user.id_user,
            name: user.name,
            last_name: user.last_name,
            id_role: user.id_role,
            created_at: user.created_at,
            };
    }

    async getUsers(): Promise<UserResponseDto[]> {
        const users = await this.prisma.users.findMany();
        return users.map(({ id_user, name, last_name, id_role, created_at, updated_at }) => ({
        id: id_user,
        name,
        last_name,
        id_role,
        created_at: created_at ?? new Date(),
        updated_at: updated_at ?? undefined,
        }));
    }

    async findOne(username: string): Promise<UserLoginDto> {
        const user = await this.prisma.users.findFirst({
            where: { username: username },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con username "${username}" no encontrado`);
        }

        // Mapear al DTO solo con estos datos
        const userResponse: UserLoginDto = {
            id: user.id_user,
            name: user.name,
            password: user.password,
            id_role: user.id_role,
        };

        return userResponse;
    }
}

