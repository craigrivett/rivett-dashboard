const https = require('https');
const http = require('http');

const SHIM_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://46.225.103.187:19090';
const SHIM_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

function fetchShim() {
  return new Promise((resolve) => {
    try {
      const url = new URL('/data', SHIM_URL);
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: url.hostname,
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        path: '/data',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SHIM_TOKEN}` },
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try { resolve({ ok: true, data: JSON.parse(body) }); }
          catch(e) { resolve({ ok: false, error: 'parse: ' + e.message, raw: body.slice(0,100) }); }
        });
      });
      req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.on('error', e => resolve({ ok: false, error: e.message }));
      req.end();
    } catch(e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Content-Type', 'application/json');
  
  const result = await fetchShim();
  const burnDays = Math.max(0, Math.ceil((new Date('2026-04-27') - Date.now()) / 86400000));
  
  if (result.ok) {
    res.end(JSON.stringify({ ...result.data, _shimOk: true }));
  } else {
    res.end(JSON.stringify({
      error: result.error,
      gatewayReachable: false,
      cron: { jobs: [] },
      afrikaburn: { daysRemaining: burnDays },
      generatedAt: new Date().toISOString(),
    }));
  }
};
