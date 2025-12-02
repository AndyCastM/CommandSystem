import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DescribeProductDto } from './dto/describe-product.dto';
import { DescribeProductResult } from './types/describe-product-result';

@Injectable()
export class AIService {
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;
  private readonly model =
    process.env.OPENROUTER_MODEL_VISION || 'google/gemini-2.5-flash';

  constructor(private readonly http: HttpService) {}

  // JSON extractor
  private extractJson(text: string) {
    // Eliminar bloques ```json y ```
    text = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Buscar primer { y último }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');

    if (first === -1 || last === -1) {
      throw new Error('No se encontró JSON válido en la respuesta');
    }

    const jsonString = text.substring(first, last + 1);

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON inválido recibido de IA:', jsonString);
      throw new Error('JSON inválido después de extraer');
    }
  }

  async describeProduct(
    dto: DescribeProductDto,
  ): Promise<DescribeProductResult> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY no está configurada',
      );
    }

    const locale = dto.locale || 'es-MX';

    // Prompt del sistema 
    const systemPrompt = `
Eres un asistente experto en gastronomía y redacción para menús de restaurantes.

RESPONDE EXCLUSIVAMENTE con un JSON válido. 
NO incluyas explicaciones, texto adicional ni markdown.
NO incluyas backticks.

Formato EXACTO:
{
  "professional": "string",
  "commercial": "string",
  "short": "string",
  "allergens": ["string"],
  "nameSuggestions": ["string"],
  "social": {
    "instagram": "string",
    "facebook": "string"
  }
}

Reglas:
- Idioma: ${locale}
- professional: descripción formal del producto.
- commercial: texto atractivo estilo ventas.
- short: máximo 120 caracteres.
- allergens: posibles alérgenos detectados visualmente.
- nameSuggestions: 3 a 5 nombres sugeridos.
- social.instagram: estilo creativo, trendy.
- social.facebook: estilo más neutral.
`.trim();

    const userPrompt = `
Genera toda la información usando la imagen.
Contexto adicional: ${dto.context ?? 'ninguno'}.
`.trim();

    try {
      // Llamada a OpenRouter
      const response$ = this.http.post(
        this.apiUrl,
        {
          model: this.model,
          max_tokens: 1500, // limite maximo de tokens pa que no me cobre
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: dto.imageUrl,
                  },
                },
              ],
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',

            // Recomendado por OpenRouter
            'HTTP-Referer': 'http://localhost:4200',
            'X-Title': 'CommandSystem AI Helper',
          },
        },
      );

      const { data } = await firstValueFrom(response$);

      const rawContent: string =
        data?.choices?.[0]?.message?.content ?? '';

      // Extraer JSON real 
      const parsed = this.extractJson(rawContent);

      return parsed;
    } catch (err) {
      console.error('Error llamando a OpenRouter:', err?.response?.data || err);
      throw new InternalServerErrorException(
        'Error al generar la descripción con IA',
      );
    }
  }
}
