import { IsInt, IsIP, IsNotEmpty, IsOptional, IsString, ArrayNotEmpty, ArrayUnique, IsArray } from 'class-validator';

export class UpsertPrinterDto {

  
  @IsString()
  @IsNotEmpty()
  displayName: string;         // nombre amigable en UI

  printerIp: string;           // NOMBRE IMPRESORA MAS BIEN

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  areaIds: number[];           // ids de print_areas que imprimirá
  
  ids_station?: number[];
  
  @IsOptional()
  @IsInt()
  isActive?: number;           // 1 / 0
}
