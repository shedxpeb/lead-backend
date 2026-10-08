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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadService } from './lead.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
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
}
