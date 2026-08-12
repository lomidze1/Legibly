/**
 * Licence state for the UI.
 *
 * ⚠️ Connecting is never required to scan or fix. The OAuth round trip starts
 * only when the user asks for Pro — the free path stays exactly as it is today,
 * offline and account-free, and that is the product's main promise.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { License, StoredToken } from '../shared/license';
import { createNonce, licenseLabel, parseStoredToken } from '../shared/license';
import type { RpcClient } from '../shared/rpc';
import {
  AlreadyProError,
  AuthExpiredError,
  createCheckout,
  exchangeNonce,
  getLicense,
  loginUrl,
} from './apiClient';
import { pollForPro, pollForToken } from './licenseClient';

export type LicenseBusy = 'idle' | 'connecting' | 'checkout' | 'refreshing';

export interface LicenseApi {
  license: License | null;
  connected: boolean;
  busy: LicenseBusy;
  label: string;
  notice: string | null;
  dismissNotice: () => void;
  /** Re-reads the licence. Called on open, on a gate error, and when Plans opens. */
  refresh: () => Promise<void>;
  connect: () => Promise<void>;
  subscribe: (duration: 'monthly' | 'yearly') => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function useLicense(rpc: RpcClient): LicenseApi {
  const [license, setLicense] = useState<License | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState<LicenseBusy>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const closed = useRef(false);

  useEffect(() => () => {
    closed.current = true;
  }, []);

  const readToken = useCallback(async (): Promise<StoredToken | null> => {
    const stored = await rpc.call<unknown>('get-auth-token');
    const token = parseStoredToken(stored);
    // A token that is expired or corrupt is dropped rather than carried around:
    // keeping it would fail every call with no route back to Connect.
    if (token === null && stored !== null) await rpc.call('clear-auth-token');
    setConnected(token !== null);
    return token;
  }, [rpc]);

  const forgetToken = useCallback(async (): Promise<void> => {
    await rpc.call('clear-auth-token');
    setConnected(false);
    setLicense(null);
    setNotice('Your Figma connection expired — connect again to use Pro.');
  }, [rpc]);

  const loadLicense = useCallback(
    async (token: StoredToken): Promise<License | null> => {
      try {
        const next = await getLicense(token.token);
        setLicense(next);
        return next;
      } catch (error) {
        if (error instanceof AuthExpiredError) {
          await forgetToken();
          return null;
        }
        throw error;
      }
    },
    [forgetToken],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const token = await readToken();
    if (token === null) return;
    setBusy('refreshing');
    try {
      await loadLicense(token);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not read your licence.');
    } finally {
      setBusy('idle');
    }
  }, [loadLicense, readToken]);

  // Once, when the panel opens. No timer follows it — see licenseClient.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async (): Promise<StoredToken | null> => {
    const nonce = createNonce(randomBytes);
    setBusy('connecting');
    setNotice(null);
    try {
      await rpc.call('open-url', { url: loginUrl(nonce) });
      const token = await pollForToken(nonce, exchangeNonce, {
        sleep,
        now: () => Date.now(),
        cancelled: () => closed.current,
      });
      if (token === null) {
        setNotice('Connecting timed out. Press Connect to try again.');
        return null;
      }
      await rpc.call('set-auth-token', token);
      setConnected(true);
      await loadLicense(token);
      return token;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not connect to Figma.');
      return null;
    } finally {
      setBusy('idle');
    }
  }, [loadLicense, rpc]);

  const subscribe = useCallback(
    async (duration: 'monthly' | 'yearly'): Promise<void> => {
      const token = (await readToken()) ?? (await connect());
      if (token === null) return;

      setBusy('checkout');
      setNotice(null);
      try {
        const checkoutUrl = await createCheckout(token.token, duration);
        await rpc.call('open-url', { url: checkoutUrl });
        // The only poll in the plugin, and it is bounded: the webhook lands
        // while the user is still reading the receipt, and Pro should appear
        // without them having to reopen anything.
        const next = await pollForPro(() => getLicense(token.token), {
          sleep,
          now: () => Date.now(),
          cancelled: () => closed.current,
        });
        if (next !== null) setLicense(next);
        if (next?.plan !== 'pro') {
          setNotice('Payment not confirmed yet. It will appear here once it clears.');
        }
      } catch (error) {
        if (error instanceof AuthExpiredError) {
          await forgetToken();
        } else if (error instanceof AlreadyProError) {
          setNotice(
            `Pro is already active for ${error.remainingDays} more days. You can renew in ${error.renewalOpensInDays} days.`,
          );
        } else {
          setNotice(error instanceof Error ? error.message : 'Checkout could not be opened.');
        }
      } finally {
        setBusy('idle');
      }
    },
    [connect, forgetToken, readToken, rpc],
  );

  return {
    license,
    connected,
    busy,
    label: licenseLabel(license),
    notice,
    dismissNotice: () => setNotice(null),
    refresh,
    connect: async () => {
      await connect();
    },
    subscribe,
  };
}
