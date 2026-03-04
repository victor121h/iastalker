const CRON_SECRET = process.env.CRON_SECRET || 'cron_secret_key_2024';

function getBaseUrl() {
  if (process.env.REPLIT_DEPLOYMENT === '1') {
    return 'https://aiobserver.replit.app';
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://0.0.0.0:3000';
}

const BASE_URL = getBaseUrl();

async function checkPendingEmails() {
  try {
    const res = await fetch(`${BASE_URL}/api/cron/send-emails?secret=${CRON_SECRET}`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[Email Cron] Non-JSON response from', `${BASE_URL}/api/cron/send-emails`);
      return;
    }
    if (data.sent > 0 || data.failed > 0) {
      console.log(`[Email Cron] Processed: ${data.processed}, Sent: ${data.sent}, Failed: ${data.failed}`);
    }
  } catch (err) {
    console.error('[Email Cron] Error:', err.message);
  }
}

console.log(`[Email Cron] Started - checking every 60 seconds (URL: ${BASE_URL})`);
checkPendingEmails();
setInterval(checkPendingEmails, 60000);
