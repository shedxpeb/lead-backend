# Lead CRM Setup Guide

This is a standalone Lead Management System extracted from the full CRM. It includes a complete backend API and frontend UI.

## Tech Stack

### Backend
- **Node.js** with NestJS 11
- **TypeScript**
- **Prisma ORM** with PostgreSQL
- **JWT Authentication**
- **Swagger API Documentation**

### Frontend
- **Next.js 16** with React 19
- **TypeScript**
- **Tailwind CSS**
- **Radix UI Components**
- **TanStack Query (React Query)**
- **Axios** for API calls

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 18

## Database Setup

### 1. Create PostgreSQL Database

Open pgAdmin 4 and:

1. Right-click on "Databases" → "Create" → "Database..."
2. **Database name**: `lead_crm`
3. **Owner**: `postgres`
4. Click "Save"

### 2. Update Environment Variables

Update the `.env` file in the backend folder:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/lead_crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ACCESS_EXPIRES_IN="30m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3001"
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Run Prisma Commands

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Start Backend Server

```bash
npm run start:dev
```

Backend will run on **http://localhost:3000**

API Documentation: **http://localhost:3000/api**

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Update Environment Variables

Update the `.env` file in the frontend folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CAPABILITIES_PATH=/system/capabilities
BACKEND_URL=http://localhost:3000
IMAGE_HOSTNAME=localhost
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

### 3. Start Frontend Server

```bash
npm run dev
```

Frontend will run on **http://localhost:3001**

## Default Login Credentials

After running the seed, you can login with:

- **Email**: `admin@leadcrm.com`
- **Password**: `admin123`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user profile

### Leads
- `GET /lead` - Get all leads with pagination, search, and filters
- `GET /lead/kanban` - Get kanban view data
- `GET /lead/calendar` - Get calendar view data
- `GET /lead/export` - Export leads to Excel
- `GET /lead/check-duplicate` - Check for duplicate leads
- `PATCH /lead/bulk/status` - Bulk update lead status
- `DELETE /lead/bulk` - Bulk delete leads
- `POST /lead/import` - Import leads from Excel
- `POST /lead` - Create new lead
- `GET /lead/:id/project-data` - Get lead data for project creation
- `GET /lead/:id` - Get lead by ID
- `GET /lead/:id/logs` - Get lead activity logs
- `POST /lead/:id/workflow` - Process workflow for lead
- `POST /lead/:id/restore` - Restore deleted lead
- `PATCH /lead/:id` - Update lead
- `DELETE /lead/:id` - Delete lead

## Troubleshooting

### PostgreSQL Connection Issues

If you see "FATAL: the database system is in recovery mode":

1. Stop PostgreSQL service:
   ```cmd
   net stop postgresql-x64-18
   ```

2. Start PostgreSQL service:
   ```cmd
   net start postgresql-x64-18
   ```

3. If it still fails, check the PostgreSQL logs at:
   `C:\Program Files\PostgreSQL\18\data\log\`

### Port Already in Use

If port 3000 is already in use:
- Stop the backend server and restart it
- Or change the PORT in backend/.env

If port 3001 is already in use:
- Stop the frontend server and restart it
- Or change the port in frontend/package.json scripts

### Prisma Client Not Generated

If you see errors about Prisma Client:
```bash
npx prisma generate
```

## Development

### Backend
```bash
cd backend
npm run start:dev      # Start with hot reload
npm run build          # Build for production
npm run start:prod     # Start production server
npm run type-check     # Run TypeScript type checking
npm run lint           # Run ESLint
```

### Frontend
```bash
cd frontend
npm run dev            # Start with hot reload
npm run build          # Build for production
npm run start          # Start production server
npm run type-check     # Run TypeScript type checking
npm run lint           # Run ESLint
```

## Features

### Lead Management
- ✅ Full CRUD operations
- ✅ Search and filtering
- ✅ Pagination
- ✅ Kanban view
- ✅ Calendar view
- ✅ Bulk operations
- ✅ Import/Export (Excel)
- ✅ Duplicate detection
- ✅ Workflow management
- ✅ Activity logs
- ✅ Soft delete with restore

### Authentication
- ✅ JWT-based authentication
- ✅ User registration
- ✅ Secure password hashing
- ✅ Protected routes

## License

Private - For internal use only
