#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkPort(port) {
  try {
    console.log(`Checking for processes using port ${port}...`);
    
    // Windows command
    if (process.platform === 'win32') {
      try {
        // Use PowerShell command for better compatibility
        const { stdout } = await execAsync(`Get-NetTCPConnection -LocalPort ${port} | Select-Object LocalAddress, LocalPort, State, OwningProcess`, { shell: 'powershell.exe' });
        
        if (stdout.trim() && !stdout.includes('No matching')) {
          console.log('Processes found:');
          console.log(stdout);
          
          const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.includes('LocalAddress'));
          const pids = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1]; // PID is the last column
          }).filter(pid => pid && pid !== '0');
          
          if (pids.length > 0) {
            console.log('\nTo kill these processes, run:');
            pids.forEach(pid => {
              console.log(`taskkill /PID ${pid} /F`);
            });
          }
        } else {
          console.log(`No processes found using port ${port}`);
        }
      } catch (psError) {
        // Fallback to netstat if PowerShell fails
        try {
          const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
          if (stdout.trim()) {
            console.log('Processes found:');
            console.log(stdout);
            
            const lines = stdout.trim().split('\n');
            const pids = lines.map(line => {
              const parts = line.trim().split(/\s+/);
              return parts[parts.length - 1];
            }).filter(pid => pid && pid !== '0');
            
            if (pids.length > 0) {
              console.log('\nTo kill these processes, run:');
              pids.forEach(pid => {
                console.log(`taskkill /PID ${pid} /F`);
              });
            }
          } else {
            console.log(`No processes found using port ${port}`);
          }
        } catch (netstatError) {
          console.log('Could not check port using netstat. You may need to run this in Command Prompt instead of PowerShell.');
        }
      }
    } else {
      // Unix-based systems (macOS/Linux)
      try {
        const { stdout } = await execAsync(`lsof -i :${port}`);
        console.log('Processes found:');
        console.log(stdout);
        
        const lines = stdout.trim().split('\n').slice(1); // Skip header
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[1]; // PID is typically the second column
        }).filter(pid => pid);
        
        if (pids.length > 0) {
          console.log('\nTo kill these processes, run:');
          pids.forEach(pid => {
            console.log(`kill -9 ${pid}`);
          });
        }
      } catch (error) {
        if (error.stderr && error.stderr.includes('command not found')) {
          console.log('lsof command not found. Try installing it or use:');
          console.log(`sudo netstat -tulpn | grep :${port}`);
        } else if (error.stderr && error.stderr.includes('No such file or directory')) {
          console.log(`No processes found using port ${port}`);
        } else {
          console.log(`No processes found using port ${port}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking port:', error.message);
  }
}

// Get port from command line argument or use default 5000
const port = process.argv[2] || 5000;

checkPort(port).then(() => {
  console.log(`\nAlternative: You can also change the PORT in your .env file`);
  console.log(`to use a different port (e.g., 5001, 5002, etc.)`);
});
