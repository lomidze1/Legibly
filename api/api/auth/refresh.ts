import { refreshHandler } from '../../src/routes/auth/session';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';

export default withRateLimit(refreshHandler, AUTH_RATE_LIMIT);
