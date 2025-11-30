// src/products/company-images.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { AiService } from 'src/ai/ai.service';
import { CompanyProductsService } from './company_products.service';

@Injectable()
export class CompanyImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiService: AiService,
  ) {}

  // Subir imagen, generar descripción IA y guardar en BD
  async uploadProductImage(id_product: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    const product = await this.prisma.company_products.findUnique({
      where: { id_company_product : id_product },
      select: { name: true, product_categories: { select: { name: true } } },
    });

    if (!product) {
      throw new BadRequestException('El producto no existe.');
    }

    const productName = product.name;
    const categoryName = product.product_categories?.name || 'General';

    // Subir imagen a Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file, productName);

    // Generar descripción con IA
    //const description_ai = await this.aiService.generateDescription(productName, categoryName);
    //const description_ai = "Descripción generada por IA"; // Placeholder

    // Guardar en BD
    const savedImage = await this.prisma.company_product_images.create({
      data: {
        id_company_product: id_product,
        image_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      },
    });

    return {
      message: 'Imagen subida y guardada con éxito',
      image: savedImage,
    };
  }

  // Obtener todas las imágenes de un producto
  async getImagesByProduct(id_product: number) {
    return this.prisma.company_product_images.findMany({
      where: { id_company_product : id_product },
    });
  }

  //  Eliminar imagen (Cloudinary + BD)
  async deleteImage(id_image: number) {
    // Buscar la imagen primero
    const image = await this.prisma.company_product_images.findUnique({
      where: { id_image },
    });

    if (!image) {
      throw new BadRequestException('La imagen no existe');
    }

    //  Eliminar de Cloudinary
    await this.cloudinaryService.deleteFile(image.public_id);

    // Eliminar de la BD
    await this.prisma.company_product_images.delete({
      where: { id_image },
    });

    return { message: 'Imagen eliminada correctamente' };
  }
}
