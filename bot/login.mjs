/**
 * One-time local setup: links the bot's number as a WhatsApp device (pairing
 * code, no QR) and lists the groups it is in, to find WHATSAPP_GROUP_ID.
 * Run: cd bot && npm run login -- 5511999999999   (the bot's number, with DDI)
 */

import { connect } from './connect.mjs';

const phone = process.argv[2]?.replace(/\D/g, '');

const { sock, close } = await connect({
  onPairing: async (s) => {
    if (!phone) {
      console.error('Informe o número do bot: npm run login -- 5511999999999');
      process.exit(1);
    }
    const code = await s.requestPairingCode(phone);
    console.log(`\nNo celular do bot: WhatsApp > Aparelhos conectados > Conectar aparelho >`);
    console.log(`"Conectar com número de telefone" e digite o código: ${code}\n`);
  },
});

console.log('Conectado. Grupos em que o bot está:\n');
const groups = await sock.groupFetchAllParticipating();
for (const group of Object.values(groups)) {
  console.log(`${group.subject}  →  WHATSAPP_GROUP_ID=${group.id}`);
}
await close();
process.exit(0);
