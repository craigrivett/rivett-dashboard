// Vercel serverless function — proxies OpenClaw cron data
// Keeps gateway URL and token server-side, never exposed to browser

const https = require('https');
const http = require('http');

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://46.225.103.187:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Afrika Burn date
const AFRIKA_BURN_DATE = new Date('2026-04-27T00:00:00+02:00');

function fetchFromGateway(path) {
  return new Promise((resolve) => {
    const url = new URL(path, GATEWAY_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {}),
      },
      timeout: 8000,
    };
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(body), status: res.statusCode }); }
        catch { resolve({ ok: false, error: 'parse error', raw: body.slice(0, 200) }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Content-Type', 'application/json');

  try {
    const cronResult = await fetchFromGateway('/api/cron/jobs');
    const statusResult = await fetchFromGateway('/api/status');

    const now = new Date();
    const burnDays = Math.ceil((AFRIKA_BURN_DATE - now) / (1000 * 60 * 60 * 24));

    const payload = {
      generatedAt: now.toISOString(),
      generatedAtMs: now.getTime(),
      afrikaburn: {
        date: AFRIKA_BURN_DATE.toISOString(),
        daysRemaining: Math.max(0, burnDays),
      },
      cron: cronResult.ok ? cronResult.data : { jobs: [], error: cronResult.error },
      system: statusResult.ok ? statusResult.data : { error: statusResult.error },
      gatewayReachable: cronResult.ok,
    };

    res.status(200).json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message, jobs: [], gatewayReachable: false });
  }
};
