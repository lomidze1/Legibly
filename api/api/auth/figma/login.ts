import { loginHandler } from '../../../src/routes/auth/login';
import { AUTH_RATE_LIMIT, withRateLimit } from '../../../src/middleware/rateLimit';

export default withRateLimit(loginHandler, AUTH_RATE_LIMIT);
