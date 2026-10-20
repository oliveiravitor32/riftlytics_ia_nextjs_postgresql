/**
 * Daily job (GitHub Actions): gets the day's summary text from the app and
 * sends it to the group. Env: APP_URL, CRON_SECRET, WHATSAPP_GROUP_ID,
 * DIRECT_URL, BOT_SESSION_KEY and, optionally, RESUMO_DIA (AAAA-MM-DD) to
 * send a past day's summary instead of today's.
 */

import { connect } from './connect.mjs';

const { APP_URL, CRON_SECRET, WHATSAPP_GROUP_ID, RESUMO_DIA } = process.env;
const query = RESUMO_DIA ? `?dia=${encodeURIComponent(RESUMO_DIA)}` : '';
const when = RESUMO_DIA || 'hoje';

const response = await fetch(`${APP_URL}/api/resumo${query}`, {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
});
if (!response.ok) {
  console.error(`Resumo indisponível: ${response.status}`);
  process.exit(1);
}
const { text } = await response.json();
if (!text) {
  console.log(`Nada para contar (${when}); nenhuma mensagem enviada.`);
  process.exit(0);
}

const { sock, close } = await connect();
await sock.sendMessage(WHATSAPP_GROUP_ID, { text });
// Gives WhatsApp a moment to take the message before disconnecting
await new Promise((r) => setTimeout(r, 3000));
await close();
console.log(`Resumo enviado (${when}).`);
process.exit(0);
