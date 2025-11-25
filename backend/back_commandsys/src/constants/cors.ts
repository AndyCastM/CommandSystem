import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

export const CORS : CorsOptions = {
    // Para permitir solicitudes desde el frontend
    origin: ['http://localhost:4200'],   // CAMBIAR LUEGO
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
    credentials: true,  
    // Permitir las cabeceras necesarias
    allowedHeaders: 'Content-Type, Authorization, X-XSRF-TOKEN',
}