const CRON_SECRET = process.env.CRON_SECRET || 'cron_secret_key_2024';
const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'https://aiobserver.replit.app';

async function checkPendingEmails() {
  try {
    const res = await fetch(`${BASE_URL}/api/cron/send-emails?secret=${CRON_SECRET}`);
    const data = await res.json();
    if (data.sent > 0 || data.failed > 0) {
      console.log(`[Email Cron] Processed: ${data.processed}, Sent: ${data.sent}, Failed: ${data.failed}`);
    }
  } catch (err) {
    console.error('[Email Cron] Error:', err.message);
  }
}

console.log('[Email Cron] Started - checking every 60 seconds');
checkPendingEmails();
setInterval(checkPendingEmails, 60000);
