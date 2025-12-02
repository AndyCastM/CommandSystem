import { Body, Controller, Post } from '@nestjs/common';
import { DescribeProductDto } from './dto/describe-product.dto';
import { DescribeProductResult } from './types/describe-product-result';
import { AIService } from './ai.service';

@Controller('ai-helper')
export class AIController {
  constructor(private readonly aiHelper: AIService) {}

  @Post('describe-product')
  async describeProduct(
    @Body() dto: DescribeProductDto,
  ): Promise<DescribeProductResult> {
    return this.aiHelper.describeProduct(dto);
  }
}
