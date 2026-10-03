const { transition, normalize } = require('./flow');

class ConversationService {
  constructor({ store, siteUrl, send }) {
    this.store = store;
    this.siteUrl = siteUrl;
    this.send = send;
    this.queues = new Map();
    this.processed = new Map();
  }
  enqueue(chatId, task) {
    const job = (this.queues.get(chatId) || Promise.resolve()).catch(() => {}).then(task);
    this.queues.set(chatId, job);
    const clean = () => { if (this.queues.get(chatId) === job) this.queues.delete(chatId); };
    job.then(clean, clean);
    return job;
  }
  receive(chatId, body, messageId) {
    return this.enqueue(chatId, async () => {
      const now = Date.now();
      for (const [id, time] of this.processed) if (now - time > 300_000) this.processed.delete(id);
      if (messageId && this.processed.has(messageId)) return;
      const result = transition(this.store.get(chatId), body, this.siteUrl);
      if (!result) return;
      const previous = this.store.get(chatId);
      await this.store.set(chatId, result.session);
      try {
        await this.send(chatId, result.reply);
      } catch (error) {
        await this.store.set(chatId, previous);
        throw error;
      }
      if (messageId) this.processed.set(messageId, now);
    });
  }
  owner(chatId, body) {
    const command = normalize(body);
    if (!['/manual', '/automatico', '/encerrar'].includes(command)) return Promise.resolve();
    return this.enqueue(chatId, () => this.store.set(chatId,
      command === '/manual' ? { ...this.store.get(chatId), stage: 'manual' } : null));
  }
  async drain() { await Promise.allSettled([...this.queues.values()]); }
}
module.exports = { ConversationService };
