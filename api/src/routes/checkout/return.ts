import { env } from '../../config/env';
import { queryParam, redirect, type ApiHandler } from '../../lib/http';

/**
 * Flitt sends the shopper back with a POST. A 303 is what makes the browser
 * follow with a GET; a 302 would repeat the POST at the website and 405.
 */
export function createReturnHandler(websiteBaseUrl: string, path: string): ApiHandler {
  return (_req, res) => {
    redirect(res, `${websiteBaseUrl}${path}`, 303);
  };
}

const RETURN_PATHS: Record<string, string> = {
  success: '/checkout/success',
  cancel: '/checkout/cancel',
};

/**
 * Both return URLs out of one file. Vercel bills a function per file, and this
 * project sits at the plan's ceiling — `[action].ts` keeps
 * /api/checkout/success and /api/checkout/cancel exactly as Flitt and the
 * plugin already know them while costing one function instead of two.
 *
 * An action we do not recognise lands on the cancel page: a URL nobody issues
 * is not evidence that anyone paid.
 */
export function createCheckoutReturnHandler(websiteBaseUrl: string): ApiHandler {
  return (req, res) => {
    const action = queryParam(req, 'action');
    const path = (action === undefined ? undefined : RETURN_PATHS[action]) ?? RETURN_PATHS.cancel!;
    return createReturnHandler(websiteBaseUrl, path)(req, res);
  };
}

export const checkoutReturnHandler: ApiHandler = (req, res) =>
  createCheckoutReturnHandler(env().websiteBaseUrl)(req, res);
