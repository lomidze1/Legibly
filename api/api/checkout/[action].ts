// Serves BOTH /api/checkout/success and /api/checkout/cancel. A static file
// wins over a dynamic one on Vercel, so /api/checkout/create is untouched.
// Two URLs, one function — the plan's function budget is the reason.
import { checkoutReturnHandler } from '../../src/routes/checkout/return.js';

export default checkoutReturnHandler;
