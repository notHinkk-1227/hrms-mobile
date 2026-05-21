/**
 * Jest mock untuk react-native-mmkv.
 *
 * Package asli pakai react-native-nitro-modules yang eager-call TurboModule
 * di module load — gagal di test env. Mock ini provide API yang setara untuk
 * `createMMKV(config)`: in-memory Map, no persistence across test files.
 */

class MockMMKV {
  constructor() {
    this.store = new Map();
  }
  set(key, value) {
    this.store.set(key, value);
  }
  getString(key) {
    const v = this.store.get(key);
    return typeof v === 'string' ? v : undefined;
  }
  getNumber(key) {
    const v = this.store.get(key);
    return typeof v === 'number' ? v : undefined;
  }
  getBoolean(key) {
    const v = this.store.get(key);
    return typeof v === 'boolean' ? v : undefined;
  }
  getBuffer(key) {
    const v = this.store.get(key);
    return v instanceof Uint8Array ? v : undefined;
  }
  remove(key) {
    this.store.delete(key);
  }
  clearAll() {
    this.store.clear();
  }
  getAllKeys() {
    return Array.from(this.store.keys());
  }
  contains(key) {
    return this.store.has(key);
  }
  addOnValueChangedListener() {
    return { remove: () => {} };
  }
}

// Singleton per id — mirip MMKV asli. State disimpan di globalThis supaya
// survive `jest.resetModules()` (test bisa verify "persist across restart").
if (!globalThis.__MMKV_MOCK_STATE__) {
  globalThis.__MMKV_MOCK_STATE__ = new Map();
}
const createMMKV = (config) => {
  const id = config?.id ?? 'default';
  let inst = globalThis.__MMKV_MOCK_STATE__.get(id);
  if (!inst) {
    inst = new MockMMKV();
    globalThis.__MMKV_MOCK_STATE__.set(id, inst);
  }
  return inst;
};

module.exports = {
  createMMKV,
  MMKV: MockMMKV,
  existsMMKV: () => false,
  deleteMMKV: () => {},
  useMMKV: () => new MockMMKV(),
};
