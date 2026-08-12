// Vercel serverless entry point. With Root Directory = `api/`, this file is
// served at /api/health. Route logic lives in src/routes so tests can reach it.
import { healthHandler } from '../src/routes/health';

export default healthHandler;
