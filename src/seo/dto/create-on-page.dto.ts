import { IsNumber, IsBoolean, IsString, IsOptional } from 'class-validator';

export class CreateOnPageDto {
  @IsString()
  url: string;

  @IsNumber()
  title_length: number;

  @IsNumber()
  meta_description_length: number;

  @IsBoolean()
  h1_present: boolean;

  @IsNumber()
  content_word_count: number;

  @IsNumber()
  internal_links: number;
}
