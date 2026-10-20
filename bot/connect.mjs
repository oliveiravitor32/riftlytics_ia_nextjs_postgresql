/**
 * Opens a WhatsApp connection with the session stored in the database.
 * Resolves once the connection is open; rejects if WhatsApp logs it out.
 */

import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { loadDatabaseAuthState } from './auth-store.mjs';

const silent = {
  level: 'silent',
  child: () => silent,
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
};

export async function connect({ onPairing } = {}) {
  const auth = await loadDatabaseAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const open = () =>
    new Promise((resolve, reject) => {
      const sock = makeWASocket({
        version,
        auth: auth.state,
        logger: silent,
        printQRInTerminal: false,
        // Only sends: no need to download the account's history
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      sock.ev.on('creds.update', auth.saveCreds);

      let pairingRequested = false;
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && onPairing && !pairingRequested && !auth.state.creds.registered) {
          pairingRequested = true;
          await onPairing(sock);
        }
        if (connection === 'open') resolve(sock);
        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.loggedOut) {
            reject(new Error('WhatsApp encerrou a sessão: rode `npm run login` de novo'));
          } else {
            // Right after pairing WhatsApp asks for a reconnect
            open().then(resolve, reject);
          }
        }
      });
    });

  const sock = await open();
  return { sock, close: async () => { sock.end(undefined); await auth.close(); } };
}
