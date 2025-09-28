// src/auth/dto/auth-response.dto.ts
export class AuthResponseDto {
  access_token: string;
  user: {
    username: string;
    name: string;
    last_name: string;
    role: string;   // nombre del rol
  };
}
