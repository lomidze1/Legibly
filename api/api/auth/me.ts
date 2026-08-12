import { meHandler } from '../../src/routes/auth/session';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';

export default withRateLimit(meHandler, AUTH_RATE_LIMIT);
