// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';

// @Injectable()
// export class AiService {
//   private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//   async generateDescription(imageUrl: string): Promise<string> {
//     const response = await this.openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "system",
//           content:
//             "Eres un asistente que genera descripciones comerciales de productos para un menú de restaurante.",
//         },
//         {
//           role: "user",
//           content: [
//             { type: "text", text: "Describe brevemente este producto:" },
//             { type: "image_url", image_url: imageUrl },
//           ] as any,
//         },
//       ],
//     });

//     const description = response.choices?.[0]?.message?.content;
//     return description || "No se pudo generar la descripción.";
//   }
// }


// POR MIENTRAS ESTOY USANDO EL MODELO 3.5 QUE SOLO USA TEXTO, DESPUES LO MOVERE AL 4 PARA QUE USE IMAGENES
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateDescription(name: string, category: string): Promise<string> {
    // GPT-3.5 no entiende imágenes, así que usamos solo texto contextual
    const prompt = `
       Eres un asistente experto en marketing gastronómico.
       Crea una descripción comercial breve y atractiva para un producto del menú.
        Nombre del producto: ${name}
        Categoría: ${category}
        La descripción debe ser concisa, persuasiva y resaltar los aspectos más apetitosos del producto.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente que escribe descripciones de comida y bebidas.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.8,
    });

    const description = response.choices?.[0]?.message?.content?.trim();
    return description || 'Descripción no disponible';
  }
}
