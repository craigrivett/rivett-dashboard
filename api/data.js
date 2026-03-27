const https = require('https');
const http = require('http');

const SHIM_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://46.225.103.187:19090';
const SHIM_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

function fetchShim() {
  return new Promise((resolve) => {
    const url = new URL('/data', SHIM_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname, port: url.port || 80,
      path: '/data', method: 'GET',
      headers: { 'Authorization': `Bearer ${SHIM_TOKEN}` },
      timeout: 12000,
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(body) }); }
        catch { resolve({ ok: false, error: 'parse error' }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'application/json');
  const result = await fetchShim();
  if (result.ok) {
    res.status(200).json(result.data);
  } else {
    res.status(200).json({ error: result.error, jobs: [], gatewayReachable: false, cron: { jobs: [] }, afrikaburn: { daysRemaining: Math.ceil((new Date('2026-04-27') - Date.now()) / 86400000) } });
  }
};
