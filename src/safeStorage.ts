let isInMemory = false;
const memoryStore: Record<string, string> = {};

// Test if localStorage is accessible and writable
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } else {
    isInMemory = true;
  }
} catch (e) {
  isInMemory = true;
  console.warn("⚠️ LocalStorage is disabled, restricted, or insecure in this environment. Falling back to safe memory storage.");
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

// Global function to sweep all other keys in localStorage and remove their base64 images to free up space
function freeUpLocalStorageSpace(currentKey: string): boolean {
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
          console.log(`🧹 [safeStorage] Đã xóa bỏ khóa cache Firestore cũ: ${otherKey}`);
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
            window.localStorage.setItem(otherKey, cleanedValue);
            console.log(`🧹 [safeStorage] Đã dọn dẹp và loại bỏ ảnh của khóa: ${otherKey} (Từ ${rawValue.length} xuống ${cleanedValue.length} ký tự)`);
            spaceFreed = true;
          }
        }
      } catch (err) {
        // Bỏ qua nếu lỗi parse hoặc không dọn dẹp được
      }
    }
    return spaceFreed;
  } catch (globalErr) {
    console.warn("⚠️ Lỗi khi dọn dẹp localStorage:", globalErr);
    return false;
  }
}

// Purge non-essential keys if localStorage is completely exhausted
function purgeNonEssentialLocalStorage(currentKey: string): void {
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
            window.localStorage.removeItem(k);
          } else {
            const parsed = JSON.parse(raw);
            const cleaned = stripBase64Images(parsed);
            window.localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    // Ignore
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
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const rawSetItem = window.localStorage.setItem;
    window.localStorage.setItem = function (key: string, value: string) {
      try {
        rawSetItem.call(window.localStorage, key, value);
      } catch (err: any) {
        if (
          err &&
          (err.name === 'QuotaExceededError' ||
           err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
           err.code === 22 ||
           err.code === 1014 ||
           String(err).includes('quota') ||
           String(err).includes('setItem'))
        ) {
          console.warn(`⚠️ [window.localStorage.setItem] Exceeded quota while setting key "${key}". Auto-cleaning...`);
          freeUpLocalStorageSpace(key);
          try {
            rawSetItem.call(window.localStorage, key, value);
            return;
          } catch (retryErr) {
            if (key.startsWith('firestore_')) {
              console.warn(`⚠️ [window.localStorage.setItem] Safely ignored quota error for Firestore cache key: ${key}`);
              return;
            }
            purgeNonEssentialLocalStorage(key);
            try {
              rawSetItem.call(window.localStorage, key, value);
              return;
            } catch (finalErr) {
              if (key.startsWith('firestore_')) {
                console.warn(`⚠️ [window.localStorage.setItem] Safely ignored quota error for Firestore cache key: ${key}`);
                return;
              }
              console.warn(`⚠️ [window.localStorage.setItem] Quota exhausted for key "${key}".`);
            }
          }
        } else {
          throw err;
        }
      }
    };
  } catch (e) {
    // Safe guard if window.localStorage is read-only
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (isInMemory) {
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
      // Fallback if saved in memoryStore during quota overload
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
  },

  setItem(key: string, value: string): void {
    if (isInMemory) {
      memoryStore[key] = String(value);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
      // Synchronize into memoryStore as backup
      memoryStore[key] = String(value);
    } catch (e) {
      console.warn(`⚠️ LocalStorage đầy hoặc lỗi khi ghi khóa: ${key}. Đang tiến hành dọn dẹp giải phóng dung lượng...`, e);
      
      // Bước 1: Thử giải phóng dung lượng bằng cách quét sạch ảnh ở các khóa khác
      const spaceFreed = freeUpLocalStorageSpace(key);
      
      if (spaceFreed) {
        try {
          window.localStorage.setItem(key, value);
          memoryStore[key] = String(value);
          console.log(`✅ Đã ghi thành công khóa: ${key} sau khi dọn dẹp giải phóng dung lượng từ các khóa khác!`);
          return;
        } catch (retryErr) {
          console.warn(`⚠️ Vẫn không thể ghi khóa: ${key} sau khi dọn dẹp các khóa khác. Đang tiến hành lọc ảnh cho chính khóa hiện tại...`, retryErr);
        }
      }

      // Bước 2: Tách bỏ ảnh Base64 của chính khóa này để cứu dữ liệu chữ (Text)
      let cleanedValue = value;
      try {
        const parsed = JSON.parse(value);
        const cleaned = stripBase64Images(parsed);
        cleanedValue = JSON.stringify(cleaned);
      } catch (parseErr) {
        // keep original if not JSON
      }

      try {
        window.localStorage.setItem(key, cleanedValue);
        memoryStore[key] = cleanedValue;
        console.log(`✅ Đã cứu dữ liệu chữ thành công (lọc bỏ ảnh) cho khóa: ${key}`);
        return;
      } catch (cleanErr) {
        console.warn(`⚠️ Vẫn không thể ghi khóa ${key} sau khi lọc ảnh. Tiến hành dọn dẹp mở rộng...`, cleanErr);
      }

      // Bước 3: Dọn dẹp mở rộng loại bỏ các dữ liệu rác/ảnh của tất cả khóa và thử lại
      try {
        purgeNonEssentialLocalStorage(key);
        window.localStorage.setItem(key, cleanedValue);
        memoryStore[key] = cleanedValue;
        console.log(`✅ Đã dọn dẹp mở rộng và lưu thành công dữ liệu chữ cho khóa: ${key}`);
        return;
      } catch (purgeErr) {
        console.warn(`⚠️ LocalStorage hoàn toàn không đủ dung lượng cho khóa: ${key}. Đã lưu an toàn vào RAM để không mất dữ liệu phiên làm việc.`);
        memoryStore[key] = String(cleanedValue);
      }
    }
  },

  removeItem(key: string): void {
    delete memoryStore[key];
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


