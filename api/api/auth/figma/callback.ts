import { callbackHandler } from '../../../src/routes/auth/callback.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../../src/middleware/rateLimit.js';

export default withRateLimit(callbackHandler, AUTH_RATE_LIMIT);
