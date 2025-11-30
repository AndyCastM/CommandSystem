import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'; 

@WebSocketGateway({
  path: '/api/print-ws',
  cors: { origin: '*' },
})
export class PrintGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server; 

  private clients = new Map<string, { branchId: number; stationName: string }>();

   // Cuando el print-server se registra
  // @SubscribeMessage('register-printer')
  // handleRegister(client: Socket, data: { branchId?: number }) {
  //   if (!data?.branchId) {
  //     console.log('❌ Printer intentó registrarse sin branchId');
  //     return;
  //   }

  //   const room = `branch-${data.branchId}`;
  //   client.join(room);

  //   console.log(
  //     `🖨️ Printer ${client.id} se unió al room de sucursal ${room}`,
  //   );
  // }

  // // Método para mandar ticket a una sucursal
  // emitTicketToBranch(branchId: number, payload: any) {
  //   const room = `branch-${branchId}`;
  //   console.log(`📤 Enviando ticket a room: ${room}`);
  //   this.server.to(room).emit('print-ticket', {
  //     payload,
  //   });
  // }

  handleConnection(client: Socket) {
    const { branchId, stationName } = client.handshake.auth;

    console.log("🖨️ Nueva impresora conectada:", {
      socketId: client.id,
      branchId,
      stationName
    });

    if (!branchId) {
      console.log("❌ Impresora rechazada: no envió branchId");
      client.disconnect();
      return;
    }

    this.clients.set(client.id, { branchId, stationName });
  }

  handleDisconnect(client: Socket) {
    console.log('--- Print server desconectado:', client.id);
  }

  sendToBranch(branchId: number, payload: any) {
    console.log(`📤 Enviando ticket a sucursal ${branchId}...`);

    this.server.sockets.sockets.forEach((socket: any) => {
      const info = this.clients.get(socket.id);
      if (!info) return;

      // FILTRO POR SUCURSAL
      if (info.branchId === branchId) {
        console.log(`➡️ Enviando ticket a socket ${socket.id}`);
        socket.emit("print-ticket", { payload });
      }
    });
  }

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