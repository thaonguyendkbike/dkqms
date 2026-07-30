import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  initAuth, 
  logout, 
  getAccessToken, 
  sendGmailMessage, 
  generateDailyLogEmailTemplate, 
  generateCapaEmailTemplate,
  generateTodayAndTomorrowEmailTemplate,
  searchGmailMessageForThread
} from '../lib/gmailService';
import { 
  Mail, 
  Send, 
  LogOut, 
  Check, 
  RefreshCw, 
  User, 
  AlertCircle, 
  Calendar, 
  Clock, 
  FileText,
  UserCheck,
  ChevronDown,
  Info,
  Plus,
  Trash2
} from 'lucide-react';
import { QualityStaff, CAPA } from '../types';
import { DailyLogRecord } from '../dailyLogsData';
import { safeStorage } from '../safeStorage';

interface GmailManagerProps {
  dailyLogs: DailyLogRecord[];
  staff: QualityStaff[];
  capas: CAPA[];
  initialSenderName?: string;
  initialSenderEmail?: string;
  oqcRecords?: any[];
}

export default function GmailManager({ 
  dailyLogs, 
  staff, 
  capas,
  initialSenderName = "Nguyễn Xuân Thao",
  initialSenderEmail = "thaonguyendkbike@gmail.com",
  oqcRecords = []
}: GmailManagerProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Email Form State
  const [emailTo, setEmailTo] = useState(() => {
    const defaultThread = 'GROUP BÁO CÁO KẾ HOẠCH THÁNG 7.2026';
    const savedSelected = safeStorage.getItem('dk_selected_planning_thread') || defaultThread;
    const savedRecipients = safeStorage.getItem('dk_thread_recipients');
    if (savedRecipients) {
      try {
        const parsed = JSON.parse(savedRecipients);
        if (parsed[savedSelected]) return parsed[savedSelected];
      } catch (e) {}
    }
    return '';
  });
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Selected Pre-designed Mode
  const [presetMode, setPresetMode] = useState<'custom' | 'daily_log' | 'capa' | 'two_days'>('two_days');
  
  // Presets states
  const [selectedLogDate, setSelectedLogDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedReportDate, setSelectedReportDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedPlanDate, setSelectedPlanDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedCapaId, setSelectedCapaId] = useState('');
  
  // Custom dialogs & UI feedback
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic list of Gmail threads with safeStorage persistence
  const [planningThreads, setPlanningThreads] = useState<string[]>(() => {
    const saved = safeStorage.getItem('dk_planning_threads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'GROUP BÁO CÁO KẾ HOẠCH TỪ 6/6/2026',
      'GROUP BÁO CÁO KẾ HOẠCH THÁNG 7.2026'
    ];
  });

  const [selectedThread, setSelectedThread] = useState<string>(() => {
    const saved = safeStorage.getItem('dk_selected_planning_thread');
    if (saved && saved.trim()) return saved;
    return 'GROUP BÁO CÁO KẾ HOẠCH THÁNG 7.2026';
  });

  const [newThreadInput, setNewThreadInput] = useState('');
  const [showAddThreadInput, setShowAddThreadInput] = useState(false);

  const handleAddPlanningThread = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (planningThreads.includes(trimmed)) {
      setSuccessMessage('Tiêu đề luồng đã tồn tại!');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }
    const updated = [...planningThreads, trimmed];
    setPlanningThreads(updated);
    setSelectedThread(trimmed);
    safeStorage.setItem('dk_planning_threads', JSON.stringify(updated));
    safeStorage.setItem('dk_selected_planning_thread', trimmed);
    setNewThreadInput('');
    setShowAddThreadInput(false);
    setSuccessMessage(`Đã thêm luồng mới: "${trimmed}"`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleRemovePlanningThread = (title: string) => {
    if (planningThreads.length <= 1) {
      setErrorMessage('Bắt buộc phải giữ lại ít nhất một luồng báo cáo kế hoạch.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    const updated = planningThreads.filter(t => t !== title);
    setPlanningThreads(updated);
    if (selectedThread === title) {
      const nextThread = updated[updated.length - 1];
      setSelectedThread(nextThread);
      safeStorage.setItem('dk_selected_planning_thread', nextThread);
    }
    safeStorage.setItem('dk_planning_threads', JSON.stringify(updated));
    setSuccessMessage(`Đã xóa luồng: "${title}"`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // States for Threaded Reply (Threaded Reply Config)
  const [isThreaded, setIsThreaded] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isSearchingThread, setIsSearchingThread] = useState(false);

  // Helper code for date parsing
  const parseLogDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      } else if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = new Date().getFullYear();
        return new Date(year, month, day);
      }
    }
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  // Get active OQC records filter depending on the current selected log date or preset mode
  const oqcSelected = React.useMemo(() => {
    const targetDateStr = presetMode === 'two_days' ? selectedReportDate : selectedLogDate;
    const logsDate = parseLogDate(targetDateStr);
    if (!logsDate) return [];
    
    return oqcRecords.filter(rec => {
      const rDate = parseLogDate(rec.date || '');
      return rDate ? 
        rDate.getFullYear() === logsDate.getFullYear() && 
        rDate.getMonth() === logsDate.getMonth() && 
        rDate.getDate() === logsDate.getDate() : false;
    });
  }, [oqcRecords, selectedLogDate, selectedReportDate, presetMode]);

  // Analyze OQC data for visual rendering
  const oqcDashboardData = React.useMemo(() => {
    if (!oqcSelected || oqcSelected.length === 0) return null;

    const total = oqcSelected.length;
    const passedList = oqcSelected.filter(rec => {
      if (rec.status === 'Đạt') return true;
      if (rec.status === 'Lỗi') return false;
      const details = rec.defectDetail ? rec.defectDetail.trim().toLowerCase() : '';
      if (!details || details === 'không' || details === 'sạch không lỗi' || details === 'ok' || details === 'pass' || details.includes('sạch')) {
        return true;
      }
      return false;
    });
    const passed = passedList.length;
    const failed = total - passed;
    const yieldRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "100.0";

    const modelMap = new Map<string, {
      model: string;
      total: number;
      passed: number;
      failed: number;
      defectMap: Map<string, number>;
    }>();

    oqcSelected.forEach(rec => {
      const parentModel = (rec.model || 'Dòng xe thô').trim();
      if (!modelMap.has(parentModel)) {
        modelMap.set(parentModel, {
          model: parentModel,
          total: 0,
          passed: 0,
          failed: 0,
          defectMap: new Map<string, number>()
        });
      }

      const mStat = modelMap.get(parentModel)!;
      mStat.total++;

      const isPassed = rec.status === 'Đạt' || (rec.status !== 'Lỗi' && (!rec.defectDetail || rec.defectDetail.trim() === '' || rec.defectDetail.trim().toLowerCase() === 'không' || rec.defectDetail.trim().toLowerCase() === 'ok' || rec.defectDetail.trim().toLowerCase() === 'pass'));

      if (isPassed) {
        mStat.passed++;
      } else {
        mStat.failed++;
        const def = rec.defectDetail ? rec.defectDetail.trim() : 'Lỗi ngoại quan';
        const failCount = Number(rec.failedCount) || 1;
        mStat.defectMap.set(def, (mStat.defectMap.get(def) || 0) + failCount);
      }
    });

    const models = Array.from(modelMap.values()).map(m => {
      const modelYield = m.total > 0 ? ((m.passed / m.total) * 100).toFixed(1) : "100.0";
      const sortedDefects = Array.from(m.defectMap.entries())
        .map(([defect, count]) => ({ defect, count }))
        .sort((a, b) => b.count - a.count);
      return {
        ...m,
        yieldRate: modelYield,
        topDefects: sortedDefects
      };
    });

    return {
      total,
      passed,
      failed,
      yieldRate,
      models
    };
  }, [oqcSelected]);

  // 1. Initialize Google Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setIsLoadingAuth(false);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setIsLoadingAuth(false);
      }
    );
    
    // Check if token already exists in memory right now
    getAccessToken().then(tok => {
      if (tok) {
         setAccessToken(tok);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set default CAPA selection when preset mode changes
  useEffect(() => {
    if (presetMode === 'capa' && capas.length > 0 && !selectedCapaId) {
      setSelectedCapaId(capas[0].id);
    }
  }, [presetMode, capas, selectedCapaId]);

  // Generate Email Content depending on Presets
  const getPreviewEmailContent = () => {
    if (presetMode === 'two_days') {
      const today = parseLogDate(selectedReportDate) || new Date();
      const tomorrow = parseLogDate(selectedPlanDate) || new Date();

      const sameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
      };

      const logsToday = dailyLogs.filter(log => {
        const lDate = parseLogDate(log.date || '');
        return lDate ? sameDay(lDate, today) : false;
      });

      const logsTomorrow = dailyLogs.filter(log => {
        const lDate = parseLogDate(log.date || '');
        return lDate ? sameDay(lDate, tomorrow) : false;
      });

      const oqcToday = oqcRecords.filter(rec => {
        const rDate = parseLogDate(rec.date || '');
        return rDate ? sameDay(rDate, today) : false;
      });

      const oqcTomorrow = oqcRecords.filter(rec => {
        const rDate = parseLogDate(rec.date || '');
        return rDate ? sameDay(rDate, tomorrow) : false;
      });

      const todayStr = today.toLocaleDateString('vi-VN');
      const tomorrowStr = tomorrow.toLocaleDateString('vi-VN');

      const subject = `[DKBike QMS] Báo cáo công việc ngày ${todayStr} & Kế hoạch ngày ${tomorrowStr}`;
      const senderName = googleUser?.displayName || initialSenderName;
      const htmlBody = generateTodayAndTomorrowEmailTemplate(
        logsToday, 
        logsTomorrow, 
        todayStr, 
        tomorrowStr, 
        senderName, 
        oqcToday, 
        oqcTomorrow
      );

      return { 
        subject, 
        htmlBody, 
        count: logsToday.length + logsTomorrow.length, 
        todayCount: logsToday.length, 
        tomorrowCount: logsTomorrow.length, 
        todayStr, 
        tomorrowStr 
      };
    }

    if (presetMode === 'daily_log') {
      // Filter logs for selected date
      // SelectedLogDate is YYYY-MM-DD, logs dates can be DD/MM/YYYY or YYYY-MM-DD
      const formattedDateParts = selectedLogDate.split('-'); // [YYYY, MM, DD]
      const ddmmyyyy = `${formattedDateParts[2]}/${formattedDateParts[1]}/${formattedDateParts[0]}`;
      
      const filteredLogs = dailyLogs.filter(log => {
        const d = log.date || '';
        return d === selectedLogDate || d === ddmmyyyy;
      });

      const logsDate = parseLogDate(selectedLogDate);
      const oqcSelected = oqcRecords.filter(rec => {
        const rDate = parseLogDate(rec.date || '');
        return rDate && logsDate ? rDate.getFullYear() === logsDate.getFullYear() && rDate.getMonth() === logsDate.getMonth() && rDate.getDate() === logsDate.getDate() : false;
      });

      const subject = `[DKBike QMS] Báo cáo công việc QA/QC ngày ${ddmmyyyy}`;
      const senderName = googleUser?.displayName || initialSenderName;
      const htmlBody = generateDailyLogEmailTemplate(filteredLogs, ddmmyyyy, senderName, oqcSelected);
      
      return { subject, htmlBody, count: filteredLogs.length, formattedDate: ddmmyyyy };
    } 
    
    if (presetMode === 'capa') {
      const selectedCapa = capas.find(c => c.id === selectedCapaId) || capas[0];
      if (!selectedCapa) {
        return { 
          subject: '[DKBike QMS] Cảnh báo chất lượng CAPA', 
          htmlBody: '<p>Không có CAPA nào được chọn.</p>' 
        };
      }
      const subject = `⚠️ [DKBike QA/QC Alert] Yêu cầu hành động khắc phục CAPA ${selectedCapa.id || 'NEW'}`;
      const senderName = googleUser?.displayName || initialSenderName;
      const htmlBody = generateCapaEmailTemplate(selectedCapa, senderName);
      
      return { subject, htmlBody, capa: selectedCapa };
    }

    return { 
      subject: emailSubject || 'Chủ đề tùy chỉnh...', 
      htmlBody: emailBody ? emailBody.replace(/\n/g, '<br/>') : 'Nội dung trống...' 
    };
  };

  // Sync Form when PRESET details change
  useEffect(() => {
    if (isThreaded) {
      setEmailSubject(`Re: ${selectedThread}`);
    } else if (presetMode !== 'custom') {
      const preview = getPreviewEmailContent();
      setEmailSubject(preview.subject);
    }
  }, [isThreaded, presetMode, selectedLogDate, selectedReportDate, selectedPlanDate, selectedCapaId, dailyLogs, googleUser, selectedThread]);

  useEffect(() => {
    if (presetMode !== 'custom') {
      const preview = getPreviewEmailContent();
      setEmailBody(preview.htmlBody);
    }
  }, [presetMode, selectedLogDate, selectedReportDate, selectedPlanDate, selectedCapaId, dailyLogs, googleUser]);

  // Load saved recipients when selectedThread changes
  useEffect(() => {
    if (selectedThread) {
      const savedRecipients = safeStorage.getItem('dk_thread_recipients');
      if (savedRecipients) {
        try {
          const parsed = JSON.parse(savedRecipients);
          if (parsed[selectedThread] !== undefined) {
            setEmailTo(parsed[selectedThread]);
          }
        } catch (e) {}
      }
    }
  }, [selectedThread]);

  // Save recipient email when emailTo changes for the currently selected thread
  useEffect(() => {
    if (selectedThread && emailTo) {
      const savedRecipients = safeStorage.getItem('dk_thread_recipients') || '{}';
      try {
        const parsed = JSON.parse(savedRecipients);
        parsed[selectedThread] = emailTo;
        safeStorage.setItem('dk_thread_recipients', JSON.stringify(parsed));
      } catch (e) {}
    }
  }, [emailTo, selectedThread]);

  // Activate Planning Group context: background Gmail API thread search
  const activatePlanningGroup = async (targetThreadName?: string) => {
    setIsThreaded(true);
    setIsSearchingThread(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    const activeThread = targetThreadName || selectedThread;
    
    // Load saved recipients for this thread or keep current if set
    let currentRecipients = emailTo;
    if (!currentRecipients) {
      const savedRecipients = safeStorage.getItem('dk_thread_recipients');
      if (savedRecipients) {
        try {
          const parsed = JSON.parse(savedRecipients);
          if (parsed[activeThread]) {
            currentRecipients = parsed[activeThread];
          }
        } catch (e) {}
      }
    }
    
    setEmailTo(currentRecipients || '');
    setEmailSubject(`Re: ${activeThread}`);
    
    try {
      const token = await getAccessToken() || accessToken;
      if (!token) {
        setErrorMessage('Tài khoản Google/Gmail chưa được liên kết. Vui lòng nhấn nút "Kết nối Gmail của bạn" ở phía trên trước.');
        setIsSearchingThread(false);
        return;
      }
      
      const result = await searchGmailMessageForThread(token, activeThread);
      if (result) {
        setThreadId(result.threadId);
        setLastMessageId(result.lastMessageId);
        
        // Merge fetched thread emails with currentRecipients
        if (result.threadEmails) {
          const fetchedEmails = result.threadEmails;
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const currentList = currentRecipients.match(emailRegex) || [];
          const fetchedList = fetchedEmails.match(emailRegex) || [];
          const combined = Array.from(new Set([...currentList, ...fetchedList].map(e => e.toLowerCase().trim()))).join(', ');
          
          setEmailTo(combined);
          
          const savedRecipients = safeStorage.getItem('dk_thread_recipients') || '{}';
          try {
            const parsed = JSON.parse(savedRecipients);
            parsed[activeThread] = combined;
            safeStorage.setItem('dk_thread_recipients', JSON.stringify(parsed));
          } catch (e) {}
        }
        
        setSuccessMessage(`Đã đồng bộ thành công với Luồng email hoạt động "${activeThread}"!`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setThreadId(null);
        setLastMessageId(null);
        setErrorMessage(`Không tìm thấy luồng thư nào có tiêu đề gốc là "${activeThread}" trên Gmail của bạn. Bạn vẫn có thể gửi bình thường và Gmail sẽ tự gộp luồng khi khớp tiêu đề.`);
        setTimeout(() => setErrorMessage(''), 8000);
      }
    } catch (err: any) {
      console.error('Lỗi định vị luồng Báo cáo Kế hoạch:', err);
      setErrorMessage('Không thể tìm kiếm tự động: ' + (err.message || 'Lỗi kết nối Gmail API'));
      setTimeout(() => setErrorMessage(''), 8000);
    } finally {
      setIsSearchingThread(false);
    }
  };

  // Handle Google Login Click
  const handleLogin = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setSuccessMessage('Đăng nhập và tích hợp Gmail thành công!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      console.error('Đăng nhập Google gặp lỗi:', err);
      setErrorMessage(err.message || 'Lỗi liên kết Google Account.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Handle Google Sign Out
  const handleLogout = async () => {
    setIsLoadingAuth(true);
    try {
      await logout();
      setGoogleUser(null);
      setAccessToken(null);
    } catch (err) {
      console.error('Đăng xuất thất bại:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Safe Email Dispatch with User Confirm
  const triggerEmailDispatch = async () => {
    if (!accessToken) {
      setErrorMessage('Bạn cần kết nối tài khoản Google có quyền Gmail trước.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    if (!emailTo.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ người nhận điện thư (To).');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSendConfirmed = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setErrorMessage('');
    
    try {
      const token = await getAccessToken() || accessToken;
      if (!token) throw new Error("AccessToken rỗng. Vui lòng đăng nhập lại.");
      
      const dispatchSubject = isThreaded ? `Re: ${selectedThread}` : emailSubject;
      const response = await sendGmailMessage(
        token, 
        emailTo, 
        dispatchSubject, 
        emailBody,
        isThreaded ? (threadId || undefined) : undefined,
        isThreaded ? (lastMessageId || undefined) : undefined
      );
      
      setSuccessMessage(`Đã gửi mail báo cáo thành công (và ghép luồng nếu bật Thread) tới hòm thư: ${emailTo}! MsgId: ${response.id}`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err: any) {
      console.error('Lỗi khi gửi Gmail API:', err);
      setErrorMessage(err.message || 'Mô phỏng trục trặc: Không thể gửi mail qua Gmail API.');
      setTimeout(() => setErrorMessage(''), 8000);
    } finally {
      setIsSending(false);
    }
  };

  // Auto-fill recipient from staff list selection (append if already exists and not duplicated)
  const handleFillStaffRecipient = (email: string) => {
    if (!email) return;
    if (!emailTo.trim()) {
      setEmailTo(email);
      return;
    }
    
    // Parse existing emails
    const existing = emailTo.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const newEmails = email.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // Merge without duplicates
    const merged = Array.from(new Set([...existing, ...newEmails]));
    setEmailTo(merged.join(', '));
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden" id="gmail-manager-root">
      
      {/* Upper header */}
      <div className="bg-indigo-900 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-800 rounded-lg text-indigo-300">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-base font-extrabold text-white tracking-tight uppercase">TÍCH HỢP QUẢN TRỊ GMAIL CLOUD</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Gửi báo cáo chất lượng dây chuyền, cảnh báo CAPA & lịch sử sửa chữa tự động qua tài khoản Gmail cá nhân
          </p>
        </div>

        {/* Authentication Widget */}
        <div>
          {isLoadingAuth ? (
            <div className="flex items-center gap-2 text-indigo-200 text-xs bg-indigo-950/40 px-3 py-2 rounded-lg border border-indigo-800">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Đang kiểm tra kết nối...</span>
            </div>
          ) : googleUser ? (
            <div className="bg-slate-900 border border-slate-700/50 p-2.5 rounded-lg flex items-center justify-between gap-3 shadow-md max-w-[280px] md:max-w-[400px]">
              <div className="flex items-center gap-2.5 min-w-0">
                {googleUser.photoURL ? (
                  <img 
                    src={googleUser.photoURL} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full border border-indigo-500 shadow-inner" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-sm">
                    {googleUser.displayName?.charAt(0) || <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-100 truncate">{googleUser.displayName}</p>
                  <p className="text-[10px] text-indigo-300 truncate lowercase font-mono font-medium">{googleUser.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Đăng xuất tài khoản Google"
                className="p-1.5 rounded text-slate-400 hover:text-rose-450 hover:bg-slate-800 transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Official Google styled sign in button */
            <button 
              onClick={handleLogin}
              className="px-4 py-2 bg-white text-slate-700 hover:text-slate-950 rounded-lg hover:shadow-md border border-slate-300 font-extrabold text-xs transition duration-200 flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0" style={{ display: 'block' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>Kết nối Gmail của bạn</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-slate-205">
        
        {/* Left Side: Setup & Custom Configs */}
        <div className="lg:col-span-5 p-6 border-r border-slate-205 bg-slate-50 space-y-5">
          
          {/* Status logs */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex items-start gap-2.5 text-emerald-800 text-xs font-semibold animate-fadeIn">
              <Check className="w-4 h-4 font-bold stroke-[3] text-emerald-600 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2.5 text-red-800 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 stroke-[3] text-red-650 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Recipient Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông Tin Điểm Đến & Người Nhận</h3>
            
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Email Người Nhận (To) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="manager@dkbike.vn, group-qaqc@dkbike.vn"
                  className="w-full bg-slate-50 focus:bg-white border text-xs focus:ring-1 focus:ring-indigo-500 font-semibold focus:outline-none border-slate-205 rounded p-2 text-slate-800"
                  title="Có thể nhập nhiều email phân cách bằng dấu phẩy"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  💡 Điền nhanh / Gửi theo nhóm:
                </label>
                <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto pt-1">
                  <button
                    type="button"
                    onClick={() => activatePlanningGroup(selectedThread)}
                    className="text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer animate-pulse"
                    title={`Kích hoạt tự động điền & ngầm tìm kiếm luồng thư '${selectedThread}' để trả lời theo Luồng`}
                    id="btn-planning-group-re"
                  >
                    <span>👥 NHÓM BÁO CÁO KẾ HOẠCH (GỬI LUỒNG RE: {selectedThread.replace('GROUP BÁO CÁO KẾ HOẠCH ', '')})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFillStaffRecipient("sanxuat-manager@dkbike.vn");
                    }}
                    className="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Giám đốc Sản xuất"
                  >
                    <span>👥 Giám đốc Sản xuất</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFillStaffRecipient("xuonglaprap@dkbike.vn, thaisonqc@dkbike.vn");
                    }}
                    className="text-[10px] font-bold bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Tổ trưởng tổ lắp ráp & QA QC"
                  >
                    <span>👥 Xưởng Lắp Ráp & QC</span>
                  </button>
                  {staff.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        handleFillStaffRecipient(s.email);
                      }}
                      className="text-[10px] font-semibold bg-white border border-slate-205 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title={s.email}
                    >
                      <UserCheck className="w-3 h-3 text-indigo-500" />
                      <span>{s.name} ({s.role.split(' ')[0]})</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      handleFillStaffRecipient(initialSenderEmail);
                    }}
                    className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    title={initialSenderEmail}
                  >
                    <span>🎯 Tôi ({initialSenderName})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailTo('')}
                    className="text-[10px] font-bold bg-rose-55 hover:bg-rose-100 border border-rose-200 text-rose-800 p-1.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Xóa trắng danh sách người nhận hiện tại"
                  >
                    <span>🗑️ Xóa trắng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cấu Hình Gửi Theo Luồng: Threaded Reply configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cấu Hình Gửi Theo Luồng (Threaded Reply)</h3>
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isThreaded}
                  onChange={(e) => {
                    setIsThreaded(e.target.checked);
                    if (e.target.checked) {
                      activatePlanningGroup();
                    } else {
                      setThreadId(null);
                      setLastMessageId(null);
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-700 select-none">
                  Kích hoạt Gửi Trả Lời theo Luồng (Threaded Reply)
                </span>
              </label>

              {/* Thread Selector & Custom Addition */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Luồng báo cáo kế hoạch:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddThreadInput(!showAddThreadInput)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Thêm luồng mới</span>
                  </button>
                </div>

                {showAddThreadInput && (
                  <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-indigo-105 animate-fadeIn">
                    <input
                      type="text"
                      value={newThreadInput}
                      onChange={(e) => setNewThreadInput(e.target.value)}
                      placeholder="Nhập tiêu đề luồng..."
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPlanningThread(newThreadInput)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddThreadInput(false);
                        setNewThreadInput('');
                      }}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedThread}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedThread(val);
                      safeStorage.setItem('dk_selected_planning_thread', val);
                      if (isThreaded) {
                        activatePlanningGroup(val);
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-205 rounded p-1.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {planningThreads.map((thread) => (
                      <option key={thread} value={thread}>
                        {thread}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemovePlanningThread(selectedThread)}
                    title="Xóa luồng báo cáo này khỏi danh sách"
                    className="p-1.5 bg-red-50 hover:bg-red-105 border border-red-200 text-red-650 hover:text-red-700 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              </div>

              {isThreaded && (
                <div className="bg-indigo-50/75 border border-indigo-100 p-3 rounded-lg space-y-2.5 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-indigo-750 uppercase tracking-wide">Đối soát luồng Gmail:</span>
                    {isSearchingThread ? (
                      <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Đang định vị luồng...</span>
                    ) : threadId ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">🟢 ĐÃ LIÊN KẾT LUỒNG</span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">🔴 CHƯA LIÊN KẾT</span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Tiêu đề gốc tìm thấy từ Gmail:</p>
                    <p className="bg-white px-2 py-1.5 border border-slate-202 font-extrabold text-slate-800 rounded select-all text-xs shadow-2xs leading-none">
                      {selectedThread}
                    </p>
                  </div>
                  
                  {threadId && (
                    <div className="mt-1 space-y-1 font-mono text-[9.5px] bg-white p-2 border border-slate-200 rounded text-slate-500 divide-y divide-slate-100">
                      <div className="pb-1"><span className="font-bold text-slate-700">threadId:</span> <span className="select-all block leading-relaxed break-all font-semibold text-indigo-900">{threadId}</span></div>
                      <div className="pt-1"><span className="font-bold text-slate-705">Message-ID (Header):</span> <span className="select-all block break-all leading-relaxed pt-0.5 text-slate-600">{lastMessageId}</span></div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => activatePlanningGroup(selectedThread)}
                    disabled={isSearchingThread || !accessToken}
                    className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-[10px] font-black text-slate-700 rounded transition flex items-center justify-center gap-1 cursor-pointer active:scale-98 shadow-4xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSearchingThread ? 'animate-spin' : ''}`} />
                    <span>LÀM MỚI & TRUY VẤN GMAIL API</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preset Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mẫu Đơn Thư Đồng Bộ</h3>
            
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPresetMode('two_days')}
                className={`py-2 px-2 rounded text-[10px] font-black uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  presetMode === 'two_days' ? 'bg-indigo-650 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Báo Cáo 2 Ngày</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetMode('daily_log')}
                className={`py-2 px-2 rounded text-[10px] font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  presetMode === 'daily_log' ? 'bg-indigo-650 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Báo Cáo Ngày</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPresetMode('capa')}
                className={`py-2 px-2 rounded text-[10px] font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  presetMode === 'capa' ? 'bg-indigo-650 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cảnh báo CAPA</span>
              </button>

              <button
                type="button"
                onClick={() => setPresetMode('custom')}
                className={`py-2 px-2 rounded text-[10px] font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  presetMode === 'custom' ? 'bg-indigo-650 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Tùy Chỉnh Thư</span>
              </button>
            </div>

            {/* Sub configuration options per preset */}
            {presetMode === 'two_days' && (
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-3">
                <span className="text-[10px] font-black text-slate-600 block uppercase">📊 Chọn ngày báo cáo & kế hoạch:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">📅 Ngày báo cáo:</label>
                    <input 
                      type="date"
                      value={selectedReportDate}
                      onChange={(e) => setSelectedReportDate(e.target.value)}
                      className="w-full bg-slate-50 font-bold border rounded p-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">📅 Ngày kế hoạch:</label>
                    <input 
                      type="date"
                      value={selectedPlanDate}
                      onChange={(e) => setSelectedPlanDate(e.target.value)}
                      className="w-full bg-slate-50 font-bold border rounded p-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                  ⚡ Hệ thống sẽ đối soát kết hợp toàn bộ ghi nhận chất lượng ngày báo cáo và tiến độ chỉ định ngày kế hoạch để biên soạn email đôi độc quyền gửi trực tiếp.
                </p>
              </div>
            )}

            {presetMode === 'daily_log' && (
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-550 block uppercase">📅 Chọn ngày xuất báo cáo:</span>
                <input 
                  type="date"
                  value={selectedLogDate}
                  onChange={(e) => setSelectedLogDate(e.target.value)}
                  className="w-full bg-slate-50 font-bold border rounded p-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                  ⚡ Hệ thống sẽ tìm các hoạt động QA/QC đã ghi nhận của phòng QMS trong ngày được chọn và lập một bảng tổng hợp báo cáo bằng mã HTML cực kỳ gọn gàng.
                </p>
              </div>
            )}

            {presetMode === 'capa' && (
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-550 block uppercase">🔥 Chọn hồ sơ lỗi CAPA:</span>
                <div className="relative">
                  <select
                    value={selectedCapaId}
                    onChange={(e) => setSelectedCapaId(e.target.value)}
                    className="w-full bg-slate-50 font-bold border rounded p-2 pr-8 text-xs text-slate-800 cursor-pointer focus:outline-none appearance-none"
                  >
                    {capas.length > 0 ? (
                      capas.map((c: any) => (
                        <option key={c.id || c.CAPAID} value={c.id || c.CAPAID}>
                          {c.id || c.CAPAID} - {c.title || c.Issue || 'Lỗi CAPA'} ({c.source || 'Chung'})
                        </option>
                      ))
                    ) : (
                      <option value="">Không có hồ sơ CAPA</option>
                    )}
                  </select>
                  <div className="absolute top-2.5 right-2 text-slate-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                  ⚡ Điều phối viên kiểm sốt chất lượng nhấp gửi cảnh báo sẽ tạo thư mẫu có mã hóa màu trực quan (đỏ hành động) và gửi thẳng đến bộ phận trưởng xưởng.
                </p>
              </div>
            )}

            {presetMode === 'custom' && (
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">Chủ đề thư (Subject):</label>
                  <input 
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Chủ đề thư của bạn..."
                    className="w-full bg-slate-50 font-semibold border rounded p-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">Nội dung (Phần thân):</label>
                  <textarea 
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Nhập nội dung thư tự do..."
                    rows={4}
                    className="w-full bg-slate-50 font-medium border rounded p-2 text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* OQC LIVE DASHBOARD ON FRONTEND ADVANCED WORKSPACE */}
          {oqcDashboardData ? (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg space-y-3 text-white" id="oqc-live-dashboard">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-sky-450 rounded-full animate-ping" />
                  <span className="text-[10px] font-black tracking-wider uppercase text-sky-400">
                    📊 DASHBOARD CHẤT LƯỢNG OQC NGÀY {(presetMode === 'two_days' ? selectedReportDate : selectedLogDate).split('-').reverse().join('/')}
                  </span>
                </div>
                <span className="text-[9px] text-slate-450 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  Chốt số liệu
                </span>
              </div>

              {/* Grid metrics cards */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-slate-850 p-2 rounded-lg border border-slate-800/80 flex flex-col justify-center">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block leading-none mb-1">TỔNG KIỂM</span>
                  <strong className="text-xs font-black text-sky-400 font-mono leading-none">{oqcDashboardData.total}</strong>
                </div>
                <div className="bg-slate-850 p-2 rounded-lg border border-slate-800/80 flex flex-col justify-center">
                  <span className="text-[8px] text-emerald-400 font-bold uppercase block leading-none mb-1">ĐẠT CHUẨN</span>
                  <strong className="text-xs font-black text-emerald-400 font-mono leading-none">{oqcDashboardData.passed}</strong>
                </div>
                <div className="bg-slate-850 p-2 rounded-lg border border-slate-800/80 flex flex-col justify-center">
                  <span className="text-[8px] text-rose-400 font-bold uppercase block leading-none mb-1">CÓ LỖI</span>
                  <strong className="text-xs font-black text-rose-450 font-mono leading-none">{oqcDashboardData.failed}</strong>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-500/20 p-2 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] text-emerald-300 font-black uppercase block leading-none mb-1">YIELD RATE</span>
                  <strong className="text-xs font-black text-emerald-450 font-mono leading-none">{oqcDashboardData.yieldRate}%</strong>
                </div>
              </div>

              {/* Model stats list */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9.5px] font-extrabold text-slate-450 uppercase tracking-wider block">
                  Số lượng & Tỉ lệ đạt theo Model:
                </span>
                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 select-none scrollbar-thin">
                  {oqcDashboardData.models.map((m, i) => (
                    <div key={i} className="bg-slate-855/60 p-2 rounded-lg border border-slate-800 space-y-1 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-100 truncate max-w-[150px]">
                          🏍️ {m.model}
                        </span>
                        <span className={`text-[9.5px] font-bold px-1 py-0.5 rounded font-mono ${Number(m.yieldRate) < 95 ? "text-amber-400 bg-amber-950/20" : "text-emerald-400 bg-emerald-950/20"}`}>
                          Yield: {m.yieldRate}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium font-mono">
                        <span>Nghiệm thu: <strong className="text-slate-200">{m.total} xe</strong></span>
                        <span>Đạt: <strong className="text-emerald-400">{m.passed}</strong></span>
                        <span>Lỗi: <strong className={m.failed > 0 ? "text-rose-400 font-bold" : "text-slate-400"}>{m.failed}</strong></span>
                      </div>

                      {/* Top defects list */}
                      {m.topDefects.length > 0 ? (
                        <div className="pt-1 mt-1 border-t border-slate-800/60 space-y-0.5">
                          <span className="text-[8px] text-rose-300 font-bold uppercase tracking-wider block">Top lỗi nhiều nhất:</span>
                          <div className="space-y-0.5">
                            {m.topDefects.map((d, di) => (
                              <div key={di} className="flex justify-between items-center text-[10px] bg-rose-955/20 px-1.5 py-0.5 rounded border border-rose-900/10">
                                <span className="text-slate-300 truncate max-w-[180px]">⚠️ {d.defect}</span>
                                <span className="text-rose-400 font-sans font-bold text-[9.5px] shrink-0">{d.count} xe</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 mt-1 border-t border-slate-800/60 text-[9px] text-emerald-400 font-medium italic">
                          ✓ Đạt chất lượng kiểm xưởng 100%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 border-dashed p-3 rounded-xl text-center space-y-1 mt-4 text-slate-405" id="oqc-empty-dashboard">
              <Info className="w-4 h-4 text-slate-500 mx-auto" />
              <p className="text-[10.5px] font-bold text-slate-300">Không tìm thấy dữ liệu OQC ngày {(presetMode === 'two_days' ? selectedReportDate : selectedLogDate).split('-').reverse().join('/')}</p>
              <p className="text-[9px] text-slate-500 leading-normal">Hệ thống QMS chưa tải bất kỳ bản ghi kiểm định xuất xưởng nào cho thời gian được chọn.</p>
            </div>
          )}

          {/* Action trigger button */}
          <div className="pt-2">
            <button
              onClick={triggerEmailDispatch}
              disabled={isSending || isLoadingAuth}
              className={`w-full py-3 px-4 font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center justify-center gap-2 transition transform active:scale-95 ${
                !accessToken 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 border border-indigo-700 hover:bg-indigo-700 hover:border-indigo-800 text-white cursor-pointer hover:shadow-lg'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG GỬI DỮ LIỆU...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-indigo-250 shrink-0" />
                  <span>BẮT ĐẦU GỬI QUA GMAIL API</span>
                </>
              )}
            </button>
            {!accessToken && (
              <p className="text-[10px] text-amber-600 font-bold mt-2 text-center flex items-center justify-center gap-1">
                <Info className="w-3 h-3 text-amber-500" />
                <span>Bạn cần đăng nhập kết nối Gmail ở phía trên trước khi gửi.</span>
              </p>
            )}
          </div>

        </div>

        {/* Right Side: LIVE TEMPLATE EMAIL PREVIEW HTML */}
        <div className="lg:col-span-7 p-6 flex flex-col space-y-3 bg-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xem Thử Giao Diện Thư (Live Preview Email)</h3>
            <span className="text-[10px] bg-slate-200 border text-slate-600 font-mono font-bold px-2 py-0.5 rounded">Mã hóa Unicode</span>
          </div>

          {/* Email Client Wrapper */}
          <div className="flex-1 border bg-white rounded-lg shadow-xs overflow-hidden flex flex-col max-h-[620px]">
            {/* Mock client head */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 leading-tight space-y-1">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">To:</span> 
                <span className="text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px] leading-none mb-0.5">{emailTo || '...'}</span>
              </div>
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Subject:</span> 
                <span className="text-slate-800 font-extrabold">{emailSubject || '(Chưa nhập chủ đề)'}</span>
              </div>
            </div>

            {/* Email Body preview rendered as HTML sandboxed in a div or direct injection */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 text-xs">
              <div 
                className="bg-white rounded p-1 border shadow-2xs overflow-hidden"
                style={{ minHeight: '300px' }}
                dangerouslySetInnerHTML={{ __html: emailBody || '<p style="color:#94a3b8; text-align:center; padding-top:40px; font-style:italic;">Nội dung phong phú trống. Hãy chọn một mẫu bên trái.</p>' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Safety Confirm Dialog (Modal Component as Instructed in Workspace-integration Skills) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" id="gmail-safety-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-250 max-w-md w-full overflow-hidden animate-zoomIn">
            
            {/* Header */}
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-300" />
              <h4 className="text-xs font-black uppercase tracking-wider">Xác Nhận Hành Động Gửi Email</h4>
            </div>

            {/* Content info */}
            <div className="p-5 space-y-3.5">
              <div className="flex gap-2.5">
                <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-slate-800">
                    Bạn đang chuẩn bị gửi đi một bức thư tự động bằng Tài khoản Gmail của bạn.
                  </p>
                  <p className="text-xs text-slate-500 leading-normal">
                    Hành động này sẽ thực hiện gửi chính thức, không thể thu hồi sau khi phát đi. Hãy chắc chắn thông tin bên dưới là đúng đắn:
                  </p>
                </div>
              </div>

              {/* Summary target */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed space-y-1.5">
                <div>
                  <span className="text-slate-400 font-bold">Người gửi:</span>{' '}
                  <strong className="text-slate-800 lowercase font-mono">{googleUser?.email}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Người nhận (To):</span>{' '}
                  <strong className="text-indigo-600 font-mono font-extrabold">{emailTo}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Chủ đề (Subject):</span>{' '}
                  <strong className="text-slate-800 font-semibold">{emailSubject}</strong>
                </div>
                {presetMode === 'daily_log' && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 font-bold mt-1">
                    📊 Báo cáo bao gồm {getPreviewEmailContent().count} bản ghi QA/QC ngày {getPreviewEmailContent().formattedDate}.
                  </div>
                )}
                {presetMode === 'two_days' && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 font-bold mt-1">
                    📊 Báo cáo kép bao gồm {getPreviewEmailContent().todayCount} công việc ngày {getPreviewEmailContent().todayStr} và {getPreviewEmailContent().tomorrowCount} kế hoạch ngày {getPreviewEmailContent().tomorrowStr}.
                  </div>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="bg-slate-50 border-t border-slate-205 px-5 py-3.5 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 transition font-extrabold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              
              <button
                type="button"
                onClick={handleSendConfirmed}
                className="px-5 py-2 text-white bg-indigo-650 hover:bg-indigo-700 transition font-black rounded-lg cursor-pointer flex items-center gap-1 shadow-sm hover:shadow"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Tôi đồng ý gửi ngay</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
