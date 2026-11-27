let isInMemory = false;
const memoryStore: Record<string, string> = {};

// ==================== INDEXEDDB PERSISTENCE ENGINE (UNLIMITED LOCAL QUOTA) ====================
const IDB_NAME = 'dk_qms_storage_db';
const IDB_STORE = 'keyval';
const IDB_VERSION = 1;

let idbDatabasePromise: Promise<IDBDatabase | null> | null = null;

function getIDBDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!idbDatabasePromise) {
    idbDatabasePromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          resolve(req.result);
        };
        req.onerror = () => {
          console.warn("[safeStorage IDB] IndexedDB open error, continuing with memory/localStorage fallback.");
          resolve(null);
        };
      } catch (err) {
        console.warn("[safeStorage IDB] IndexedDB not available:", err);
        resolve(null);
      }
    });
  }
  return idbDatabasePromise;
}

const pendingIdbWrites = new Set<Promise<void>>();
const writtenDuringStartup = new Set<string>();

function trackIdbPromise(promise: Promise<void>): void {
  pendingIdbWrites.add(promise);
  promise.finally(() => {
    pendingIdbWrites.delete(promise);
  });
}

// Write a key-value pair asynchronously to IndexedDB
function writeIDB(key: string, val: string): void {
  const writePromise = getIDBDatabase()
    .then((db) => {
      if (!db) return;
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            console.warn(`[safeStorage IDB Write Error] for key '${key}':`, tx.error);
            resolve();
          };
          tx.onabort = () => {
            console.warn(`[safeStorage IDB Write Aborted] for key '${key}':`, tx.error);
            resolve();
          };
          const store = tx.objectStore(IDB_STORE);
          store.put(val, key);
        } catch (err) {
          console.warn(`[safeStorage IDB Write Error] for key '${key}':`, err);
          resolve();
        }
      });
    })
    .catch((err) => {
      console.warn(`[safeStorage IDB Write Error] for key '${key}':`, err);
    });
  trackIdbPromise(writePromise);
}

// Delete a key asynchronously from IndexedDB
function deleteIDB(key: string): void {
  const deletePromise = getIDBDatabase()
    .then((db) => {
      if (!db) return;
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
          const store = tx.objectStore(IDB_STORE);
          store.delete(key);
        } catch (err) {
          resolve();
        }
      });
    })
    .catch(() => {});
  trackIdbPromise(deletePromise);
}

// Clear all keys asynchronously from IndexedDB (prevents stale session resurrection after logout)
function clearIDB(): void {
  const clearPromise = getIDBDatabase()
    .then((db) => {
      if (!db) return;
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
          const store = tx.objectStore(IDB_STORE);
          store.clear();
        } catch (err) {
          resolve();
        }
      });
    })
    .catch(() => {});
  trackIdbPromise(clearPromise);
}

// ==================== MULTI-TAB COHERENCE (BroadcastChannel + storage event) ====================
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const STRIPPED_KEYS_MARKER = '__dk_stripped_ls_keys__';
let storageChannel: BroadcastChannel | null = null;

