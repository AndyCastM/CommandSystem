import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'; // ✅ CAMBIO AQUÍ

@WebSocketGateway({
  path: '/api/print-ws',
  cors: { origin: '*' },
})
export class PrintGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server; // Ahora es Server de socket.io

  handleConnection(client: Socket) {
    console.log('✅ Print server conectado:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Print server desconectado:', client.id);
  }

  // ✅ Método correcto para Socket.IO
  sendToPrinters(payload: any) {
    // Emitir a TODAS las impresoras conectadas
    this.server.emit('print-ticket', { payload });
    console.log('📨 Ticket enviado a impresoras');
  }

  // Escuchar confirmaciones de impresión
  @SubscribeMessage('print-success')
  handlePrintSuccess(client: Socket, data: any) {
    console.log('✅ Impresión exitosa:', data);
  }

  @SubscribeMessage('print-error')
  handlePrintError(client: Socket, data: any) {
    console.error('❌ Error de impresión:', data);
  }
}