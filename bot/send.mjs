/**
 * Daily job (GitHub Actions): gets the day's summary text from the app and
 * sends it to the group. Env: APP_URL, CRON_SECRET, WHATSAPP_GROUP_ID,
 * DIRECT_URL, BOT_SESSION_KEY.
 */

import { connect } from './connect.mjs';

const { APP_URL, CRON_SECRET, WHATSAPP_GROUP_ID } = process.env;

const response = await fetch(`${APP_URL}/api/resumo`, {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
});
if (!response.ok) {
  console.error(`Resumo indisponível: ${response.status}`);
  process.exit(1);
}
const { text } = await response.json();
if (!text) {
  console.log('Nada para contar hoje; nenhuma mensagem enviada.');
  process.exit(0);
}

const { sock, close } = await connect();
await sock.sendMessage(WHATSAPP_GROUP_ID, { text });
// Gives WhatsApp a moment to take the message before disconnecting
await new Promise((r) => setTimeout(r, 3000));
await close();
console.log('Resumo enviado.');
process.exit(0);
