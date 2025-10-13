import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {

  //method
  uploadFile(file: Express.Multer.File, name: string): Promise<CloudinaryResponse> {
    
    const normalizedName = name
        .toLowerCase()
        .replace(/\s+/g,'_') // Reemplaza espacios por guiones bajos
        .replace(/[^\w\-]+/g,'') // Elimina caracteres especiales

    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
            folder:'products',
            public_id: normalizedName,
            overwrite: true,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed: result is undefined'));
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(public_id: string): Promise<void> {
    await cloudinary.uploader.destroy(public_id);
  }
}
