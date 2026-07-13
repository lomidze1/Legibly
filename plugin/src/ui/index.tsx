import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRpcClient } from '../shared/rpc';
import { App } from './App';
import './styles.css';

const rpc = createRpcClient((msg) => parent.postMessage({ pluginMessage: msg }, '*'));
window.addEventListener('message', (e: MessageEvent) => {
  rpc.onMessage((e.data as { pluginMessage?: unknown })?.pluginMessage);
});

createRoot(document.getElementById('root')!).render(<App rpc={rpc} />);