function broadcastStorageOp(op: 'set' | 'remove' | 'clear', key?: string, value?: string): void {
  if (!storageChannel) return;
  try {
    // Avoid broadcasting multi-MB payloads over BroadcastChannel; let receiving tabs reload from IDB if needed
    if (op === 'set' && value && value.length > 500000) {
      storageChannel.postMessage({ tabId: TAB_ID, op: 'reload_idb', key });
    } else {
      storageChannel.postMessage({ tabId: TAB_ID, op, key, value });
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      storageChannel = new BroadcastChannel('dk_qms_storage_sync');
      storageChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || msg.tabId === TAB_ID) return;
        if (msg.op === 'set' && typeof msg.key === 'string' && typeof msg.value === 'string') {
          memoryStore[msg.key] = msg.value;
          try {
            window.dispatchEvent(new CustomEvent('dk_storage_cross_tab_sync', { detail: { key: msg.key } }));
          } catch (e) {}
        } else if (msg.op === 'reload_idb' && typeof msg.key === 'string') {
          getIDBDatabase().then((db) => {
            if (!db) return;
            try {
              const tx = db.transaction(IDB_STORE, 'readonly');
              const req = tx.objectStore(IDB_STORE).get(msg.key);
              req.onsuccess = () => {
                if (req.result !== undefined && req.result !== null) {
                  memoryStore[msg.key] = String(req.result);
                  try {
                    window.dispatchEvent(new CustomEvent('dk_storage_cross_tab_sync', { detail: { key: msg.key } }));
                  } catch (e) {}
                }
              };
            } catch (e) {}
          });
        } else if (msg.op === 'remove' && typeof msg.key === 'string') {
          delete memoryStore[msg.key];
        } else if (msg.op === 'clear') {
          for (const k in memoryStore) delete memoryStore[k];
        }
      };
    }
  } catch (e) {}

  try {
    window.addEventListener('storage', (e) => {
      if (!e.key) {
        for (const k in memoryStore) delete memoryStore[k];
        return;
      }
      if (e.newValue === null) {
        delete memoryStore[e.key];
      } else {
        memoryStore[e.key] = e.newValue;
      }
    });
  } catch (e) {}
}

let isSafeStorageReady = false;
const readyCallbacks: (() => void)[] = [];

export function onSafeStorageReady(callback: () => void): void {
  if (isSafeStorageReady) {
    try { callback(); } catch (e) {}
  } else {
    readyCallbacks.push(callback);
  }
}

const preloadPromise: Promise<void> = (typeof window !== 'undefined' && window.indexedDB)
  ? getIDBDatabase()
      .then((db) => {
        if (!db) {
          isSafeStorageReady = true;
          readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
          return;
        }
        return new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.openCursor();
            req.onsuccess = () => {
              const cursor = req.result;
              if (cursor) {
                const k = String(cursor.key);
                const v = String(cursor.value);
                // Populate RAM from IndexedDB unless this key was explicitly written/deleted during startup
                if (!writtenDuringStartup.has(k)) {
                  memoryStore[k] = v;
                }
                cursor.continue();
              } else {
                // Finished reading all keys from IndexedDB
                isSafeStorageReady = true;
                readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
                try {
                  window.dispatchEvent(new CustomEvent('dk_safe_storage_ready'));
                } catch (e) {}
                resolve();
              }
            };
            req.onerror = () => {
              isSafeStorageReady = true;
              readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
              resolve();
            };
          } catch (e) {
            isSafeStorageReady = true;
            readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
            resolve();
          }
        });
      })
      .catch(() => {
        isSafeStorageReady = true;
        readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
      })
  : (() => {
      isSafeStorageReady = true;
      return Promise.resolve();
    })();

export function waitForSafeStoragePreload(): Promise<void> {
  return preloadPromise.catch(() => {});
}

export async function flushSafeStorageWrites(): Promise<void> {
  await waitForSafeStoragePreload();
  while (pendingIdbWrites.size > 0) {
    await Promise.allSettled(Array.from(pendingIdbWrites));
  }
}

// Test if localStorage is accessible and writable
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    
    // Initial sync from localStorage to memoryStore (skip keys previously stripped of base64 so IDB preload supplies full data)
    let strippedKeysSet = new Set<string>();
    try {
      const markerRaw = window.localStorage.getItem(STRIPPED_KEYS_MARKER);
      if (markerRaw) {
        const arr = JSON.parse(markerRaw);
        if (Array.isArray(arr)) strippedKeysSet = new Set(arr.map(String));
      }
    } catch (e) {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k !== STRIPPED_KEYS_MARKER && !strippedKeysSet.has(k)) {
        const v = window.localStorage.getItem(k);
        if (v !== null) {
          memoryStore[k] = v;
        }
      }
    }
  } else {
    isInMemory = true;
  }
} catch (e) {
  isInMemory = true;
  console.warn("⚠️ LocalStorage is disabled, restricted, or insecure in this environment. Falling back to safe memory & IndexedDB storage.");
}

