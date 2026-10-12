// Capacitor fires every backButton listener, so screens push a handler here
// instead of registering their own. Newest wins.
const handlers = [];

export function pushBackHandler(handler) {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  };
}

export function runBackHandler() {
  const handler = handlers[handlers.length - 1];
  if (!handler) return false;
  handler();
  return true;
}
