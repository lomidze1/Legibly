import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRpcClient } from '../shared/rpc';
import { App } from './App';
import './styles.css';

const rpc = createRpcClient((msg) => parent.postMessage({ pluginMessage: msg }, '*'));
let onEvent: (type: string) => void = () => undefined;
window.addEventListener('message', (e: MessageEvent) => {
  const pm = (e.data as { pluginMessage?: unknown })?.pluginMessage;
  rpc.onMessage(pm);
  if (pm && (pm as { legibly?: string }).legibly === 'event') {
    onEvent((pm as { type: string }).type);
  }
});

createRoot(document.getElementById('root')!).render(
  <App
    rpc={rpc}
    subscribe={(cb) => {
      onEvent = cb;
    }}
  />
);
