import { Buffer } from 'buffer';
import EventEmitter from 'events';
import util from 'util';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).EventEmitter = EventEmitter;
  (window as any).util = util;
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
