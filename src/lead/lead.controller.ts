import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadService } from './lead.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ExportLeadsDto } from './dto/export-leads.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  findAll(@Query() query: GetLeadsDto, @CurrentUser('id') userId: string) {
    return this.leadService.findAll(query, userId);
  }

  @Get('dashboard/follow-ups')
  getDashboardFollowUps(@CurrentUser('id') userId: string) {
    return this.leadService.getDashboardFollowUps(userId);
  }

  @Get('export')
  async exportLeads(
    @Query() query: ExportLeadsDto,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.leadService.exportLeads(query, userId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('import/template')
  async downloadImportTemplate(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.leadService.generateImportTemplate(userId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.leadService.findOne(id, userId);
  }

  @Post()
  create(@Body() data: CreateLeadDto, @CurrentUser('id') userId: string) {
    return this.leadService.create(data, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateLeadDto, @CurrentUser('id') userId: string) {
    return this.leadService.update(id, data, userId);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.leadService.softDelete(id, userId);
  }

  @Post(':leadId/follow-ups')
  createFollowUp(
    @Param('leadId') leadId: string,
    @Body() data: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadService.createFollowUp(leadId, data, userId);
  }

  @Get(':leadId/follow-ups')
  getFollowUps(@Param('leadId') leadId: string, @CurrentUser('id') userId: string) {
    return this.leadService.getFollowUps(leadId, userId);
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  validateImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.leadService.validateImportFile(file, userId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  importLeads(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ImportLeadsDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.leadService.importLeads(file, body.duplicateHandling, userId);
  }
}
