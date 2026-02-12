import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = {
  requestId: string;
};

const asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext(requestId: string, callback: () => void) {
  asyncLocalStorage.run({ requestId }, callback);
}

export function getRequestId() {
  return asyncLocalStorage.getStore()?.requestId;
}