// Helper function to recursively remove base64 images to free up space
function stripBase64Images(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripBase64Images);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const val = obj[k];
        if (
          typeof val === 'string' &&
          (val.startsWith('data:image/') ||
           val.startsWith('data:application/') ||
           val.startsWith('data:video/') ||
           (val.length > 2000 && val.includes('base64,')))
        ) {
          cleaned[k] = ''; // Remove massive base64 image strings to rescue text
        } else {
          cleaned[k] = stripBase64Images(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

let isCleaningInProgress = false;
const rawSetItem = typeof window !== 'undefined' && window.localStorage ? window.localStorage.setItem : null;
const rawRemoveItem = typeof window !== 'undefined' && window.localStorage ? window.localStorage.removeItem : null;

function markKeyStrippedInLocalStorage(key: string): void {
  if (!rawSetItem || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STRIPPED_KEYS_MARKER);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(key);
    rawSetItem.call(window.localStorage, STRIPPED_KEYS_MARKER, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function unmarkKeyStrippedInLocalStorage(key: string): void {
  if (!rawSetItem || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STRIPPED_KEYS_MARKER);
    if (!raw) return;
    const set = new Set<string>(JSON.parse(raw));
    if (set.delete(key)) {
      rawSetItem.call(window.localStorage, STRIPPED_KEYS_MARKER, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

// Global function to sweep all other keys in localStorage and remove their base64 images to free up space
function freeUpLocalStorageSpace(currentKey: string): boolean {
  if (isCleaningInProgress || !rawSetItem) return false;
  isCleaningInProgress = true;
  try {
    console.warn("🧹 [safeStorage] Đang dọn dẹp các khóa khác trong localStorage để giải phóng bộ nhớ...");
    let spaceFreed = false;
    const allKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) allKeys.push(k);
    }

    for (const otherKey of allKeys) {
      if (otherKey.startsWith('firestore_')) {
        try {
          window.localStorage.removeItem(otherKey);
          spaceFreed = true;
        } catch (e) {}
        continue;
      }
      // Tránh dọn dẹp khóa hiện tại đang cố ghi, các khóa cấu hình quan trọng hoặc cờ đồng bộ
      if (
        otherKey === currentKey ||
        otherKey === 'dk_current_user' ||
        otherKey === 'dk_staff' ||
        otherKey === 'dk_models' ||
        otherKey.endsWith('_is_dirty')
      ) {
        continue;
      }
      try {
        const rawValue = window.localStorage.getItem(otherKey);
        if (rawValue && (rawValue.includes('data:') || rawValue.includes('base64,') || rawValue.length > 20000)) {
          const parsed = JSON.parse(rawValue);
          const cleaned = stripBase64Images(parsed);
          const cleanedValue = JSON.stringify(cleaned);
          if (cleanedValue.length < rawValue.length) {
            try {
              rawSetItem.call(window.localStorage, otherKey, cleanedValue);
              markKeyStrippedInLocalStorage(otherKey);
              spaceFreed = true;
            } catch (e) {}
          }
        }
      } catch (err) {
        // Bỏ qua nếu lỗi parse hoặc không dọn dẹp được
      }
    }
    return spaceFreed;
  } catch (globalErr) {
    return false;
  } finally {
    isCleaningInProgress = false;
  }
}

// Purge non-essential keys if localStorage is completely exhausted
function purgeNonEssentialLocalStorage(currentKey: string): void {
  if (isCleaningInProgress || !rawSetItem) return;
  isCleaningInProgress = true;
  try {
    const allKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) allKeys.push(k);
    }

    for (const k of allKeys) {
      if (
        k === currentKey ||
        k === 'dk_current_user' ||
        k === 'dk_staff' ||
        k === 'dk_models' ||
        k.endsWith('_is_dirty')
      ) {
        continue;
      }
      // Clean base64 from all keys aggressively
      try {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          if (!k.startsWith('dk_')) {
            // Remove third-party / legacy temp keys
            try { window.localStorage.removeItem(k); } catch (e) {}
          } else {
            const parsed = JSON.parse(raw);
            const cleaned = stripBase64Images(parsed);
            try { rawSetItem.call(window.localStorage, k, JSON.stringify(cleaned)); } catch (e) {}
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    // Ignore
  } finally {
    isCleaningInProgress = false;
  }
}

// Global startup sweep for legacy/overflow firestore_ keys
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('firestore_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try { window.localStorage.removeItem(k); } catch (e) {}
    });
  }
} catch (e) {
  // Safe guard
}

// Global monkey-patch for window.localStorage.setItem/removeItem/getItem to keep memoryStore & IndexedDB coherent
if (typeof window !== 'undefined' && window.localStorage && rawSetItem) {
  try {
    window.localStorage.setItem = function (key: string, value: string) {
      const strVal = String(value);
      // ALWAYS update memoryStore & IndexedDB so direct localStorage.setItem never desyncs with safeStorage.getItem!
      writtenDuringStartup.add(key);
      memoryStore[key] = strVal;
      writeIDB(key, strVal);
      broadcastStorageOp('set', key, strVal);

      // For large datasets, keep purely in memoryStore & IndexedDB to avoid freezing the browser
      if (strVal.length > 1000000 || key === 'dk_oqc_records') {
        try {
          if (rawRemoveItem) rawRemoveItem.call(window.localStorage, key);
        } catch (e) {}
        return;
      }

      try {
        rawSetItem.call(window.localStorage, key, strVal);
        unmarkKeyStrippedInLocalStorage(key);
      } catch (err: any) {
        if (!isCleaningInProgress) {
          let freed = freeUpLocalStorageSpace(key);
          if (!freed) {
            purgeNonEssentialLocalStorage(key);
          }
          try {
            rawSetItem.call(window.localStorage, key, strVal);
            unmarkKeyStrippedInLocalStorage(key);
          } catch (retryErr) {
            // Safely persisted in memoryStore & IndexedDB
          }
        }
      }
    };

    if (rawRemoveItem) {
      window.localStorage.removeItem = function (key: string) {
        writtenDuringStartup.add(key);
        delete memoryStore[key];
        deleteIDB(key);
        broadcastStorageOp('remove', key);
        try {
          rawRemoveItem.call(window.localStorage, key);
        } catch (e) {}
      };
    }

    // CRITICAL FIX: Monkey-patch localStorage.getItem to intercept reads for all keys
    // Nếu dữ liệu đã có trong memoryStore (preload từ IndexedDB hoặc lưu trong phiên) → trả về ngay
    // Tránh trả về null khi dữ liệu lớn bị chuyển vào IndexedDB để bảo vệ quota 5MB.
    const rawGetItem = window.localStorage.getItem.bind(window.localStorage);
    window.localStorage.getItem = function (key: string): string | null {
      // Ưu tiên memoryStore (đã preload từ IndexedDB) → fallback sang native localStorage
      if (Object.prototype.hasOwnProperty.call(memoryStore, key) && memoryStore[key] !== undefined && memoryStore[key] !== null) {
        return memoryStore[key];
      }
      return rawGetItem(key);
    };
  } catch (e) {
    // Safe guard if window.localStorage is read-only
  }
}

export const safeStorage = {
  isReady(): boolean {
    return isSafeStorageReady;
  },

  async getItemAsync(key: string): Promise<string | null> {
    if (Object.prototype.hasOwnProperty.call(memoryStore, key) && memoryStore[key] !== undefined && memoryStore[key] !== null) {
      return memoryStore[key];
    }
    const db = await getIDBDatabase();
    if (!db) return this.getItem(key);
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          const val = req.result !== undefined && req.result !== null ? String(req.result) : null;
          if (val) memoryStore[key] = val;
          resolve(val || this.getItem(key));
        };
        req.onerror = () => resolve(this.getItem(key));
      } catch (err) {
        resolve(this.getItem(key));
      }
    });
  },

  getItem(key: string): string | null {
    if (Object.prototype.hasOwnProperty.call(memoryStore, key) && memoryStore[key] !== undefined && memoryStore[key] !== null) {
      return memoryStore[key];
    }
    if (isInMemory) {
      return null;
    }
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        memoryStore[key] = val;
        return val;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    const strVal = String(value);

    // Chặn ghi đè mảng rỗng vào dataset khổng lồ dk_oqc_records nếu đang có dữ liệu lớn
    if (key === 'dk_oqc_records' && (strVal === '[]' || strVal.trim() === '[]')) {
      const existing = memoryStore[key];
      if (existing && existing.length > 1000) {
        console.warn("[safeStorage Protection] Chặn thao tác ghi đè mảng rỗng lên tập dữ liệu OQC lớn hiện tại.");
        return;
      }
    }

    writtenDuringStartup.add(key);
    memoryStore[key] = strVal;
    
    // Always persist to IndexedDB asynchronously (no 5MB quota limit!)
    writeIDB(key, strVal);
    broadcastStorageOp('set', key, strVal);

    if (isInMemory) return;

    // For massive datasets (e.g. dk_oqc_records > 1MB), do NOT write to 5MB localStorage
    // This completely eliminates QuotaExceededError and prevents main-thread freezing!
    if (strVal.length > 1000000 || key === 'dk_oqc_records') {
      try {
        // Clean out any old truncated copies from localStorage
        if (rawRemoveItem) {
          rawRemoveItem.call(window.localStorage, key);
        }
      } catch (e) {}
      return;
    }

    try {
      if (rawSetItem) {
        rawSetItem.call(window.localStorage, key, strVal);
        unmarkKeyStrippedInLocalStorage(key);
      } else {
        window.localStorage.setItem(key, strVal);
      }
    } catch (e) {
      if (!isCleaningInProgress) {
        const spaceFreed = freeUpLocalStorageSpace(key);
        if (!spaceFreed) {
          purgeNonEssentialLocalStorage(key);
        }
        if (rawSetItem) {
          try {
            rawSetItem.call(window.localStorage, key, strVal);
            unmarkKeyStrippedInLocalStorage(key);
          } catch (retryErr) {
            // Safely stored in memoryStore & IndexedDB
          }
        }
      }
    }
  },

  removeItem(key: string): void {
    writtenDuringStartup.add(key);
    delete memoryStore[key];
    deleteIDB(key);
    broadcastStorageOp('remove', key);
    if (isInMemory) {
      return;
    }
    try {
      if (rawRemoveItem) {
        rawRemoveItem.call(window.localStorage, key);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore
    }
  },

  clear(): void {
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
    clearIDB();
    broadcastStorageOp('clear');
    if (isInMemory) {
      return;
    }
    try {
      window.localStorage.clear();
    } catch (e) {
      // Ignore
    }
  },

  getAllKeys(): string[] {
    if (isInMemory) {
      return Object.keys(memoryStore);
    }
    try {
      const keysSet = new Set<string>();
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keysSet.add(k);
      }
      Object.keys(memoryStore).forEach(k => keysSet.add(k));
      return Array.from(keysSet);
    } catch (e) {
      return Object.keys(memoryStore);
    }
  }
};

export function sanitizeFirestorePayload(val: any): any {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === 'number' && !Number.isFinite(val)) return null;
  if (Array.isArray(val)) {
    return val.map((item) =>
      Array.isArray(item)
        ? { __dkNestedArr: sanitizeFirestorePayload(item) }
        : sanitizeFirestorePayload(item)
    );
  }
  if (typeof val === 'object') {
    const cleaned: any = {};
    for (const k of Object.keys(val)) {
      const v = val[k];
      if (v !== undefined) {
        cleaned[k] = sanitizeFirestorePayload(v);
      }
    }
    return cleaned;
  }
  return val;
}

export function restoreFirestorePayload(val: any): any {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map(restoreFirestorePayload);
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 1 && keys[0] === '__dkNestedArr' && Array.isArray(val.__dkNestedArr)) {
      return restoreFirestorePayload(val.__dkNestedArr);
    }
    const restored: any = {};
    for (const k of keys) {
      restored[k] = restoreFirestorePayload(val[k]);
    }
    return restored;
  }
  return val;
}


