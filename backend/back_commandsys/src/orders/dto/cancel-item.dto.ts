import { IsNotEmpty, IsString } from 'class-validator';

export class CancelItemDto {
    
    @IsString()
    @IsNotEmpty()
    reason: string;
}
