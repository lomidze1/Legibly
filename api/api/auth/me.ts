import { withCors } from '../../src/middleware/cors.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit.js';
import { meHandler } from '../../src/routes/auth/session.js';

export default withCors(withRateLimit(meHandler, AUTH_RATE_LIMIT));
