/**
 * Shared by the suites that run real server code (integration, ui)
 */
import { prisma } from '@/src/lib/db';

// Real network calls can wait for the shared Riot quota (90 per 2 minutes)
// to free up when the whole suite runs, so allow a full window plus margin
jest.setTimeout(180_000);

// Close the Postgres pool so Jest can exit without --forceExit
afterAll(() => prisma.$disconnect());
