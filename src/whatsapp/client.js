const { Client, LocalAuth } = require('whatsapp-web.js');
function createClient(config) {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: config.authDir }),
    puppeteer: {
      headless: true,
      executablePath: config.browserPath,
      args: config.disableSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    },
  });
}
function directChat(id) { return typeof id === 'string' && /@(c\.us|lid)$/.test(id); }
function bindClient(client, service, status) {
  const onError = error => console.error('Falha no processamento de mensagem:', error.message);
  client.on('qr', qr => { status.qr = qr; status.connection = 'awaiting_qr'; });
  client.on('authenticated', () => { status.qr = null; status.connection = 'authenticated'; });
  client.on('ready', () => { status.qr = null; status.connection = 'ready'; console.log('Agendaê conectada ao WhatsApp.'); });
  client.on('auth_failure', () => { status.qr = null; status.connection = 'auth_failure'; });
  client.on('disconnected', () => { status.qr = null; status.connection = 'disconnected'; });
  client.on('message', msg => {
    if (status.stopping || msg.fromMe || !directChat(msg.from) || msg.type !== 'chat') return;
    service.receive(msg.from, msg.body, msg.id?._serialized).catch(onError);
  });
  client.on('message_create', msg => {
    if (!status.stopping && msg.fromMe && directChat(msg.to)) service.owner(msg.to, msg.body).catch(onError);
  });
}
module.exports = { createClient, bindClient, directChat };
