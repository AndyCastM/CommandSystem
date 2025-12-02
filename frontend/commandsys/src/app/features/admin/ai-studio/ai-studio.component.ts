import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiStudioService } from './ai-studio.service';

@Component({
  selector: 'app-ai-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-studio.component.html',
  styleUrl: './ai-studio.component.css',
})
export class AiStudioComponent {
    imagePreview = signal<string | null>(null);
    selectedFile: File | null = null;

    loading = signal(false);
    result = signal<any>(null);
    context = signal('');
    error = signal('');

    constructor(private ai: AiStudioService) {}

    // Cuando seleccionan un archivo
    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (!file) return;

        this.selectedFile = file;

        // Vista previa
        const reader = new FileReader();
        reader.onload = () => this.imagePreview.set(reader.result as string);
        reader.readAsDataURL(file);
    }

    async sendToAI() {
        if (!this.selectedFile) {
        this.error.set("Sube una imagen primero.");
        return;
        }

        this.loading.set(true);
        this.result.set(null);
        this.error.set('');

        try {
        // 1) Subir imagen real a Cloudinary mediante tu backend
        const uploadRes: any = await this.ai.uploadImage(this.selectedFile).toPromise();

        const cloudinaryUrl = uploadRes.url; // tu backend regresa {url: "..."}
        console.log(" URL Cloudinary:", cloudinaryUrl);

        // 2) Enviar imagen a la IA de OpenRouter
        const res: any = await this.ai
            .describeProduct(cloudinaryUrl, this.context())
            .toPromise();

        this.result.set(res);

        } catch (e: any) {
        console.error(e);
        this.error.set("Error procesando la imagen: " + (e.message || e));
        }

        this.loading.set(false);
    }

    copied = signal<string | null>(null);

    copy(text: string, key: string) {
    navigator.clipboard.writeText(text);

    // Marca este botón como “copiado”
    this.copied.set(key);

    // Después de 1 segundo regresa al estado normal
    setTimeout(() => {
        this.copied.set(null);
    }, 1000);
    }

}
