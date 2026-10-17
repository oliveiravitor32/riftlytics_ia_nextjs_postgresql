/**
 * Shared by the suites that run real server code (integration, ui)
 */
import { prisma } from '@/src/lib/db';

// Real network calls + the token bucket can take a while
jest.setTimeout(60_000);

// Close the Postgres pool so Jest can exit without --forceExit
afterAll(() => prisma.$disconnect());
