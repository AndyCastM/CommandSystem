import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200', // dominio del front
    credentials: true,               // importante pq usamos cookies
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      // Extraer cookie del handshake
      const cookies = client.handshake.headers.cookie;
      if (!cookies) {
        client.disconnect();
        return;
      }

      //  Parsear cookies
      const parsed = cookie.parse(cookies);
      const token = parsed['access_token']; // nombre de la cookie JWT

      if (!token) {
        console.log('No token cookie');
        client.disconnect();
        return;
      }

      // Verificar JWT
      const payload: any = this.jwt.verify(token);

      const id_user = payload.sub || payload.id_user;
      const id_branch = payload.id_branch;

      if (!id_user || !id_branch) {
        console.log('Token sin datos de usuario/sucursal');
        client.disconnect();
        return;
      }

      // Unir a rooms por sucursal y usuario
      client.join(`branch_${id_branch}`);
      client.join(`user_${id_user}`);

      console.log(`Usuario ${id_user} conectado en sucursal ${id_branch}`);
    } catch (err) {
      console.error('Error en conexión de socket', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  //  Método helper para emitir notificaciones a toda la sucursal
  emitToBranch(id_branch: number, event: string, payload: any) {
    this.server.to(`branch_${id_branch}`).emit(event, payload);
  }
}
