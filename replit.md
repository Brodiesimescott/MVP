# Overview

ChironIQ is a comprehensive healthcare practice management platform designed for UK medical practices. The application serves as a unified system that addresses multiple operational aspects of healthcare practice management, including CQC compliance tracking, HR management, secure internal messaging, financial management with UK-specific features, inventory management, and facilities management.

The platform is built as a multi-tenant system with strict data segregation by practice, ensuring that users from different medical practices can never access each other's data. It includes specialized modules for different aspects of practice management, each with its own dedicated functionality and user interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and Vite as the build tool. The application uses a single-page application (SPA) architecture with client-side routing managed by the wouter library. The UI is styled with Tailwind CSS and uses shadcn/ui components for consistent design patterns.

The frontend follows a modular approach where each practice management module (CQC, HR, Messaging, Money, Stock, Facilities) has its own dedicated page component. State management is handled through TanStack Query for server state and React hooks for local component state.

The application implements a responsive design that adapts to both desktop and mobile viewports, with specific mobile-friendly components and layouts.

## Backend Architecture

The backend uses Node.js with Express.js following a RESTful API design. The server implements middleware for request logging, error handling, and CORS support. API routes are organized by module functionality with consistent REST patterns.

The backend includes WebSocket support for real-time features, particularly for the messaging module. WebSocket connections are managed with automatic reconnection and connection state tracking.

Authentication and authorization are implemented using session-based authentication with bcrypt for password hashing. The system supports role-based access control with three user roles: staff, poweruser, and user.

## Data Storage Architecture

The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema is designed with multi-tenancy in mind, where all data tables include practice-specific identifiers to ensure data isolation.

Database migrations are managed through Drizzle Kit, allowing for version-controlled schema changes. The storage layer implements an abstraction pattern that allows for both in-memory development storage and production database implementations.

## Multi-Tenancy and Security

All data access is strictly partitioned by practice ID, ensuring complete data isolation between different medical practices. This is enforced at both the API level and database query level.

The messaging module includes an AI Safety Net system that analyzes message content for potential patient information before allowing messages to be saved or transmitted. This implements healthcare-specific compliance requirements.

## Real-Time Communication

WebSocket implementation provides real-time messaging capabilities with automatic reconnection logic and exponential backoff for connection failures. The system maintains client state and handles connection lifecycle events properly.

## UK Healthcare Compliance

The system is designed with UK healthcare regulations in mind, including integration capabilities for:
- CQC compliance tracking and automated updates
- HMRC Making Tax Digital (MTD) integration for VAT returns
- Open Banking integration for automated financial data import
- Jurisdictional tax calculation rules engine

# External Dependencies

## Database Services
- PostgreSQL database (configured via DATABASE_URL environment variable)
- Neon Database serverless driver for cloud database connectivity

## Authentication & Session Management
- Passport.js with local strategy for authentication
- Express-session for session management
- bcrypt for secure password hashing
- connect-pg-simple for PostgreSQL session storage

## UI Component Libraries
- Radix UI components for accessible, unstyled UI primitives
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography
- shadcn/ui for pre-styled component library

## Form Handling & Validation
- React Hook Form for form state management
- Zod for runtime type validation and schema definition
- Hookform resolvers for integration between React Hook Form and Zod

## Data Fetching & State Management
- TanStack Query for server state management, caching, and synchronization
- Built-in React hooks for local component state

## Development & Build Tools
- Vite for fast development server and optimized production builds
- TypeScript for static type checking
- ESBuild for backend bundling in production

## WebSocket Communication
- ws library for WebSocket server implementation
- Custom WebSocket client with reconnection logic

## Date & Time Utilities
- date-fns for date manipulation and formatting

## UK-Specific Integrations (Planned)
- Open Banking API providers (Plaid, TrueLayer) for bank account connectivity
- HMRC MTD APIs for tax return submissions
- CQC guidance monitoring systems