# Lead CRM Backend

A simple, standalone Lead Management System for sales teams and anyone who needs to track inquiries and follow-ups. No multi-tenancy, no complex permissions - just straightforward lead management.

## Features

- ✅ Lead CRUD Operations (Create, Read, Update, Delete)
- ✅ Lead Import from Excel files
- ✅ Lead Export to Excel
- ✅ Kanban View for Lead Management
- ✅ Calendar View for Follow-ups
- ✅ Bulk Operations (Status Update, Delete)
- ✅ Duplicate Lead Detection
- ✅ Lead Workflow Management
- ✅ Simple JWT Authentication
- ✅ Audit Logging
- ✅ Advanced Filtering & Search
- ✅ Pagination

## Tech Stack

- **Framework**: NestJS with Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **File Upload**: @fastify/multipart
- **Excel Import/Export**: xlsx library
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Lead-CRM/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```
DATABASE_URL="postgresql://username:password@localhost:5432/lead_crm?schema=public"
JWT_SECRET="your-secret-key"
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run database migrations:
```bash
npx prisma migrate dev --name init
```

6. Seed the database (optional):
```bash
npx prisma db seed
```

7. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3000/api`
- API Docs: `http://localhost:3000/api-json`

## Available Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile

### Leads
- `GET /lead` - Get all leads with pagination and filters
- `GET /lead/:id` - Get lead by ID
- `POST /lead` - Create new lead
- `PATCH /lead/:id` - Update lead
- `DELETE /lead/:id` - Soft delete lead
- `GET /lead/kanban` - Get kanban view data
- `GET /lead/calendar` - Get calendar view data
- `GET /lead/export` - Export leads
- `POST /lead/import` - Import leads from Excel
- `PATCH /lead/bulk/status` - Bulk update lead status
- `DELETE /lead/bulk` - Bulk delete leads
- `GET /lead/check-duplicate` - Check for duplicate leads
- `POST /lead/:id/workflow` - Update lead workflow
- `GET /lead/:id/logs` - Get lead audit logs

## Project Structure

```
backend/
├── src/
│   ├── lead/              # Lead module
│   │   ├── dto/          # Data Transfer Objects
│   │   ├── lead.controller.ts
│   │   ├── lead.service.ts
│   │   └── lead.module.ts
│   ├── auth/             # Authentication module
│   ├── workflow/         # Workflow engine
│   ├── prisma/           # Prisma ORM
│   ├── common/           # Shared services
│   ├── config/           # Configuration
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seed
├── .env                  # Environment variables
├── package.json
└── tsconfig.json
```

## Database Schema

The project uses the following main models:
- **User** - System users with simple role-based access
- **Lead** - Lead records with full customer and project details
- **AuditLog** - Audit trail for all operations
- **BusinessEvent** - Event tracking for workflows

## Development Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npx prisma studio` - Open Prisma Studio for database management

## Lead Data Structure

Leads include comprehensive information:
- **Customer Details**: Name, company, contact info, social links
- **Project Details**: Project type, structure type, dimensions
- **Technical Specs**: Roof type, wall type, insulation, crane requirements
- **Site Information**: Location, address, soil notes
- **Business Info**: Industry, business type, source, priority
- **Workflow**: Status, follow-up dates, remarks, score

## Import Format

Excel import supports flexible column naming with automatic mapping. Required fields:
- Customer Name
- Mobile Number
- Email

Optional fields are auto-mapped from various column name variations.

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Audit logging for all operations
- Basic permission guards

## Default User

After seeding, you can login with:
- Email: `admin@leadcrm.com`
- Password: `admin123`

## License

UNLICENSED - Private Project
