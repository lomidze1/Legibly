import { env } from '../../config/env';
import { redirect, type ApiHandler } from '../../lib/http';

/**
 * Flitt sends the shopper back with a POST. A 303 is what makes the browser
 * follow with a GET; a 302 would repeat the POST at the website and 405.
 */
export function createReturnHandler(websiteBaseUrl: string, path: string): ApiHandler {
  return (_req, res) => {
    redirect(res, `${websiteBaseUrl}${path}`, 303);
  };
}

export const checkoutSuccessHandler: ApiHandler = (req, res) =>
  createReturnHandler(env().websiteBaseUrl, '/checkout/success')(req, res);

export const checkoutCancelHandler: ApiHandler = (req, res) =>
  createReturnHandler(env().websiteBaseUrl, '/checkout/cancel')(req, res);
