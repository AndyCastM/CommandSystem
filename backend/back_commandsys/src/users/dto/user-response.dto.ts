// src/users/dto/user-response.dto.ts
export class UserResponseDto {
  id: number;
  name: string;
  last_name: string;
  id_role: number;
  created_at: Date;
  updated_at?: Date;
}
