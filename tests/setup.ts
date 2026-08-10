// Vitest setup file
// Load .env files into process.env before any modules import
import { config } from 'dotenv';
import { vi } from 'vitest';

config({ path: '.env.local' });
config({ path: '.env' });

// Mock Next.js's server-only module so it's importable in tests
// (in production it throws when imported from a client component)
vi.mock('server-only', () => ({}));