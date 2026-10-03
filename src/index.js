const fs = require('node:fs');
if (fs.existsSync('.env')) process.loadEnvFile('.env');
const { loadConfig } = require('./config');
const { ConversationStore } = require('./conversations/store');
const { ConversationService } = require('./conversations/service');
const { createClient, bindClient } = require('./whatsapp/client');
const { createApp } = require('./http/app');
async function main() {
  const config = loadConfig();
  const store = new ConversationStore(config.dataDir);
  await store.load();
  const status = { connection: 'initializing', qr: null, stopping: false };
  const client = createClient(config);
  const service = new ConversationService({ store, siteUrl: config.siteUrl, send: (id, text) => client.sendMessage(id, text) });
  bindClient(client, service, status);
  const app = createApp({ config, status, store });
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(config.port, config.host, error => error ? reject(error) : resolve(listener));
    listener.once('error', reject);
  });
  console.log(`Painel Agendaê: http://${config.host}:${config.port}`);
  const shutdown = async () => {
    if (status.stopping) return;
    status.stopping = true;
    status.connection = 'stopping';
    status.qr = null;
    const timeout = setTimeout(() => process.exit(1), 15000);
    timeout.unref();
    try {
      await new Promise(resolve => server.close(resolve));
      await service.drain();
      await store.flush();
      await client.destroy();
      clearTimeout(timeout);
    } catch (error) { console.error('Falha ao encerrar:', error.message); process.exitCode = 1; }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  client.initialize().catch(error => {
    status.connection = 'error';
    status.qr = null;
    console.error('Falha ao conectar ao WhatsApp. Corrija a configuração e reinicie:', error.message);
  });
}
main().catch(error => { console.error('Falha ao iniciar Agendaê:', error.message); process.exitCode = 1; });
