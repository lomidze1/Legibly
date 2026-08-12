import { withCors } from '../src/middleware/cors.js';
import { JUDGE_RATE_LIMIT, withRateLimit } from '../src/middleware/rateLimit.js';
import { judgeHandler } from '../src/routes/judge/judge.js';

export default withCors(withRateLimit(judgeHandler, JUDGE_RATE_LIMIT));
