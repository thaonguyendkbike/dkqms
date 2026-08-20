import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Cleanup any legacy firestore cache targets stored in localStorage to free up space
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

// Suppress Firestore warning about update times in the future due to slight system clock desynchronization
try {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.map(arg => {
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e) {
        return String(arg);
      }
    }).join(' ');
    if (msg.includes('Detected an update time that is in the future') || msg.includes('@firebase/firestore')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    const msg = args.map(arg => {
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e) {
        return String(arg);
      }
    }).join(' ');
    if (msg.includes('Detected an update time that is in the future') || msg.includes('@firebase/firestore')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
} catch (e) {
  // Safe guard in case console overrides fail in certain runtimes
}

try {
  setLogLevel('silent');
} catch (e) {
  // Safe guard
}

const safeFirebaseConfig = {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey || 'AIzaSyAz6X3rJv4ScGNSoo7fsuFUKyEd4VAQrac'
};

const app = initializeApp(safeFirebaseConfig);
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, 'ai-studio-24f3ad28-43fa-4e4b-b0ee-f6e3fbdfeee3'); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation function to confirm connection on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-placeholder', 'connection-check'));
    console.log("Firebase connection test performed successfully.");
    localStorage.setItem('dk_firebase_quota_exceeded', 'false');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isOffline = errorMsg.toLowerCase().includes('offline') || errorMsg.toLowerCase().includes('could not reach');
    const isQuota = (error && (error as any).code === 'resource-exhausted') || 
                    errorMsg.toLowerCase().includes('quota exceeded') || 
                    errorMsg.toLowerCase().includes('resource has been exhausted') || 
                    errorMsg.toLowerCase().includes('daily limit exceeded');
    if (isQuota) {
      localStorage.setItem('dk_firebase_quota_exceeded', 'true');
    }
    if (isOffline) {
      console.warn("Please check your Firebase configuration. Client is offline. App will use localStorage fallback safely.");
    } else {
      console.warn("Firebase connection status: ", errorMsg);
    }
  }
}

// Authenticate via Google popup
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập Google Popup:", error);
    throw error;
  }
}

// Authenticate via Google redirect
export async function loginWithGoogleRedirect() {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Lỗi khởi tạo đăng nhập Google Redirect:", error);
    throw error;
  }
}

// Check redirect login response on startup
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Đăng nhập hành trình Redirect thành công:", result.user);
      return result.user;
    }
  } catch (error) {
    console.error("Lỗi lấy thông tin Redirect Auth:", error);
  }
  return null;
}
