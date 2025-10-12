import {Controller, Get, Post, Body, Patch, Param, Delete} from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { UserResponseDto } from "../dto/user-response.dto";
import { CreateUserDto } from "../dto/create-user.dto";
import { Public } from "src/auth/decorators/public.decorator";
import { UpdateUserDto } from "../dto/update-user.dto";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

@Controller('users')
export class UsersController {
    constructor (private usersService: UsersService) {}

    // @Public()
    @Post()
    @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
    create(
        @Body() dto: CreateUserDto,
        @CurrentUser() user: any
    ){
        // Si es admin, asignamos la empresa del token
        if (user.role === Role.Admin) {
            dto.id_company = user.id_company;
        }

        // Si es gerente, asignamos empresa y sucursal
        if (user.role === Role.Gerente) {
            dto.id_company = user.id_company;
            dto.id_branch = user.id_branch;
        }
        return this.usersService.createUser(dto);
    }

    @Get()
    @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
    async getUsers(
        @CurrentUser() user: any
    ){
        return this.usersService.getUsers(user);
    } 

    @Patch(':id')
    @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
    update(@Param('id') id: number, @Body()dto: UpdateUserDto){
        return this.usersService.updateUser(+id, dto);
    }

    @Delete(':id')
    @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
    deactivate(@Param('id') id: number){
        return this.usersService.deactivateUser(+id);
    }

    @Patch(':id/activate')
    @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
    activate(@Param('id') id: number){
        return this.usersService.activateUser(+id);
    }
}