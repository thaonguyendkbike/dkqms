import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Cpu, RefreshCw } from 'lucide-react';
import { auth, checkRedirectResult, db } from '../firebase';
import { INITIAL_STAFF } from '../initialData';
import { safeStorage } from '../safeStorage';
import PartsBomCenter from './PartsBomCenter';

export const StandaloneLkApp: React.FC = () => {
  const [lkUnlocked, setLkUnlocked] = useState<boolean>(
    () => safeStorage.getItem('qms_lk_unlocked_v1') === 'true'
  );
  const [lkPasswordInput, setLkPasswordInput] = useState('');
  const [lkPasswordError, setLkPasswordError] = useState('');

  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(() => lkUnlocked);
  const [authorizedMember, setAuthorizedMember] = useState<{
    name: string;
    canEdit: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const fallbackTimer = setTimeout(() => {
      if (active) setAuthInitialized(true);
    }, 2000);

    checkRedirectResult().then((user) => {
      if (!active) return;
      if (user) {
        setFirebaseUser(user);
        setAuthInitialized(true);
        clearTimeout(fallbackTimer);
      }
    });

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      setFirebaseUser(user);
      setAuthInitialized(true);
      clearTimeout(fallbackTimer);
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const resolveStaffPermission = async () => {
      if (!firebaseUser?.email) {
        if (active) setAuthorizedMember(null);
        return;
      }
      const emailLower = String(firebaseUser.email).toLowerCase().trim();
      if (emailLower === 'thaonguyendkbike@gmail.com') {
        if (active) setAuthorizedMember({ name: 'Nguyễn Xuân Thao', canEdit: true });
        return;
      }

      let staffList: any[] = INITIAL_STAFF;
      try {
        const cachedStaff = safeStorage.getItem('dk_staff');
        if (cachedStaff) {
          const parsed = JSON.parse(cachedStaff);
          if (Array.isArray(parsed) && parsed.length > 0) {
            staffList = parsed;
          }
        }
      } catch {}

      try {
        const snap = await getDoc(doc(db, 'dk_db_sync', 'dk_staff'));
        if (snap.exists()) {
          const d = snap.data();
          const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
          if (list.length > 0) {
            staffList = list;
            safeStorage.setItem('dk_staff', JSON.stringify(list));
          }
        }
      } catch {}

      const found = staffList.find(
        (s) => s && s.email && String(s.email).toLowerCase().trim() === emailLower
      );
      if (active) {
        const canEdit = Boolean(
          found && (found.permission === 'edit' || found.permission === 'admin')
        );
        setAuthorizedMember(
          found
            ? { name: found.name || firebaseUser.displayName || emailLower, canEdit }
            : null
        );
      }
    };

    resolveStaffPermission();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  if (!authInitialized && !lkUnlocked) {
    return (
      <div className="bg-slate-900 min-h-screen w-full flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
          <h2 className="text-base sm:text-lg font-extrabold tracking-wider text-indigo-300">
            ĐANG TẢI DANH MỤC LINH KIỆN (/lk)
          </h2>
          <p className="text-xs text-slate-400">
            Công ty TNHH Xe điện DK Việt Nhật — DKBike
          </p>
        </div>
      </div>
    );
  }

  if (firebaseUser) {
    const canEdit = Boolean(authorizedMember?.canEdit);
    return (
      <div className="w-full h-full min-h-screen overflow-y-auto overflow-x-hidden bg-slate-50">
        <PartsBomCenter
          readOnly={!canEdit}
          isLoggedIn={true}
          canViewPurchasePrice={canEdit}
          currentUserName={
            authorizedMember?.name ||
            firebaseUser.displayName ||
            firebaseUser.email ||
            'QLCL DKBike'
          }
          onBackToApp={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        />
      </div>
    );
  }

  if (lkUnlocked) {
    return (
      <div className="w-full h-full min-h-screen overflow-y-auto overflow-x-hidden bg-slate-50">
        <PartsBomCenter
          readOnly={true}
          isLoggedIn={false}
          canViewPurchasePrice={false}
          onRequestLogin={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/?tab=parts-bom';
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-100">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (lkPasswordInput.trim() === '12356789') {
            safeStorage.setItem('qms_lk_unlocked_v1', 'true');
            setLkPasswordError('');
            setLkUnlocked(true);
          } else {
            setLkPasswordError('Mật khẩu chưa đúng. Vui lòng thử lại.');
          }
        }}
        className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 backdrop-blur-md"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-lg md:text-xl font-black text-white uppercase">
            Danh Mục Linh Kiện &amp; BOM Xe (/lk)
          </h1>
          <p className="text-xs text-slate-400">
            Công ty TNHH Xe điện DK Việt Nhật — DKBike (Xe cho cả gia đình)
            <br />
            Phòng Quản lý chất lượng (QLCL / DK QMS)
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Nhập mật khẩu tra cứu (chỉ cần nhập lần đầu):
          </label>
          <input
            type="password"
            autoFocus
            value={lkPasswordInput}
            onChange={(e) => {
              setLkPasswordInput(e.target.value);
              if (lkPasswordError) setLkPasswordError('');
            }}
            placeholder="Nhập mật khẩu..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-indigo-500"
          />
          {lkPasswordError && (
            <p className="text-xs text-rose-400 font-semibold">{lkPasswordError}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-extrabold shadow-lg transition cursor-pointer"
        >
          Mở khóa tra cứu /lk
        </button>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/?tab=parts-bom';
              }
            }}
            className="text-xs text-slate-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Hoặc đăng nhập bằng tài khoản Google nội bộ (QLCL)
          </button>
        </div>
      </form>
    </div>
  );
};

export default StandaloneLkApp;
