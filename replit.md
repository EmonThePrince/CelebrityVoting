# Celebrity Action Voting Website

## Overview

This is a full-stack web application called "Celebrity Action Voting Website" that allows users to submit and vote on posts about celebrities, fictional characters, and politicians. The application features anonymous voting with predefined actions like "slap," "hug," "kiss," "love," and "hate," along with the ability to suggest custom actions. The system includes admin functionality for content moderation and comprehensive security measures including reCAPTCHA and rate limiting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing a component-based architecture with shadcn/ui components for consistent styling. The application uses Wouter for client-side routing and TanStack Query for efficient state management and API communication. The UI follows a modern design system with Tailwind CSS for styling and Radix UI primitives for accessibility.

Key frontend decisions:
- **React with TypeScript**: Provides type safety and modern development experience
- **shadcn/ui Components**: Pre-built, accessible UI components reduce development time
- **TanStack Query**: Handles caching, synchronization, and background updates automatically
- **Wouter**: Lightweight routing solution suitable for smaller applications
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development

### Backend Architecture
The backend follows an Express.js server architecture with PostgreSQL database integration through Drizzle ORM. The server implements RESTful API endpoints with comprehensive middleware for authentication, rate limiting, and request logging.

Key backend decisions:
- **Express.js**: Mature, flexible framework for rapid API development
- **Drizzle ORM**: Type-safe database operations with excellent TypeScript integration
- **PostgreSQL with Neon**: Reliable relational database with serverless scaling capabilities
- **Session-based Authentication**: Uses Replit Auth for admin access with persistent sessions
- **Middleware Pipeline**: Centralized logging, error handling, and security measures

### Data Storage Solutions
The application uses PostgreSQL as the primary database with a well-structured schema supporting the voting system's requirements:

- **Posts Table**: Stores celebrity/character submissions with category classification and approval status
- **Actions Table**: Manages voting actions with approval workflow for custom suggestions  
- **Votes Table**: Tracks all votes with IP-based anonymous identification
- **Rate Limiting Table**: Implements IP-based rate limiting to prevent abuse
- **Sessions Table**: Required for Replit Auth integration

Schema design prioritizes:
- **Referential Integrity**: Foreign key relationships ensure data consistency
- **Scalability**: Indexed queries and efficient vote aggregation
- **Security**: Anonymous voting through IP tracking rather than user accounts

### Authentication and Authorization
The system implements a dual-access model:
- **Public Access**: Anonymous users can vote and submit posts without authentication
- **Admin Access**: Uses Replit's OpenID Connect integration for secure admin authentication
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Role-Based Access**: Admin flag in user table controls access to moderation features

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Google reCAPTCHA**: Bot protection for post submissions and voting actions
- **Replit Authentication**: OpenID Connect provider for admin login
- **Cloudinary**: Image hosting and processing (configured but using placeholders in development)

### Key Libraries and Frameworks
- **Database**: `drizzle-orm`, `@neondatabase/serverless` for database operations
- **UI Components**: `@radix-ui` component primitives, `class-variance-authority` for component variants
- **Form Handling**: `react-hook-form` with `@hookform/resolvers` for validation
- **HTTP Client**: `@tanstack/react-query` for API state management
- **Styling**: `tailwindcss`, `clsx` for dynamic class composition
- **Development**: `vite` for build tooling, `typescript` for type checking

### Security and Performance
- **Rate Limiting**: Custom middleware with PostgreSQL backing store
- **Image Upload**: Multer middleware with file type and size validation
- **CORS**: Configured for cross-origin requests in development
- **Session Security**: HTTP-only cookies with secure flags in production
- **Input Validation**: Zod schemas for request/response validation