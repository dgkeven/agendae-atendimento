function normalize(text) {
  return String(text || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function menu(siteUrl) {
  return `Olá! 👋 Você está no atendimento da *Agendaê*.
Como podemos ajudar?

1 • Conhecer a Agendaê
2 • Planos e contratação
3 • Suporte técnico
4 • Falar com a equipe
5 • Acessar o site

${siteUrl}
Digite *menu* para voltar ou *encerrar* para finalizar.`;
}
function transition(session, body, siteUrl) {
  const text = normalize(body);
  // Apenas a equipe pode devolver uma conversa manual ao bot.
  if (session?.stage === 'manual') return null;
  if (['encerrar', 'cancelar', 'sair'].includes(text)) {
    return { session: null, reply: 'Atendimento automático encerrado. Obrigado por falar com a Agendaê! Envie uma nova mensagem quando precisar.' };
  }
  if (text === 'menu') return { session: { stage: 'menu' }, reply: menu(siteUrl) };
  if (session && ['sales', 'support', 'human'].includes(session.stage)) {
    if (!text) return { session, reply: 'Envie uma breve descrição em texto para encaminharmos à equipe.' };
    return {
      session: { stage: 'manual', topic: session.stage, request: String(body).trim().slice(0, 2000) },
      reply: 'Recebemos sua mensagem. A conversa ficou aguardando a equipe da Agendaê, que continuará o atendimento por aqui. Não envie senhas ou códigos de acesso.',
    };
  }
  switch (text) {
    case '1':
      return { session: { stage: 'menu' }, reply: `Conheça a Agendaê pelo site oficial: ${siteUrl}\n\nPara conversar sobre como a plataforma pode atender seu negócio, digite *2*. Para outras opções, digite *menu*.` };
    case '2':
      return { session: { stage: 'sales' }, reply: 'Vamos ajudar você a conhecer os planos da Agendaê! Conte seu nome, o tipo de negócio e o que procura na plataforma. A equipe dará continuidade com as condições de contratação.' };
    case '3':
      return { session: { stage: 'support' }, reply: 'Conte o que aconteceu e em qual parte da plataforma precisa de ajuda. Se houver uma mensagem de erro, transcreva aqui. Não envie senhas, códigos de acesso ou dados dos seus clientes.' };
    case '4':
      return { session: { stage: 'human' }, reply: 'Claro! Escreva seu nome e um breve resumo do assunto para encaminharmos o atendimento à equipe da Agendaê.' };
    case '5':
      return { session: { stage: 'menu' }, reply: `Acesse a Agendaê: ${siteUrl}\n\nPrecisa de ajuda? Digite *3* para suporte ou *menu* para ver as opções.` };
    default:
      return { session: { stage: 'menu' }, reply: session ? `Não reconheci essa opção.\n\n${menu(siteUrl)}` : menu(siteUrl) };
  }
}
module.exports = { transition, normalize };
