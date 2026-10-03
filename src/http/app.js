const express = require('express');
const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');
const qrcode = require('qrcode');
function createApp({ config, status, store }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'" });
    next();
  });
  app.get('/health', (req, res) => res.status(status.connection === 'ready' ? 200 : 503).json({ connection: status.connection }));
  app.use((req, res, next) => {
    if (!config.adminToken) return next();
    const credentials = Buffer.from((req.headers.authorization || '').replace(/^Basic /, ''), 'base64').toString();
    const supplied = Buffer.from(credentials.slice(credentials.indexOf(':') + 1));
    const expected = Buffer.from(config.adminToken);
    if (req.headers.authorization?.startsWith('Basic ') && supplied.length === expected.length && timingSafeEqual(supplied, expected)) return next();
    res.set('WWW-Authenticate', 'Basic realm="Agendae"').status(401).send('Autenticação necessária.');
  });
  app.get('/api/status', (req, res) => res.json({ connection: status.connection, conversations: store.summary(), siteUrl: config.siteUrl }));
  app.get('/api/qr', async (req, res, next) => {
    try {
      if (!status.qr) return res.status(404).json({ error: 'Nenhum QR Code disponível.' });
      res.json({ image: await qrcode.toDataURL(status.qr, { width: 300, margin: 2 }) });
    } catch (error) { next(error); }
  });
  app.get('/qrcode', (req, res) => res.redirect('/'));
  app.use(express.static(path.resolve(__dirname, '../../public')));
  app.use((error, req, res, next) => {
    console.error('Falha no painel:', error.message);
    res.status(500).json({ error: 'Não foi possível concluir a solicitação.' });
  });
  return app;
}
module.exports = { createApp };
