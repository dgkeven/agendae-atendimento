const fs = require('node:fs/promises');
const path = require('node:path');

class ConversationStore {
  constructor(directory) {
    this.file = path.join(directory, 'conversations.json');
    this.sessions = new Map();
    this.pending = Promise.resolve();
  }
  async load() {
    await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    try {
      const data = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.sessions)) throw new Error('Formato de sessões inválido.');
      for (const entry of data.sessions) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string' ||
          !entry[1] || !['menu', 'sales', 'support', 'human', 'manual'].includes(entry[1].stage)) {
          throw new Error('Sessão inválida; arquivo preservado para recuperação.');
        }
      }
      this.sessions = new Map(data.sessions);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  get(id) { return this.sessions.get(id); }
  async set(id, value) {
    if (value) this.sessions.set(id, { ...value, updatedAt: new Date().toISOString() });
    else this.sessions.delete(id);
    const snapshot = JSON.stringify({ version: 1, sessions: [...this.sessions] }, null, 2);
    const operation = this.pending.then(async () => {
      await fs.writeFile(`${this.file}.tmp`, snapshot, { mode: 0o600 });
      await fs.rename(`${this.file}.tmp`, this.file);
    });
    this.pending = operation.catch(() => {});
    return operation;
  }
  summary() {
    return { total: this.sessions.size, waitingForHuman: [...this.sessions.values()].filter(s => s.stage === 'manual').length };
  }
  flush() { return this.pending; }
}
module.exports = { ConversationStore };
