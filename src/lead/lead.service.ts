import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ExportLeadsDto } from './dto/export-leads.dto';
import { ImportValidationResult, ImportResult, ImportRowError } from './dto/import-validation.dto';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetLeadsDto, userId: string) {
    const {
      page = 1,
      pageSize = 25,
      search,
      status,
      priority,
      source,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100);

    // ALWAYS enforce ownership - user can only see their own leads
    const where: any = {
      isDeleted: false,
      createdById: userId,
    };

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { requirement: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    } 

    if (priority) {
      where.priority = priority;
    }

    if (source) {
      where.source = source;
    }

    const orderBy: any = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'clientName') {
      orderBy.clientName = sortOrder;
    } else if (sortBy === 'leadNumber') {
      orderBy.leadNumber = sortOrder;
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          followUps: {
            where: { status: 'PENDING', scheduledAt: { not: null } },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Calculate summary - ALL counts must respect ownership
    const [summaryNew, summaryContacted, summaryConverted] = await Promise.all([
      this.prisma.lead.count({ where: { ...where, status: 'New' } }),
      this.prisma.lead.count({ where: { ...where, status: 'Contacted' } }),
      this.prisma.lead.count({ where: { ...where, status: 'Converted' } }),
    ]);

    const summaryInProgress = Math.max(0, total - summaryNew - summaryContacted - summaryConverted);

    return {
      message: 'Lead list fetched successfully.',
      data: {
        rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        summary: {
          total,
          new: summaryNew,
          contacted: summaryContacted,
          converted: summaryConverted,
          inProgress: summaryInProgress,
        },
        filters: {
          status,
          priority,
          source,
        },
      },
    };
  }

  async findOne(id: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false, createdById: userId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return {
      message: 'Lead fetched successfully.',
      data: lead,
    };
  }

  async create(data: CreateLeadDto, userId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        clientName: data.clientName || null,
        companyName: data.companyName || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        city: data.city || null,
        source: data.source || null,
        requirementType: data.requirementType || null,
        requirement: data.requirement || null,
        estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null,
        priority: data.priority || null,
        status: data.status || 'New',
        initialNotes: data.initialNotes || null,
        assignedToId: data.assignedToId || null,
        createdById: userId,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        lastContactAt: new Date(),
      },
      include: {
        assignedTo: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      message: 'Lead created successfully.',
      data: lead,
    };
  }

  async update(id: string, data: UpdateLeadDto, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false, createdById: userId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.requirementType !== undefined) updateData.requirementType = data.requirementType;
    if (data.requirement !== undefined) updateData.requirement = data.requirement;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.initialNotes !== undefined) updateData.initialNotes = data.initialNotes;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.nextFollowUpAt !== undefined) updateData.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      message: 'Lead updated successfully.',
      data: updated,
    };
  }

  async softDelete(id: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false, createdById: userId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    await this.prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Lead deleted successfully.',
      data: { id },
    };
  }

  async createFollowUp(leadId: string, data: any, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, isDeleted: false, createdById: userId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const followUp = await this.prisma.followUp.create({
      data: {
        lead: { connect: { id: leadId } },
        createdBy: { connect: { id: userId } },
        type: data.type || 'CALL',
        status: data.status || 'PENDING',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
        notes: data.notes || '',
        result: data.result,
        nextFollowUpAt: data.nextFollowUpAt,
      },
    });

    // Update lead with follow-up information
    const updateData: any = {
      lastContactAt: new Date(),
    };

    // If this follow-up has a scheduled date, update Lead's cached nextFollowUpAt
    if (data.scheduledAt && data.status === 'PENDING') {
      updateData.nextFollowUpAt = new Date(data.scheduledAt);
    }

    if (data.result && data.result === 'INTERESTED' && lead.status === 'New') {
      updateData.status = 'Contacted';
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return {
      message: 'Follow-up created successfully.',
      data: followUp,
    };
  }

  async getFollowUps(leadId: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, isDeleted: false, createdById: userId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const followUps = await this.prisma.followUp.findMany({
      where: { leadId },
      orderBy: { scheduledAt: 'desc' },
    });

    return {
      message: 'Follow-ups fetched successfully.',
      data: followUps,
    };
  }

  async getDashboardFollowUps(userId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [overdue, today, upcoming, completed] = await Promise.all([
      // Overdue: pending follow-ups scheduled before now
      this.prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lt: now },
          lead: { isDeleted: false, createdById: userId },
        },
        include: {
          lead: {
            select: {
              id: true,
              clientName: true,
              companyName: true,
              phone: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),

      // Today: pending follow-ups scheduled for today
      this.prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: startOfToday, lt: startOfTomorrow },
          lead: { isDeleted: false, createdById: userId },
        },
        include: {
          lead: {
            select: {
              id: true,
              clientName: true,
              companyName: true,
              phone: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),

      // Upcoming: pending follow-ups scheduled after today
      this.prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: startOfTomorrow },
          lead: { isDeleted: false, createdById: userId },
        },
        include: {
          lead: {
            select: {
              id: true,
              clientName: true,
              companyName: true,
              phone: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),

      // Completed: all completed follow-ups
      this.prisma.followUp.findMany({
        where: {
          status: 'COMPLETED',
          lead: { isDeleted: false, createdById: userId },
        },
        include: {
          lead: {
            select: {
              id: true,
              clientName: true,
              companyName: true,
              phone: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      message: 'Dashboard follow-ups fetched successfully.',
      data: {
        overdue,
        today,
        upcoming,
        completed,
      },
    };
  }

  async exportLeads(query: ExportLeadsDto, userId: string) {
    const {
      search,
      status,
      priority,
      source,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {
      isDeleted: false,
      createdById: userId,
    };

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { requirement: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (source) {
      where.source = source;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const orderBy: any = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'clientName') {
      orderBy.clientName = sortOrder;
    } else if (sortBy === 'leadNumber') {
      orderBy.leadNumber = sortOrder;
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const formatDate = (date: Date | null | undefined) => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

    const sanitizeValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (['=', '+', '-', '@'].includes(strValue.charAt(0))) {
        return `'${strValue}`;
      }
      return strValue;
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    // Define columns
    worksheet.columns = [
      { header: 'Lead Number', key: 'leadNumber', width: 15 },
      { header: 'Client Name', key: 'clientName', width: 25 },
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Requirement Type', key: 'requirementType', width: 18 },
      { header: 'Requirement', key: 'requirement', width: 35 },
      { header: 'Estimated Value', key: 'estimatedValue', width: 18 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Initial Notes', key: 'initialNotes', width: 35 },
      { header: 'Assigned To', key: 'assignedTo', width: 18 },
      { header: 'Next Follow-up', key: 'nextFollowUpAt', width: 18 },
      { header: 'Last Contact', key: 'lastContactAt', width: 18 },
      { header: 'Created Date', key: 'createdAt', width: 18 },
      { header: 'Updated Date', key: 'updatedAt', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data
    for (const lead of leads) {
      worksheet.addRow({
        leadNumber: lead.leadNumber || '',
        clientName: sanitizeValue(lead.clientName) || '',
        companyName: sanitizeValue(lead.companyName) || '',
        phone: sanitizeValue(lead.phone) || '',
        whatsapp: sanitizeValue(lead.whatsapp) || '',
        email: sanitizeValue(lead.email) || '',
        city: sanitizeValue(lead.city) || '',
        source: lead.source || '',
        requirementType: sanitizeValue(lead.requirementType) || '',
        requirement: sanitizeValue(lead.requirement) || '',
        estimatedValue: lead.estimatedValue || '',
        priority: lead.priority || '',
        status: lead.status || '',
        initialNotes: sanitizeValue(lead.initialNotes) || '',
        assignedTo: lead.assignedTo?.name || '',
        nextFollowUpAt: formatDate(lead.nextFollowUpAt),
        lastContactAt: formatDate(lead.lastContactAt),
        createdAt: formatDate(lead.createdAt),
        updatedAt: formatDate(lead.updatedAt),
      });
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle', wrapText: true };
        }
      });
    });

    // Alternate row colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `leads_export_${dateStr}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;

    return {
      buffer: Buffer.from(buffer),
      filename,
      count: leads.length,
    };
  }

  async generateImportTemplate(userId: string) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Leads Template');

      // Define columns
      worksheet.columns = [
        { header: 'Client Name*', key: 'clientName', width: 25 },
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'Phone*', key: 'phone', width: 18 },
        { header: 'WhatsApp', key: 'whatsapp', width: 18 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Source', key: 'source', width: 15 },
        { header: 'Requirement Type', key: 'requirementType', width: 18 },
        { header: 'Requirement', key: 'requirement', width: 35 },
        { header: 'Estimated Value', key: 'estimatedValue', width: 18 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Initial Notes', key: 'initialNotes', width: 35 },
        { header: 'Next Follow-up', key: 'nextFollowUpAt', width: 18 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add example row
      worksheet.addRow({
        clientName: 'John Doe',
        companyName: 'Acme Corporation',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'john.doe@example.com',
        city: 'Mumbai',
        source: 'Website',
        requirementType: 'Warehouse',
        requirement: 'Need a 5000 sq ft warehouse with loading dock',
        estimatedValue: '5000000',
        priority: 'High',
        status: 'New',
        initialNotes: 'Interested in industrial sheds',
        nextFollowUpAt: '2026-10-15',
      });

      // Style example row
      const exampleRow = worksheet.getRow(2);
      exampleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFE0' },
      };
      exampleRow.font = { italic: true, color: { argb: 'FF666666' } };

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Add borders to all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle', wrapText: true };
          }
        });
      });

      // Instructions sheet
      const instructionSheet = workbook.addWorksheet('Instructions');
      instructionSheet.columns = [
        { header: 'Field', key: 'field', width: 25 },
        { header: 'Description', key: 'description', width: 60 },
      ];

      // Style instruction header
      const instructionHeader = instructionSheet.getRow(1);
      instructionHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      instructionHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      instructionHeader.alignment = { vertical: 'middle', horizontal: 'center' };
      instructionHeader.height = 25;

      // Add instruction rows
      instructionSheet.addRow({
        field: 'Required Fields',
        description: 'Client Name and Phone are required (marked with *)',
      });
      instructionSheet.addRow({
        field: 'Valid Status Values',
        description: 'New, Contacted, DesignPending, EstimateSent, ProposalSent, Negotiation, Approved, Rejected, Converted',
      });
      instructionSheet.addRow({
        field: 'Valid Priority Values',
        description: 'Low, Medium, High, Urgent',
      });
      instructionSheet.addRow({
        field: 'Valid Source Values',
        description: 'Website, Referral, ColdCall, Email, SocialMedia, TradeShow, Advertisement, Other',
      });
      instructionSheet.addRow({
        field: 'Date Format',
        description: 'YYYY-MM-DD (e.g., 2026-10-15)',
      });
      instructionSheet.addRow({
        field: 'Phone Format',
        description: '10-15 digits, optional + prefix (e.g., +919876543210)',
      });
      instructionSheet.addRow({
        field: 'Important Notes',
        description: '- Remove or replace the example row before importing\n- Maximum 1000 rows per file\n- Duplicate leads will be detected based on email or phone',
      });

      // Style instruction rows
      instructionSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'top', wrapText: true };
          }
        });
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;

      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Failed to generate Excel template: empty buffer');
      }

      return {
        buffer: Buffer.from(buffer),
        filename: 'leads_import_template.xlsx',
      };
    } catch (error) {
      console.error('Template generation error:', error);
      throw new BadRequestException('Failed to generate Excel template. Please try again later.');
    }
  }

  async validateImportFile(file: any, userId: string): Promise<ImportValidationResult> {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const MAX_ROWS = 1000;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty or corrupted');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    let rawData: any[];
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);

      if (!workbook || workbook.worksheets.length === 0) {
        throw new BadRequestException('Invalid Excel file: no worksheets found');
      }

      const worksheet = workbook.worksheets[0];

      if (!worksheet || worksheet.rowCount === 0) {
        throw new BadRequestException('Invalid Excel file: worksheet not found');
      }

      rawData = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = worksheet.getRow(1).getCell(colNumber).value as string;
          if (header) {
            let cellValue = cell.value;
            // Handle different ExcelJS value types
            if (cellValue && typeof cellValue === 'object' && 'text' in cellValue) {
              cellValue = (cellValue as any).text;
            } else if (cellValue && typeof cellValue === 'object' && 'result' in cellValue) {
              cellValue = (cellValue as any).result;
            }
            rowData[header] = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
          }
        });
        if (Object.keys(rowData).length > 0) {
          rawData.push(rowData);
        }
      });

      if (!rawData || rawData.length === 0) {
        throw new BadRequestException('File is empty or contains no data rows');
      }

      if (rawData.length > MAX_ROWS) {
        throw new BadRequestException(`File exceeds ${MAX_ROWS} row limit. Found ${rawData.length} rows.`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to read Excel file. Please ensure it is a valid .xlsx or .csv file.');
    }

    const validRows: Record<string, any>[] = [];
    const errors: ImportRowError[] = [];
    const duplicatesList: Array<{
      rowNumber: number;
      existingLead: any;
      newData: Record<string, any>;
    }> = [];

    const existingLeads = await this.prisma.lead.findMany({
      where: {
        createdById: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        clientName: true,
      },
    });

    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any;
      const rowNumber = i + 2;
      const rowErrors: string[] = [];

      const clientName = row['Client Name*'] || row['Client Name'] || row['clientName'] || '';
      const phone = row['Phone*'] || row['Phone'] || row['phone'] || '';
      const email = row['Email'] || row['email'] || '';
      const whatsapp = row['WhatsApp'] || row['whatsapp'] || '';
      const city = row['City'] || row['city'] || '';
      const source = row['Source'] || row['source'] || '';
      const requirementType = row['Requirement Type'] || row['requirementType'] || '';
      const requirement = row['Requirement'] || row['requirement'] || '';
      const estimatedValue = row['Estimated Value'] || row['estimatedValue'] || '';
      const priority = row['Priority'] || row['priority'] || '';
      const status = row['Status'] || row['status'] || '';
      const initialNotes = row['Initial Notes'] || row['initialNotes'] || '';
      const nextFollowUpAt = row['Next Follow-up'] || row['nextFollowUpAt'] || '';

      if (!clientName || clientName.trim() === '') {
        rowErrors.push('Client Name is required');
      }

      if (!phone || phone.trim() === '') {
        rowErrors.push('Phone is required');
      } else {
        const phoneRegex = /^\+?[\d\s-]{10,15}$/;
        if (!phoneRegex.test(phone)) {
          rowErrors.push('Invalid phone format (10-15 digits, optional + prefix)');
        }
      }

      if (email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          rowErrors.push('Invalid email format');
        }
      }

      const validSources = ['Website', 'Referral', 'ColdCall', 'Email', 'SocialMedia', 'TradeShow', 'Advertisement', 'Other'];
      if (source && !validSources.includes(source)) {
        rowErrors.push(`Invalid source. Must be one of: ${validSources.join(', ')}`);
      }

      const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      if (priority && !validPriorities.includes(priority)) {
        rowErrors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }

      const validStatuses = ['New', 'Contacted', 'DesignPending', 'EstimateSent', 'ProposalSent', 'Negotiation', 'Approved', 'Rejected', 'Converted'];
      if (status && !validStatuses.includes(status)) {
        rowErrors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      if (nextFollowUpAt && nextFollowUpAt.trim() !== '') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(nextFollowUpAt)) {
          rowErrors.push('Invalid date format. Use YYYY-MM-DD');
        } else {
          const date = new Date(nextFollowUpAt);
          if (isNaN(date.getTime())) {
            rowErrors.push('Invalid date');
          }
        }
      }

      if (estimatedValue && estimatedValue.trim() !== '') {
        const numValue = parseFloat(estimatedValue);
        if (isNaN(numValue)) {
          rowErrors.push('Estimated value must be a number');
        }
      }

      const normalizedPhone = normalizePhone(phone);
      const duplicateLead = existingLeads.find(
        (lead) =>
          normalizePhone(lead.phone) === normalizedPhone ||
          (email && lead.email?.toLowerCase() === email.toLowerCase())
      );

      if (duplicateLead) {
        duplicatesList.push({
          rowNumber,
          existingLead: duplicateLead,
          newData: row,
        });
      }

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber,
          status: 'invalid',
          errors: rowErrors,
          data: row,
        });
      } else {
        validRows.push({
          clientName: clientName.trim(),
          companyName: row['Company Name'] || row['companyName'] || '',
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          city: city.trim(),
          source: source || null,
          requirementType: requirementType.trim(),
          requirement: requirement.trim(),
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
          priority: priority || null,
          status: status || 'New',
          initialNotes: initialNotes.trim(),
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        });
      }
    }

    return {
      total: rawData.length,
      valid: validRows.length,
      invalid: errors.length,
      duplicates: duplicatesList.length,
      validRows,
      errors,
      duplicatesList,
    };
  }

  async importLeads(
    file: any,
    duplicateHandling: 'skip' | 'review' | 'update',
    userId: string,
  ): Promise<ImportResult> {
    try {
      const validationResult = await this.validateImportFile(file, userId);

      const result: ImportResult = {
        total: validationResult.total,
        imported: 0,
        skipped: 0,
        duplicates: 0,
        failed: 0,
        rows: [],
      };

      if (validationResult.valid === 0) {
        return {
          ...result,
          rows: validationResult.errors,
        };
      }

      const BATCH_SIZE = 50;
      const rowsToProcess = [...validationResult.validRows];
      let currentRowIndex = 0;

      for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
        const batch = rowsToProcess.slice(i, i + BATCH_SIZE);

        try {
          await this.prisma.$transaction(async (tx) => {
            for (const row of batch) {
              try {
                const normalizedPhone = row.phone.replace(/\D/g, '');

                const existingLead = await tx.lead.findFirst({
                  where: {
                    createdById: userId,
                    isDeleted: false,
                    OR: [
                      { phone: { contains: row.phone, mode: 'insensitive' } },
                      row.email ? { email: { equals: row.email, mode: 'insensitive' } } : { id: 'never-match' },
                    ],
                  },
                });

                if (existingLead) {
                  result.duplicates++;

                  if (duplicateHandling === 'skip') {
                    result.skipped++;
                    result.rows.push({
                      rowNumber: currentRowIndex + 1,
                      status: 'skipped',
                      errors: ['Duplicate lead skipped'],
                      data: row,
                    });
                  } else if (duplicateHandling === 'update') {
                    const updateData: any = {};
                    if (row.clientName) updateData.clientName = row.clientName;
                    if (row.companyName) updateData.companyName = row.companyName;
                    if (row.phone) updateData.phone = row.phone;
                    if (row.whatsapp) updateData.whatsapp = row.whatsapp;
                    if (row.email) updateData.email = row.email;
                    if (row.city) updateData.city = row.city;
                    if (row.source) updateData.source = row.source;
                    if (row.requirementType) updateData.requirementType = row.requirementType;
                    if (row.requirement) updateData.requirement = row.requirement;
                    if (row.estimatedValue) updateData.estimatedValue = row.estimatedValue;
                    if (row.priority) updateData.priority = row.priority;
                    if (row.status) updateData.status = row.status;
                    if (row.initialNotes) updateData.initialNotes = row.initialNotes;
                    if (row.nextFollowUpAt) updateData.nextFollowUpAt = row.nextFollowUpAt;

                    await tx.lead.update({
                      where: { id: existingLead.id },
                      data: updateData,
                    });

                    result.imported++;
                    result.rows.push({
                      rowNumber: currentRowIndex + 1,
                      status: 'imported',
                      errors: [],
                      data: row,
                    });
                  } else {
                    result.skipped++;
                    result.rows.push({
                      rowNumber: currentRowIndex + 1,
                      status: 'duplicate',
                      errors: ['Duplicate lead marked for review'],
                      data: row,
                    });
                  }
                } else {
                  await tx.lead.create({
                    data: {
                      clientName: row.clientName,
                      companyName: row.companyName || null,
                      phone: row.phone,
                      whatsapp: row.whatsapp || null,
                      email: row.email || null,
                      city: row.city || null,
                      source: row.source || null,
                      requirementType: row.requirementType || null,
                      requirement: row.requirement || null,
                      estimatedValue: row.estimatedValue || null,
                      priority: row.priority || null,
                      status: row.status || 'New',
                      initialNotes: row.initialNotes || null,
                      nextFollowUpAt: row.nextFollowUpAt || null,
                      lastContactAt: new Date(),
                      createdById: userId,
                    },
                  });

                  result.imported++;
                  result.rows.push({
                    rowNumber: currentRowIndex + 1,
                    status: 'imported',
                    errors: [],
                    data: row,
                  });
                }
              } catch (error) {
                result.failed++;
                result.rows.push({
                  rowNumber: currentRowIndex + 1,
                  status: 'invalid',
                  errors: [error instanceof Error ? error.message : 'Unknown error'],
                  data: row,
                });
              }
              currentRowIndex++;
            }
          });
        } catch (error) {
          for (const row of batch) {
            result.failed++;
            result.rows.push({
              rowNumber: currentRowIndex + 1,
              status: 'invalid',
              errors: [error instanceof Error ? error.message : 'Transaction failed'],
              data: row,
            });
            currentRowIndex++;
          }
        }
      }

      result.rows.push(
        ...validationResult.errors.map((error) => ({
          ...error,
          status: 'invalid' as const,
        })),
      );

      result.rows.sort((a, b) => a.rowNumber - b.rowNumber);

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to import leads. Please check your file and try again.');
    }
  }
}
