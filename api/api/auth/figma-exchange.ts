import { exchangeHandler } from '../../src/routes/auth/exchange';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';

export default withRateLimit(exchangeHandler, AUTH_RATE_LIMIT);
