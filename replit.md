# ExpenseFlow - Expense Management System

## Overview

ExpenseFlow is a modern web application for managing expense reports and approvals within an organization. The system allows employees to submit expense reports, approvers to review and approve/reject them, and provides comprehensive tracking and notifications throughout the process. It integrates with external services like Gmail and Google Sheets for automated expense submission and data synchronization.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend components:

- **Frontend**: React-based SPA using TypeScript and modern UI components
- **Backend**: Express.js REST API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Build System**: Vite for fast development and optimized production builds
- **Deployment**: Replit-ready with autoscale deployment configuration

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: 
  - Zustand for authentication state
  - TanStack Query for server state and caching
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Design**: RESTful endpoints with consistent error handling
- **Authentication**: Simple session-based auth with bearer tokens
- **Data Access**: Drizzle ORM with PostgreSQL
- **External Integrations**: Gmail API and Google Sheets API

### Database Schema
The application uses three main entities:
- **Users**: Employee information with roles (employee, approver, admin)
- **Expenses**: Complete expense records with approval workflow
- **System Settings**: Configurable application settings

Key features of the expense entity:
- Tracks submission through approval lifecycle
- Supports multiple submission methods (manual, email, form)
- Maintains audit trail with approval history
- Links to external systems (Gmail, Sheets) via reference IDs

### External Integrations
- **Gmail Service**: Monitors inbox for expense submissions via email
- **Google Sheets Service**: Synchronizes approved expenses for reporting
- **Notification Service**: Sends automated email notifications for status changes

## Data Flow

1. **Expense Submission**: 
   - Employees submit through web interface or email
   - System creates expense record with "pending" status
   - Notifications sent to approvers

2. **Approval Process**:
   - Approvers review expenses through dashboard
   - Status updated to "approved" or "rejected" with notes
   - Notifications sent to submitter

3. **Data Synchronization**:
   - Approved expenses sync to Google Sheets
   - Email processing runs periodically to capture new submissions
   - All changes tracked with timestamps and user attribution

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **TypeScript**: Full type safety across frontend and backend
- **Build Tools**: Vite for development and production builds

### UI and Styling
- **Radix UI**: Comprehensive component library for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Backend Dependencies
- **Express.js**: Web server framework
- **Drizzle ORM**: Type-safe database ORM for PostgreSQL
- **Neon Database**: Serverless PostgreSQL provider

### External Services
- **Google APIs**: Gmail and Sheets integration for automation
- **Authentication**: Custom session management (can be extended)

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production
- **TSX**: TypeScript execution for development
- **PostCSS**: CSS processing with Autoprefixer

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

### Development Environment
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Development Server**: Runs on port 5000 with hot reloading
- **Database**: Automatically provisioned PostgreSQL instance

### Production Build
- **Frontend**: Vite builds optimized bundle to `dist/public`
- **Backend**: ESBuild compiles TypeScript server to `dist/index.js`
- **Static Assets**: Served directly by Express in production

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_CLIENT_EMAIL`: Service account for Google APIs
- `GOOGLE_PRIVATE_KEY`: Service account private key
- `GOOGLE_SHEETS_ID`: Target spreadsheet for data sync

### Scaling Considerations
- Stateless server design allows horizontal scaling
- Database connection pooling via Drizzle
- Static asset serving can be offloaded to CDN
- Session storage currently in-memory (should migrate to Redis for production)

## Changelog
- June 25, 2025: Initial setup with in-memory storage
- June 25, 2025: **Major Architecture Update** - Migrated from in-memory storage to PostgreSQL database
  - Added `server/db.ts` with Neon database connection
  - Created `DatabaseStorage` class implementing all storage operations with Drizzle ORM
  - Added database relations between users and expenses
  - Successfully migrated schema with `npm run db:push`
  - Database automatically initializes with default users and sample expense data

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

June 25, 2025 - **Database Migration Completed Successfully**
- PostgreSQL database fully operational with ExpenseFlow
- All CRUD operations working through Drizzle ORM
- User confirmed database integration is working great
- Sample data automatically populated on first run
- Expense submission, approval, and stats all persisting correctly