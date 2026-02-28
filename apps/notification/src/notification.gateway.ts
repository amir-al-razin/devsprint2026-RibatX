import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client emits { studentId } → server joins room student:{studentId}
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studentId: string },
  ) {
    const room = `student:${data.studentId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { status: 'JOINED', room };
  }

  sendUpdate(studentId: string, orderId: string, status: string) {
    const room = `student:${studentId}`;
    this.server.to(room).emit('order:status', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Sent status "${status}" for order ${orderId} to room ${room}`,
    );
  }
}
