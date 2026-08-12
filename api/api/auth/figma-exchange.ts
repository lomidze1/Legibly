import { withCors } from '../../src/middleware/cors';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { exchangeHandler } from '../../src/routes/auth/exchange';

export default withCors(withRateLimit(exchangeHandler, AUTH_RATE_LIMIT));
