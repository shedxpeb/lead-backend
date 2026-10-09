import { IsEnum, IsOptional } from 'class-validator';

export class ImportLeadsDto {
  @IsEnum(['skip', 'review', 'update'])
  duplicateHandling: 'skip' | 'review' | 'update' = 'skip';
}
