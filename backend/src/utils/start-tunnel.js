import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ngrok from '@ngrok/ngrok';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Force DNS resolution to prefer IPv4
dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Attempts to locate and parse the ngrok authtoken from env or local config files
 */
function getNgrokToken() {
  if (process.env.NGROK_AUTHTOKEN) {
    return process.env.NGROK_AUTHTOKEN;
  }
  try {
    const configPath = path.join(os.homedir(), '.config', 'ngrok', 'ngrok.yml');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/authtoken:\s*["']?([a-zA-Z0-9_-]+)["']?/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Ignore error
  }
  try {
    const configPath = path.join(os.homedir(), '.ngrok2', 'ngrok.yml');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/authtoken:\s*["']?([a-zA-Z0-9_-]+)["']?/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

async function start() {
  const token = getNgrokToken();
  console.log(`Starting ngrok tunnel on port ${PORT}...`);
  if (token) {
    console.log(`Using detected authtoken: ${token.slice(0, 5)}...`);
  } else {
    console.warn(`⚠️ No authtoken detected. ngrok sessions require authentication.`);
  }

  let listener;
  try {
    listener = await ngrok.forward({
      addr: PORT,
      authtoken: token || undefined,
    });
    
    const url = listener.url();
    console.log(`🚀 ngrok tunnel is active!`);
    console.log(`Public URL: ${url}`);

    // Register webhook with Telegram using system curl to bypass Node DNS resolution bugs
    const webhookUrl = `${url}/api/telegram/callback`;
    console.log(`Registering webhook with Telegram...`);
    
    const { spawnSync } = await import('node:child_process');
    const payload = JSON.stringify({
      url: webhookUrl,
      secret_token: SECRET_TOKEN || undefined,
    });

    const result = spawnSync('curl', [
      '-s',
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-d', payload,
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    ]);
    
    if (result.error) {
      throw result.error;
    }

    const json = JSON.parse(result.stdout.toString());
    if (json.ok) {
      console.log('✅ Webhook successfully registered with Telegram!');
      console.log('Telegram response:', json.description);
    } else {
      console.error('❌ Failed to register webhook.');
      console.error('Telegram response:', json);
    }

    console.log('\nKeep this process running to maintain the tunnel.');
    console.log('Press Ctrl+C to terminate.');

    // Keep the process alive by registering an active timer
    const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

    // Handle termination gracefully
    process.on('SIGINT', async () => {
      console.log('\nStopping ngrok tunnel...');
      clearInterval(keepAlive);
      if (listener) {
        await listener.close().catch(() => {});
      }
      process.exit(0);
    });
  } catch (err) {
    console.error('Error starting tunnel:', err.message);
    process.exit(1);
  }
}

start();
