import { withCors } from '../../src/middleware/cors';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { licenseMeHandler } from '../../src/routes/license/me';

export default withCors(withRateLimit(licenseMeHandler, AUTH_RATE_LIMIT));
