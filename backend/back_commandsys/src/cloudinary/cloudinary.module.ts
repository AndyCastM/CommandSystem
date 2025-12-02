import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryController } from './cloudinary.controller';

@Module({
  providers: [CloudinaryService, CloudinaryProvider],
  controllers: [CloudinaryController],
  exports: [CloudinaryService, CloudinaryProvider],
})
export class CloudinaryModule {}
