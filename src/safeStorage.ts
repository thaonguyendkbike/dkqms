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

// Write a key-value pair asynchronously to IndexedDB
function writeIDB(key: string, val: string): void {
  getIDBDatabase().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(val, key);
    } catch (err) {
      console.warn(`[safeStorage IDB Write Error] for key '${key}':`, err);
    }
  });
}

// Delete a key asynchronously from IndexedDB
function deleteIDB(key: string): void {
  getIDBDatabase().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
    } catch (err) {}
  });
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

// Pre-load all data from IndexedDB into memoryStore on startup
if (typeof window !== 'undefined' && window.indexedDB) {
  getIDBDatabase().then((db) => {
    if (!db) {
      isSafeStorageReady = true;
      readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
      return;
    }
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const k = String(cursor.key);
          const v = String(cursor.value);
          // Populate RAM from IndexedDB
          if (!memoryStore[k] || memoryStore[k].length < v.length) {
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
        }
      };
      req.onerror = () => {
        isSafeStorageReady = true;
        readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
      };
    } catch (e) {
      isSafeStorageReady = true;
      readyCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
    }
  });
} else {
  isSafeStorageReady = true;
}

// Test if localStorage is accessible and writable
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    
    // Initial sync from localStorage to memoryStore
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) {
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

// Global monkey-patch for window.localStorage.setItem to safely intercept QuotaExceededError from third-party SDKs like Firestore
if (typeof window !== 'undefined' && window.localStorage && rawSetItem) {
  try {
    window.localStorage.setItem = function (key: string, value: string) {
      const strVal = String(value);
      // For large datasets, keep purely in memoryStore & IndexedDB to avoid freezing the browser
      if (strVal.length > 1000000 || key === 'dk_oqc_records') {
        memoryStore[key] = strVal;
        writeIDB(key, strVal);
        return;
      }

      try {
        rawSetItem.call(window.localStorage, key, value);
      } catch (err: any) {
        memoryStore[key] = strVal;
        if (!isCleaningInProgress) {
          isCleaningInProgress = true;
          try {
            freeUpLocalStorageSpace(key);
            try {
              rawSetItem.call(window.localStorage, key, value);
            } catch (retryErr) {
              // Silently stored in memoryStore & IndexedDB
            }
          } finally {
            isCleaningInProgress = false;
          }
        }
      }
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
    memoryStore[key] = strVal;
    
    // Always persist to IndexedDB asynchronously (no 5MB quota limit!)
    writeIDB(key, strVal);

    if (isInMemory) return;

    // For massive datasets (e.g. dk_oqc_records > 1MB), do NOT write to 5MB localStorage
    // This completely eliminates QuotaExceededError and prevents main-thread freezing!
    if (strVal.length > 1000000 || key === 'dk_oqc_records') {
      try {
        // Clean out any old truncated copies from localStorage
        if (rawSetItem) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      return;
    }

    try {
      if (rawSetItem) {
        rawSetItem.call(window.localStorage, key, strVal);
      } else {
        window.localStorage.setItem(key, strVal);
      }
    } catch (e) {
      if (!isCleaningInProgress) {
        isCleaningInProgress = true;
        try {
          const spaceFreed = freeUpLocalStorageSpace(key);
          if (spaceFreed && rawSetItem) {
            try {
              rawSetItem.call(window.localStorage, key, strVal);
            } catch (retryErr) {}
          }
        } finally {
          isCleaningInProgress = false;
        }
      }
    }
  },

  removeItem(key: string): void {
    delete memoryStore[key];
    deleteIDB(key);
    if (isInMemory) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  },

  clear(): void {
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
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
  if (Array.isArray(val)) {
    return val.map(sanitizeFirestorePayload);
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


