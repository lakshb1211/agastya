import { createApp } from './app.js';
import { GEMINI_API_KEY, HOST, OPENAI_API_KEY, PORT } from './config.js';
import { flushDb, initDb } from './db.js';

initDb();
const server = createApp().listen(PORT, HOST, () => {
  const ai = [GEMINI_API_KEY && 'Gemini', OPENAI_API_KEY && 'OpenAI'].filter(Boolean).join(' + ') || 'local fallback only';
  console.log(`🌟 Agastya running on http://${HOST}:${PORT} (AI: ${ai})`);
});

// Persist pending writes before the platform stops the container
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flushDb();
    server.close(() => process.exit(0));
  });
}
