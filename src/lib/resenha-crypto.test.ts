/**
 * @jest-environment node
 */

import crypto from 'node:crypto';
import { decryptField, encryptField } from './resenha-crypto';

const KEY = crypto.randomBytes(32).toString('base64');

beforeEach(() => {
  process.env.RESENHA_KEY = KEY;
});

it('round-trips text, accents and emoji included', () => {
  const text = 'Que Yasuo criminoso! XD 🗡️ ação';
  expect(decryptField(encryptField(text))).toBe(text);
});

it('never stores the text in the clear, and the same text encrypts differently each time', () => {
  const a = encryptField('Que Yasuo criminoso!');
  const b = encryptField('Que Yasuo criminoso!');

  expect(a).toMatch(/^v1:/);
  expect(a).not.toContain('Yasuo');
  expect(a).not.toBe(b);
});

it('rejects a changed value or another key', () => {
  const stored = encryptField('segredo');
  const raw = Buffer.from(stored.slice(3), 'base64');
  raw[raw.length - 1] ^= 1;
  expect(() => decryptField(`v1:${raw.toString('base64')}`)).toThrow();

  process.env.RESENHA_KEY = crypto.randomBytes(32).toString('base64');
  expect(() => decryptField(stored)).toThrow();
});

it('rejects an unknown format and a missing key', () => {
  expect(() => decryptField('texto puro')).toThrow(/format/);
  delete process.env.RESENHA_KEY;
  expect(() => encryptField('x')).toThrow(/RESENHA_KEY/);
});
