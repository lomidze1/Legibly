import { liveWebsiteOrigin } from '../../src/lib/webSession.js';
import { withCors } from '../../src/middleware/cors.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit.js';
import { checkoutCreateHandler } from '../../src/routes/checkout/create.js';

export default withCors(withRateLimit(checkoutCreateHandler, AUTH_RATE_LIMIT), liveWebsiteOrigin);
