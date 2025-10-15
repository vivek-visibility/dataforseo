import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OnPageTaskDto {
  id?: string;
  filters?: any;     // you can further refine types
  order_by?: any;
  limit?: number;
}

export class FetchOnPagePagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnPageTaskDto)
  tasks: OnPageTaskDto[];
}
