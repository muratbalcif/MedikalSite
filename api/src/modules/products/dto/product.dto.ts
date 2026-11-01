import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ProductImageInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/products/klima-1.jpg' })
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({
    description: 'R2 object key for later cleanup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objectKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProductAttributeInputDto {
  @ApiProperty({ example: 'Soğutma Kapasitesi' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '12000 BTU' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProductCompatibilityInputDto {
  @ApiProperty({ example: 'Arçelik' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  manufacturer!: string;

  @ApiProperty({ example: '12325' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  modelYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-KLIMA-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  sku!: string;

  @ApiPropertyOptional({ example: '8690000000012' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  barcode?: string;

  @ApiProperty({ example: '12.000 BTU Split Klima' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @ApiProperty({ example: '12000-btu-split-klima' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(220)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  brandId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Dijital ateş ölçer | ANAMUR ACİL MEDİKAL' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Sanitized rich HTML for Teknik Özellikler',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  technicalHtml?: string | null;

  @ApiPropertyOptional({
    description: 'Sanitized rich HTML for Uyumluluk',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  compatibilityHtml?: string | null;

  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductAttributeInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  attributes?: ProductAttributeInputDto[];

  @ApiPropertyOptional({ type: [ProductCompatibilityInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductCompatibilityInputDto)
  compatibility?: ProductCompatibilityInputDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  sku?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string | null;

  @ApiPropertyOptional({
    description: 'Sanitized rich HTML for Teknik Özellikler',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  technicalHtml?: string | null;

  @ApiPropertyOptional({
    description: 'Sanitized rich HTML for Uyumluluk',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  compatibilityHtml?: string | null;

  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductAttributeInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  attributes?: ProductAttributeInputDto[];

  @ApiPropertyOptional({ type: [ProductCompatibilityInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductCompatibilityInputDto)
  compatibility?: ProductCompatibilityInputDto[];
}

export class RegisterProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/products/x.jpg' })
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objectKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ReorderImagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  imageIds!: string[];
}

export class BulkProductStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds!: string[];

  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}
