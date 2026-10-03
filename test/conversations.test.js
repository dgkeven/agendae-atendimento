const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { transition } = require('../src/conversations/flow');
const { ConversationStore } = require('../src/conversations/store');
const { ConversationService } = require('../src/conversations/service');
const { loadConfig } = require('../src/config');
const site = 'https://example.com';
async function fixture(t, send = async () => {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agendae-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new ConversationStore(dir);
  await store.load();
  return { store, dir, service: new ConversationService({ store, siteUrl: site, send }) };
}
test('vendas e suporte encaminham a descrição original para atendimento humano', () => {
  for (const option of ['2', '3', '4']) {
    const initial = transition(null, option, site);
    const result = transition(initial.session, 'Sou Ana, preciso de ajuda', site);
    assert.equal(result.session.stage, 'manual');
    assert.equal(result.session.request, 'Sou Ana, preciso de ajuda');
    assert.equal(transition(result.session, 'menu', site), null);
    assert.equal(transition(result.session, 'encerrar', site), null);
  }
});
test('menu, cancelamento e opção inválida têm respostas utilizáveis', () => {
  assert.match(transition(null, 'oi', site).reply, /Agendaê/);
  assert.match(transition({ stage: 'menu' }, 'xyz', site).reply, /Não reconheci/);
  assert.equal(transition({ stage: 'support' }, 'MENU', site).session.stage, 'menu');
  assert.equal(transition({ stage: 'menu' }, 'cancelar', site).session, null);
});
test('mensagens concorrentes são ordenadas e IDs repetidos não respondem duas vezes', async t => {
  const sent = [];
  const { store, service } = await fixture(t, async (id, body) => sent.push(body));
  await Promise.all([service.receive('a', '3', '1'), service.receive('a', 'Erro ao acessar', '2'), service.receive('a', 'Erro ao acessar', '2')]);
  assert.equal(sent.length, 2);
  assert.equal(store.get('a').stage, 'manual');
  assert.equal(store.get('a').request, 'Erro ao acessar');
});
test('respostas do bot não pausam o atendimento; comandos da equipe controlam modo manual', async t => {
  const { service, store } = await fixture(t);
  await service.receive('a', 'oi', '1');
  await service.owner('a', 'Olá! Você está no atendimento da Agendaê.');
  assert.equal(store.get('a').stage, 'menu');
  await service.owner('a', '/manual');
  assert.equal(store.get('a').stage, 'manual');
  await service.owner('a', '/automático');
  assert.equal(store.get('a'), undefined);
});
test('falha no envio restaura o estado e permite nova tentativa', async t => {
  let fail = true;
  const { service, store } = await fixture(t, async () => { if (fail) throw new Error('offline'); });
  await assert.rejects(service.receive('a', '3', '1'), /offline/);
  assert.equal(store.get('a'), undefined);
  fail = false;
  await service.receive('a', '3', '1');
  assert.equal(store.get('a').stage, 'support');
});
test('persistência restaura o atendimento humano após reinício', async t => {
  const { store, dir } = await fixture(t);
  await Promise.all([store.set('a', { stage: 'manual' }), store.set('b', { stage: 'support' })]);
  const restored = new ConversationStore(dir);
  await restored.load();
  assert.equal(restored.get('a').stage, 'manual');
  assert.equal(restored.get('b').stage, 'support');
});
test('arquivo corrompido é preservado e interrompe a inicialização', async t => {
  const { dir } = await fixture(t);
  await fs.writeFile(path.join(dir, 'conversations.json'), '{invalid');
  await assert.rejects(new ConversationStore(dir).load());
  assert.equal(await fs.readFile(path.join(dir, 'conversations.json'), 'utf8'), '{invalid');
});
test('configuração impede exposição sem autenticação e URL inválida', () => {
  assert.throws(() => loadConfig({ HOST: '0.0.0.0' }), /ADMIN_TOKEN/);
  assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
  assert.throws(() => loadConfig({ AGENDAE_SITE_URL: 'javascript:alert(1)' }), /HTTP/);
  assert.equal(loadConfig({}).host, '127.0.0.1');
});
