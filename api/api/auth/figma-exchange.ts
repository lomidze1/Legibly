import { withCors } from '../../src/middleware/cors.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit.js';
import { exchangeHandler } from '../../src/routes/auth/exchange.js';

export default withCors(withRateLimit(exchangeHandler, AUTH_RATE_LIMIT));
