const http = require('http');

const SHIM_HOST = '46.225.103.187';
const SHIM_PORT = 19090;
const SHIM_TOKEN = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();

function fetchShim(path) {
  return new Promise((resolve) => {
    try {
      const req = http.request({
        hostname: SHIM_HOST, port: SHIM_PORT, path, method: 'GET',
        headers: /^[a-zA-Z0-9_\-]+$/.test(SHIM_TOKEN) ? { 'Authorization': 'Bearer ' + SHIM_TOKEN } : {},
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => { try { resolve({ ok: true, data: JSON.parse(body) }); } catch { resolve({ ok: false }); } });
      });
      req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.on('error', e => resolve({ ok: false, error: e.message }));
      req.end();
    } catch(e) { resolve({ ok: false, error: e.message }); }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'application/json');
  const result = await fetchShim('/greg-data');
  if (result.ok) {
    res.end(JSON.stringify(result.data));
  } else {
    res.status(404).end(JSON.stringify({ error: 'no data yet', stale: true }));
  }
};
