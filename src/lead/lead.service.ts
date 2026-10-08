import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

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
}
