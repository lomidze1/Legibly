// One function for the whole admin surface — /api/admin/panel, /stats, /users,
// /users.csv, /user, /payments, /activity and the POST /license mutations.
// Vercel counts files, not routes, and this project is at the plan's ceiling.
//
// No CORS wrapper on purpose: the panel is same-origin and nothing else has any
// business calling these from a browser.
import { ADMIN_RATE_LIMIT, withRateLimit } from '../../src/middleware/rateLimit';
import { adminHandler } from '../../src/routes/admin/router';

export default withRateLimit(adminHandler, ADMIN_RATE_LIMIT);
