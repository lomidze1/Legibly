import { loginHandler } from '../../../src/routes/auth/login.js';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../../src/middleware/rateLimit.js';

export default withRateLimit(loginHandler, AUTH_RATE_LIMIT);
