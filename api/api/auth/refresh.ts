import { withCors } from '../../src/middleware/cors';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { refreshHandler } from '../../src/routes/auth/session';

export default withCors(withRateLimit(refreshHandler, AUTH_RATE_LIMIT));
