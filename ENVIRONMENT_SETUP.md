# Environment Setup Guide

## Environment Variables Configuration

This project uses environment variables for configuration. The following files are used:

- `.env` - Local development environment variables (not committed to git)
- `.env.example` - Example environment variables for reference

### Required Environment Variables

1. **PORT** - The port the server will run on (default: 5000)
2. **DATABASE_URL** - PostgreSQL connection string
3. **SESSION_SECRET** - Secret key for session encryption

### Setting Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual values:
   ```bash
   # Server Configuration
   PORT=5001  # Change if port 5000 is busy
   NODE_ENV=development
   
   # Database Configuration - Update with your actual database credentials
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/your_database
   
   # Session Configuration - Generate a strong random secret
   SESSION_SECRET=generate-a-random-secret-here
   ```

### Resolving Port 5000 Conflict

The error `EADDRINUSE: address already in use :::5000` means port 5000 is already occupied.

#### Option 1: Change the PORT in .env file
Edit your `.env` file and change:
```
PORT=5001  # or any other available port
```

#### Option 2: Find and kill the process using port 5000

**On Windows:**
```bash
# Find the process ID using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**On macOS/Linux:**
```bash
# Find the process ID using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Database Setup

1. Make sure PostgreSQL is installed and running
2. Create a database for the application:
   ```sql
   CREATE DATABASE celebrity_voting_db;
   ```
3. Update the `DATABASE_URL` in your `.env` file with your actual credentials

### Running the Application

After setting up environment variables:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or run with a specific port
PORT=5001 npm run dev
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 5000 | Yes |
| NODE_ENV | Environment mode | development | Yes |
| DATABASE_URL | PostgreSQL connection string | - | Yes |
| SESSION_SECRET | Session encryption secret | - | Yes |
| VITE_API_BASE_URL | API base URL for client | http://localhost:5000/api | No |
| GOOGLE_CLIENT_ID | Google OAuth client ID | - | No |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | - | No |
| MAX_FILE_SIZE | Maximum file upload size | 10485760 (10MB) | No |
| UPLOAD_PATH | File upload directory | ./uploads | No |

### Security Notes

- Never commit `.env` files to version control
- Use different secrets for development and production
- For production, set environment variables directly on your hosting platform
- Generate strong random secrets for SESSION_SECRET
