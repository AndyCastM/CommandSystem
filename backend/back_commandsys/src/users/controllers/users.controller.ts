import {Controller, Get, Post, Body} from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { UserResponseDto } from "../dto/user-response.dto";
import { CreateUserDto } from "../dto/create-user.dto";

@Controller('users')
export class UsersController {
    constructor (private usersService: UsersService) {}

    @Post()
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto>{
        return this.usersService.createUser(dto);
    }

    @Get()
    async getAll(): Promise<UserResponseDto[]>{
        return this.usersService.getUsers();
    } 
}