# Port 5000 Conflict Solution

## Problem
Your application is failing to start because port 5000 is already in use by another process.

## Solution Options

### Option 1: Change the PORT in your .env file (Recommended)

1. Open your `.env` file in a text editor
2. Change the PORT value from 5000 to an available port (e.g., 5001, 5002, 5003, etc.)
3. Save the file

Example change:
```
# Before
PORT=5000

# After  
PORT=5001
```

### Option 2: Find and kill the process using port 5000

**Using Command Prompt (not PowerShell):**
1. Open Command Prompt as Administrator
2. Run: `netstat -ano | findstr :5000`
3. Note the PID (Process ID) from the output
4. Run: `taskkill /PID <PID> /F` (replace <PID> with the actual process ID)

**Using PowerShell:**
1. Open PowerShell as Administrator
2. Run: `Get-NetTCPConnection -LocalPort 5000`
3. Note the OwningProcess (PID)
4. Run: `Stop-Process -Id <PID> -Force` (replace <PID> with the actual process ID)

### Option 3: Use a different terminal

Try running the application in Command Prompt instead of PowerShell, as some port checking commands work better there.

## Quick Fix

The easiest solution is to edit your `.env` file and change:
```
PORT=5000
```
to
```
PORT=5001
```

Then try running `npm run dev` again.

## Verification

After making changes, you can test if the port is available by running:
```bash
npm run port:check 5001
```

This will check if port 5001 (or whatever port you choose) is available.
