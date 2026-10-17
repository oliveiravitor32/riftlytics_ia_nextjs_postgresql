/**
 * The logger reads NODE_ENV and LOG_LEVEL when the module loads, so each
 * scenario loads a fresh copy with its own environment.
 */

import type * as LoggerModule from './logger';

function loadLogger(env: { NODE_ENV: string; LOG_LEVEL?: string }) {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  if (!env.LOG_LEVEL) delete process.env.LOG_LEVEL;
  let mod!: typeof LoggerModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./logger');
  });
  process.env = previous;
  return mod.logger;
}

let log: jest.SpyInstance;
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => log.mockRestore());

it('production: one JSON line per entry, context included when given', () => {
  const logger = loadLogger({ NODE_ENV: 'production', LOG_LEVEL: 'info' });

  logger.info('Perfil carregado', { riotId: 'A#B' });
  logger.error('Falhou');

  const lines = log.mock.calls.map(([line]) => JSON.parse(line));
  expect(lines[0]).toMatchObject({
    level: 'info',
    message: 'Perfil carregado',
    context: { riotId: 'A#B' },
  });
  expect(lines[1]).not.toHaveProperty('context');
  expect(Date.parse(lines[0].timestamp)).not.toBeNaN();
});

it('drops entries below LOG_LEVEL', () => {
  const logger = loadLogger({ NODE_ENV: 'production', LOG_LEVEL: 'warn' });

  logger.debug('d');
  logger.info('i');
  logger.warn('w');
  logger.error('e');

  expect(log.mock.calls.map(([line]) => JSON.parse(line).level)).toEqual([
    'warn',
    'error',
  ]);
});

it('defaults to debug when LOG_LEVEL is unset', () => {
  const logger = loadLogger({ NODE_ENV: 'production' });

  logger.debug('detalhe');

  expect(log).toHaveBeenCalledTimes(1);
});

it('development: colored, human-readable lines', () => {
  const logger = loadLogger({ NODE_ENV: 'development', LOG_LEVEL: 'debug' });

  logger.warn('Cuidado', { n: 1 });
  logger.debug('Sem contexto');

  const [line, context] = log.mock.calls[0];
  expect(line).toContain('\x1b[33m'); // yellow for warn
  expect(line).toContain('Cuidado');
  expect(context).toEqual({ n: 1 });
  expect(log.mock.calls[1][1]).toBe('');
});
