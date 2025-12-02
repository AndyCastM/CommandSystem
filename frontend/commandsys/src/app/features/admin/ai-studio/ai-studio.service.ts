import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/services/constants';

@Injectable({ providedIn: 'root' })
export class AiStudioService {
  private http = inject(HttpClient);
  private baseUrl = API_URL + '/ai-helper';
  private cloudinaryUrl = API_URL + '/cloudinary';

  // 1) SUBIR una imagen al backend → Cloudinary
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ url: string }>(
      `${this.cloudinaryUrl}/upload`,
      formData
    );
  }

  // 2) Pedir descripción del producto a la IA
  describeProduct(imageUrl: string, context?: string) {
    return this.http.post(`${this.baseUrl}/describe-product`, {
      imageUrl,
      context,
      locale: 'es-MX',
    });
  }
}
