type Listener = () => void;

const listeners = new Set<Listener>();

export const authEvents = {
  onUnauthorized(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emitUnauthorized(): void {
    listeners.forEach((fn) => fn());
  },
};
