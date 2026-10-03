const labels = { initializing: 'Iniciando', awaiting_qr: 'Aguardando leitura', authenticated: 'Autenticado', ready: 'Conectado', auth_failure: 'Falha de autenticação', disconnected: 'Desconectado', error: 'Falha na conexão', stopping: 'Encerrando' };
let busy = false;
async function refresh() {
  if (busy) return;
  busy = true;
  const qr = document.getElementById('qr');
  const placeholder = document.getElementById('placeholder');
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('Não foi possível consultar o painel.');
    const data = await response.json();
    document.getElementById('status').textContent = labels[data.connection] || data.connection;
    document.getElementById('total').textContent = data.conversations.total;
    document.getElementById('waiting').textContent = data.conversations.waitingForHuman;
    document.getElementById('site').href = data.siteUrl;
    qr.hidden = true;
    placeholder.hidden = false;
    document.getElementById('instructions').textContent = data.connection === 'ready' ? 'Tudo pronto. O atendimento automático está disponível.' : data.connection === 'awaiting_qr' ? 'Escaneie o código abaixo para conectar sua conta.' : 'Aguardando conexão. Em caso de falha, confira os logs e reinicie o serviço.';
    if (data.connection === 'awaiting_qr') {
      const result = await fetch('/api/qr');
      if (result.ok) { qr.src = (await result.json()).image; qr.hidden = false; placeholder.hidden = true; }
    }
    document.getElementById('error').textContent = '';
  } catch (error) {
    qr.hidden = true;
    placeholder.hidden = false;
    document.getElementById('status').textContent = 'Indisponível';
    document.getElementById('error').textContent = 'Não foi possível atualizar. Confira se o serviço está em execução.';
  } finally { busy = false; }
}
document.getElementById('refresh').addEventListener('click', refresh);
refresh();
setInterval(refresh, 10000);
