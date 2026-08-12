import { withCors } from '../../src/middleware/cors.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit.js';
import { licenseMeHandler } from '../../src/routes/license/me.js';

export default withCors(withRateLimit(licenseMeHandler, AUTH_RATE_LIMIT));
