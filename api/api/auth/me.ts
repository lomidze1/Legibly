import { withCors } from '../../src/middleware/cors';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { meHandler } from '../../src/routes/auth/session';

export default withCors(withRateLimit(meHandler, AUTH_RATE_LIMIT));
