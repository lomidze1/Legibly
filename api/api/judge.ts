import { withCors } from '../src/middleware/cors';
import { AUTH_RATE_LIMIT, withRateLimit } from '../src/middleware/rateLimit';
import { judgeHandler } from '../src/routes/judge/judge';

export default withCors(withRateLimit(judgeHandler, AUTH_RATE_LIMIT));
