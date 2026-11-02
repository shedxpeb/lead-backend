import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Reset leadNumber sequence to 1
  try {
    await prisma.$executeRawUnsafe(`SELECT setval('"Lead_leadNumber_seq"', 1, false)`);
    console.log('✅ Lead number sequence reset to 1');
  } catch (error) {
    console.log('⚠️  Could not reset sequence (may not exist yet):', error);
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@leadcrm.com' },
    update: {},
    create: {
      email: 'admin@leadcrm.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', user.email);

  // Create sample leads
  const lead1 = await prisma.lead.create({
    data: {
      leadNumber: 1,
      clientName: 'John Smith',
      companyName: 'Smith Industries',
      phone: '9876543210',
      whatsapp: '9876543210',
      email: 'john@smithindustries.com',
      city: 'Mumbai',
      source: 'Website',
      requirementType: 'PEB Warehouse',
      requirement: 'Need a 20,000 sq.ft PEB warehouse for manufacturing unit',
      estimatedValue: 2500000,
      priority: 'High',
      status: 'New',
      initialNotes: 'Initial inquiry via website form',
      createdById: user.id,
    },
  });
  console.log('✅ Lead 1 created:', lead1.leadNumber);

  const lead2 = await prisma.lead.create({
    data: {
      leadNumber: 2,
      clientName: 'Sarah Johnson',
      companyName: 'Johnson Logistics',
      phone: '9876543211',
      email: 'sarah@johnsonlogistics.com',
      city: 'Delhi',
      source: 'Referral',
      requirementType: 'Industrial Shed',
      requirement: 'Industrial shed for warehouse storage',
      estimatedValue: 1800000,
      priority: 'Medium',
      status: 'Contacted',
      initialNotes: 'Referred by existing customer',
      createdById: user.id,
      lastContactAt: new Date(),
    },
  });
  console.log('✅ Lead 2 created:', lead2.leadNumber);

  const lead3 = await prisma.lead.create({
    data: {
      leadNumber: 3,
      clientName: 'Rajesh Kumar',
      companyName: 'Kumar Enterprises',
      phone: '9876543212',
      whatsapp: '9876543212',
      email: 'rajesh@kumarenterprises.com',
      city: 'Bangalore',
      source: 'ColdCall',
      requirementType: 'Commercial Building',
      requirement: 'Commercial building for office space',
      estimatedValue: 3500000,
      priority: 'Urgent',
      status: 'Negotiation',
      initialNotes: 'Urgent requirement - timeline 3 months',
      createdById: user.id,
      lastContactAt: new Date(),
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
  });
  console.log('✅ Lead 3 created:', lead3.leadNumber);

  // Create sample follow-ups
  const followUp1 = await prisma.followUp.create({
    data: {
      leadId: lead2.id,
      createdById: user.id,
      type: 'CALL',
      occurredAt: new Date(),
      notes: 'Initial call to discuss requirements',
      result: 'INTERESTED',
      nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });
  console.log('✅ Follow-up 1 created for lead 2');

  const followUp2 = await prisma.followUp.create({
    data: {
      leadId: lead3.id,
      createdById: user.id,
      type: 'MEETING',
      occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      notes: 'Site visit completed',
      result: 'QUOTATION_REQUIRED',
      nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
  });
  console.log('✅ Follow-up 2 created for lead 3');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
