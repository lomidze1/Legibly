import { callbackHandler } from '../../../src/routes/auth/callback';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../../src/middleware/rateLimit';

export default withRateLimit(callbackHandler, AUTH_RATE_LIMIT);
