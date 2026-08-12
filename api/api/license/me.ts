import { licenseMeHandler } from '../../src/routes/license/me';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';

export default withRateLimit(licenseMeHandler, AUTH_RATE_LIMIT);
