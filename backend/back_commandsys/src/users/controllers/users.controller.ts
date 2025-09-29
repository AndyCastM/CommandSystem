import {Controller, Get, Post, Body, Patch, Param} from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { UserResponseDto } from "../dto/user-response.dto";
import { CreateUserDto } from "../dto/create-user.dto";
import { Public } from "src/auth/decorators/public.decorator";
import { UpdateUserDto } from "../dto/update-user.dto";

@Controller('users')
export class UsersController {
    constructor (private usersService: UsersService) {}

    // @Public()
    @Post('create')
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto>{
        return this.usersService.createUser(dto);
    }

    @Get()
    async getAll(): Promise<UserResponseDto[]>{
        return this.usersService.getUsers();
    } 

    @Public()
    @Patch(':id')
    update(@Param('id') id: number, @Body()dto: UpdateUserDto): Promise<UserResponseDto>{
        return this.usersService.updateUser(id, dto);
    }
}