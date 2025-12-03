import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AlexaDevicesService {
  constructor(private prisma: PrismaService) {}

  async registerDevice(device_id: string, id_area: number, id_branch: number, alias: string) {
    return this.prisma.alexa_devices.upsert({
      where: { device_id },
      update: { id_area, alias },
      create: { device_id, id_area, id_branch, alias },
    });
  }
  
  async findByDeviceId(deviceId: string) {
    return this.prisma.alexa_devices.findUnique({
      where: { device_id: deviceId },
      include: {
        branches: true,
        print_areas: true,
      },
    });
  }

  async getAll() {
    return this.prisma.alexa_devices.findMany({
    include: { print_areas: true },
    });
  }
}
