const { spawn } = require('child_process');
const fs = require('fs');

class BotMonitor {
    constructor() {
        this.botProcess = null;
        this.maxCpuUsage = 80; // Maximum CPU usage percentage
        this.checkInterval = 30000; // Check every 30 seconds
        this.restartDelay = 5000; // Wait 5 seconds before restart
        this.maxRestarts = 5; // Maximum restarts per hour
        this.restartCount = 0;
        this.lastRestartTime = 0;
        
        this.startBot();
        this.startMonitoring();
    }
    
    startBot() {
        console.log('🚀 Starting bot...');
        this.botProcess = spawn('node', ['bot.js'], {
            stdio: 'inherit',
            detached: false
        });
        
        this.botProcess.on('error', (error) => {
            console.error('❌ Bot process error:', error);
        });
        
        this.botProcess.on('exit', (code, signal) => {
            console.log(`📴 Bot process exited with code ${code} and signal ${signal}`);
            if (code !== 0) {
                this.restartBot();
            }
        });
    }
    
    async checkCpuUsage() {
        return new Promise((resolve) => {
            const ps = spawn('ps', ['-p', this.botProcess.pid, '-o', '%cpu', '--no-headers']);
            let output = '';
            
            ps.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ps.on('close', () => {
                const cpuUsage = parseFloat(output.trim()) || 0;
                resolve(cpuUsage);
            });
            
            ps.on('error', () => {
                resolve(0); // If we can't check, assume it's fine
            });
        });
    }
    
    async restartBot() {
        const now = Date.now();
        
        // Reset restart count if more than an hour has passed
        if (now - this.lastRestartTime > 3600000) {
            this.restartCount = 0;
        }
        
        if (this.restartCount >= this.maxRestarts) {
            console.error('❌ Maximum restart attempts reached. Stopping monitor.');
            process.exit(1);
        }
        
        console.log(`🔄 Restarting bot (attempt ${this.restartCount + 1}/${this.maxRestarts})...`);
        
        if (this.botProcess) {
            this.botProcess.kill('SIGTERM');
        }
        
        this.restartCount++;
        this.lastRestartTime = now;
        
        setTimeout(() => {
            this.startBot();
        }, this.restartDelay);
    }
    
    async startMonitoring() {
        setInterval(async () => {
            if (!this.botProcess || this.botProcess.killed) {
                return;
            }
            
            try {
                const cpuUsage = await this.checkCpuUsage();
                console.log(`📊 Current CPU usage: ${cpuUsage.toFixed(1)}%`);
                
                if (cpuUsage > this.maxCpuUsage) {
                    console.warn(`⚠️ High CPU usage detected: ${cpuUsage.toFixed(1)}% > ${this.maxCpuUsage}%`);
                    await this.restartBot();
                }
            } catch (error) {
                console.error('❌ Error checking CPU usage:', error);
            }
        }, this.checkInterval);
    }
}

// Start the monitor
console.log('🔍 Starting bot monitor...');
new BotMonitor();

// Handle process termination
process.on('SIGINT', () => {
    console.log('🛑 Shutting down monitor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down monitor...');
    process.exit(0);
}); 