# Environment Configuration - Complete Setup

## Files Created/Updated

1. **`.env.example`** - Template with all environment variables documented
2. **`.env`** - Your local development environment variables (edit this file)
3. **`.gitignore`** - Updated to exclude .env files from version control
4. **`ENVIRONMENT_SETUP.md`** - Comprehensive setup guide
5. **`PORT_CONFLICT_SOLUTION.md`** - Solutions for port 5000 conflict
6. **`scripts/port-check.js`** - Utility script to check port usage
7. **`package.json`** - Added port checking scripts

## Key Environment Variables

### Required Variables (must be set in .env):
- `PORT=5000` - Server port (change if 5000 is busy)
- `DATABASE_URL=postgresql://...` - Your PostgreSQL connection string
- `SESSION_SECRET=...` - Random secret for session encryption
- `NODE_ENV=development` - Environment mode

### Optional Variables:
- `VITE_API_BASE_URL=http://localhost:5000/api` - Client API URL
- `GOOGLE_CLIENT_ID` - For OAuth authentication
- `GOOGLE_CLIENT_SECRET` - For OAuth authentication
- `MAX_FILE_SIZE=10485760` - 10MB file upload limit
- `UPLOAD_PATH=./uploads` - File upload directory

## Immediate Action Required

1. **Edit your `.env` file** and update these values:
   - Change `PORT=5000` to `PORT=5001` (or another available port)
   - Update `DATABASE_URL` with your actual PostgreSQL credentials
   - Set a strong random `SESSION_SECRET`

2. **Run the application**:
   ```bash
   npm run dev
   ```

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Check port usage
npm run port:check
npm run port:check 5001  # Check specific port

# Database migrations
npm run db:push
```

## Security Notes

- 🔒 Never commit `.env` files to git
- 🔑 Use different secrets for development vs production
- 🌐 For production, set environment variables on your hosting platform
- 🔄 Generate strong random values for SESSION_SECRET

## Troubleshooting

### Port 5000 Already in Use
- Edit `.env` and change `PORT=5000` to `PORT=5001`
- Or kill the process using port 5000 (see PORT_CONFLICT_SOLUTION.md)

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format in `.env`
- Ensure database exists

### Session Issues
- Set a strong, random `SESSION_SECRET` in `.env`

## Next Steps

1. Update your `.env` file with actual values
2. Ensure PostgreSQL is running and database exists
3. Run `npm run dev` to start the development server
4. If you encounter port conflicts, use `PORT=5001` or check PORT_CONFLICT_SOLUTION.md
