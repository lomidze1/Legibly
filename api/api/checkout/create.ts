import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { checkoutCreateHandler } from '../../src/routes/checkout/create';

export default withRateLimit(checkoutCreateHandler, AUTH_RATE_LIMIT);
