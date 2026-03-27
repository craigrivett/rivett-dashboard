const http = require('http');

const SHIM_HOST = '46.225.103.187';
const SHIM_PORT = 19090;
const SHIM_TOKEN = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();

function fetchShim() {
  return new Promise((resolve) => {
    try {
      const options = {
        hostname: SHIM_HOST,
        port: SHIM_PORT,
        path: '/data',
        method: 'GET',
        headers: {},
      };
      // Only add auth header if token is a clean ASCII string
      if (SHIM_TOKEN && /^[a-zA-Z0-9_\-]+$/.test(SHIM_TOKEN)) {
        options.headers['Authorization'] = 'Bearer ' + SHIM_TOKEN;
      }
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try { resolve({ ok: true, data: JSON.parse(body) }); }
          catch(e) { resolve({ ok: false, error: 'parse error: ' + body.slice(0,100) }); }
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
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'application/json');
  const result = await fetchShim();
  const burnDays = Math.max(0, Math.ceil((new Date('2026-04-27') - Date.now()) / 86400000));
  if (result.ok) {
    res.end(JSON.stringify(result.data));
  } else {
    res.end(JSON.stringify({
      error: result.error, gatewayReachable: false,
      cron: { jobs: [] }, afrikaburn: { daysRemaining: burnDays },
      generatedAt: new Date().toISOString(),
    }));
  }
};
