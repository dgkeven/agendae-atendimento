# Agendaê · Central de atendimento

Bot de WhatsApp para atender clientes da **plataforma Agendaê**: apresentação, interesse comercial, suporte e encaminhamento para a equipe. Inclui um painel local com status da conexão, QR Code e contagem de conversas.

## Começar

Requer Node.js 22.16+ e uma conta de WhatsApp para conectar. O Puppeteer instala um navegador durante a instalação das dependências.

```sh
npm ci
cp .env.example .env
npm start
```

Abra http://127.0.0.1:5002 e escaneie o QR Code em **WhatsApp → Dispositivos conectados**. A sessão fica salva em `.wwebjs_auth/`. `npm run dev` reinicia o processo quando arquivos são alterados.

Confirme `AGENDAE_SITE_URL` antes de usar em produção. O endereço informado (`https://agendaê.app`) foi mantido como padrão, mas não foi possível verificar o site durante a implementação. Textos comerciais não presumem preços, planos ou funcionalidades não confirmados.

## Atendimento

- **1 — Conhecer a Agendaê:** direciona para o site e atendimento comercial.
- **2 — Planos e contratação:** solicita nome, tipo de negócio e necessidade.
- **3 — Suporte técnico:** solicita descrição do problema, sem senhas ou dados de clientes.
- **4 — Falar com a equipe:** solicita nome e assunto.
- **5 — Site:** fornece o link configurado.

Após receber a descrição nas opções 2, 3 ou 4, o bot salva o resumo e coloca a conversa em modo humano. A equipe continua pelo próprio WhatsApp conectado. O encaminhamento é uma mudança local de estado: não abre tickets nem notifica outro número ou serviço.

O cliente pode enviar `menu`, `encerrar` ou `cancelar` durante o atendimento automático. No modo humano, mensagens do cliente não reativam o bot.

### Comandos da equipe

Envie os comandos **pela conta conectada**, diretamente na conversa:

- `/manual`: pausa a automação para esse contato, inclusive antes de responder pessoalmente.
- `/automatico` ou `/encerrar`: limpa o estado; a próxima mensagem do cliente inicia o fluxo automático.

Mensagens comuns da equipe não alteram o estado. Os comandos aparecem na conversa do WhatsApp. Grupos, status, transmissões e mensagens não textuais são ignorados; peça que o cliente descreva o problema em texto.

## Estrutura

```text
src/
  config/           Leitura e validação das variáveis de ambiente
  conversations/    Fluxo, fila por contato e persistência
  whatsapp/         Cliente e eventos do WhatsApp
  http/             API e painel administrativo
  index.js          Inicialização e encerramento
public/             Interface do painel, sem etapa de build
test/               Testes automatizados
chatbot.js          Entrada compatível com o comando antigo
```

## Configuração e operação

Veja `.env.example`. O painel usa `127.0.0.1:5002` por padrão. Para expor na rede, configure `HOST` e um `ADMIN_TOKEN` forte. O navegador pedirá autenticação Basic: use qualquer usuário e o token como senha. Utilize HTTPS no proxy reverso. `/health` é público e retorna 200 quando conectado ou 503 nos demais estados; o painel e as demais rotas exigem autenticação quando o token estiver definido.

`CHROME_EXECUTABLE_PATH` permite usar um Chrome já instalado. O sandbox do navegador fica habilitado; `CHROME_NO_SANDBOX=true` é uma opção explícita para ambientes que a exijam.

O estado é gravado em `data/conversations.json`, com escrita em arquivo temporário e substituição atômica. Um arquivo inválido interrompe a inicialização para evitar perda silenciosa. Os resumos de suporte persistem até a conversa ser encerrada pela equipe. Proteja os diretórios `data/` e `.wwebjs_auth/` e seus backups; não os versione. O bot deve rodar em **uma única instância por sessão/diretório**. Deduplicação dura cinco minutos em memória; não garante entrega exatamente uma vez após falhas ou reinícios.

Em desconexão ou falha de autenticação, confira os logs e reinicie o processo; o painel exibe o estado. `SIGINT` e `SIGTERM` aguardam o processamento em andamento e encerram o navegador. Não há reconexão automática nesta versão.

### Migração do bot jurídico

Pare a versão anterior antes de iniciar esta. `chatbot.js` continua funcionando como entrada, e o diretório padrão de autenticação foi preservado. O antigo `sessions.json` não é importado: seus estados jurídicos são incompatíveis com os novos fluxos. Preserve um backup se necessário. Os comandos antigos sem `/` foram substituídos pelos comandos explícitos acima.

## Verificação

```sh
npm test
npm run check
```

Os testes cobrem encaminhamento humano, comandos, concorrência, deduplicação, recuperação de falhas e persistência. A conexão real exige leitura do QR Code e validação manual com a conta de WhatsApp.

Não há integração com uma API da Agendaê: o bot atende clientes da plataforma e encaminha solicitações à equipe. Ele não consulta contas nem cria agendamentos.

Licença MIT — consulte `LICENSE`.
