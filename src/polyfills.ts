import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = {
    nextTick: (fn: Function) => setTimeout(fn, 0),
    env: { NODE_ENV: 'development' },
    version: '',
    versions: {},
    platform: 'browser',
    on: () => {},
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    stdin: { on: () => {} },
  };
}
