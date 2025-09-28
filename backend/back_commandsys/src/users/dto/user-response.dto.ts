// src/users/dto/user-response.dto.ts
export class UserResponseDto {
  id_user: number;
  username: string;
  name: string;
  last_name: string;
  id_role?: number;  
  role_name?: string;
  created_at: Date;
  updated_at?: Date;
}
