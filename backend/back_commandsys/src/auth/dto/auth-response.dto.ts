// src/auth/dto/auth-response.dto.ts
export class AuthResponseDto {
  access_token: string;
  user: {
    id_user: number;
    username: string;
    name: string;
    last_name: string;
    role: string;   // nombre del rol
    id_company: number | null;
    id_branch: number | null;
  };
}
