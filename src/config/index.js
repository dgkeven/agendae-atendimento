const path = require('node:path');

function loadConfig(env = process.env) {
  const port = Number(env.PORT || 5002);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve estar entre 1 e 65535.');
  const siteUrl = env.AGENDAE_SITE_URL || 'https://agendaê.app';
  const parsed = new URL(siteUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('AGENDAE_SITE_URL deve ser HTTP ou HTTPS.');
  const host = env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !env.ADMIN_TOKEN) {
    throw new Error('Configure ADMIN_TOKEN para expor o painel fora do computador local.');
  }
  return {
    port, host, siteUrl, adminToken: env.ADMIN_TOKEN || '',
    dataDir: path.resolve(env.DATA_DIR || 'data'),
    authDir: path.resolve(env.WHATSAPP_AUTH_DIR || '.wwebjs_auth'),
    browserPath: env.CHROME_EXECUTABLE_PATH || undefined,
    disableSandbox: env.CHROME_NO_SANDBOX === 'true',
  };
}
module.exports = { loadConfig };
