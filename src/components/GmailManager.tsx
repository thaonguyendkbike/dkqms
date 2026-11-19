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
import { getLocalYmd } from '../utils/dateUtils';

interface GmailManagerProps {
  dailyLogs: DailyLogRecord[];
  staff: QualityStaff[];
  capas: CAPA[];
  initialSenderName?: string;
  initialSenderEmail?: string;
  oqcRecords?: any[];
  oqcColorChanges?: any[];
  embeddedMode?: boolean;
  externalPreset?: { subject: string; bodyHtml: string; triggerKey: number } | null;
}

export default function GmailManager({ 
  dailyLogs, 
  staff, 
  capas,
  initialSenderName = "Nguyễn Xuân Thao",
  initialSenderEmail = "thaonguyendkbike@gmail.com",
  oqcRecords = [],
  oqcColorChanges = [],
  embeddedMode = false,
  externalPreset = null
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
  const [selectedLogDate, setSelectedLogDate] = useState(() => getLocalYmd());
  const [selectedReportDate, setSelectedReportDate] = useState(() => getLocalYmd());
  const [selectedPlanDate, setSelectedPlanDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalYmd(tomorrow);
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
    // Reset old thread context to prevent sending to old thread
    setThreadId(null);
    setLastMessageId(null);
    setSuccessMessage(`Đã thêm luồng mới: "${trimmed}"`);
    setTimeout(() => setSuccessMessage(''), 4000);
    // Auto-search for the new thread if threaded mode is active
    if (isThreaded) {
      activatePlanningGroup(trimmed);
    }
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

  // Apply external report preset (e.g., from Weekly/Monthly Reports)
  useEffect(() => {
    if (externalPreset && externalPreset.triggerKey) {
      setPresetMode('custom');
      setEmailSubject(externalPreset.subject);
      setEmailBody(externalPreset.bodyHtml);
    }
  }, [externalPreset?.triggerKey]);

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

      const colorChangesToday = (oqcColorChanges || []).filter(item => {
        const cDate = parseLogDate(item.date || '');
        return cDate ? sameDay(cDate, today) : false;
      });

      const colorChangesTomorrow = (oqcColorChanges || []).filter(item => {
        const cDate = parseLogDate(item.date || '');
        return cDate ? sameDay(cDate, tomorrow) : false;
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
        oqcTomorrow,
        colorChangesToday,
        colorChangesTomorrow
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

      const colorChangesSelected = (oqcColorChanges || []).filter(item => {
        const cDate = parseLogDate(item.date || '');
        return cDate && logsDate ? (cDate.getFullYear() === logsDate.getFullYear() && cDate.getMonth() === logsDate.getMonth() && cDate.getDate() === logsDate.getDate()) : (item.date === selectedLogDate || item.date === ddmmyyyy);
      });

      const subject = `[DKBike QMS] Báo cáo công việc QA/QC ngày ${ddmmyyyy}`;
      const senderName = googleUser?.displayName || initialSenderName;
      const htmlBody = generateDailyLogEmailTemplate(filteredLogs, ddmmyyyy, senderName, oqcSelected, colorChangesSelected);
      
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
  }, [isThreaded, presetMode, selectedLogDate, selectedReportDate, selectedPlanDate, selectedCapaId, dailyLogs, googleUser, selectedThread, oqcColorChanges]);

  useEffect(() => {
    if (presetMode !== 'custom') {
      const preview = getPreviewEmailContent();
      setEmailBody(preview.htmlBody);
    }
  }, [presetMode, selectedLogDate, selectedReportDate, selectedPlanDate, selectedCapaId, dailyLogs, googleUser, oqcColorChanges]);

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
    <div className="space-y-4" id="gmail-manager-root">

      {/* Status Alerts */}
      {(successMessage || errorMessage) && (
        <div className="space-y-2">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* PHẦN 1: CHỌN LOẠI BÁO CÁO (NHẬT TRÌNH NGÀY / BÁO CÁO 2 NGÀY) + CHỌN NGÀY */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 2 nút chọn */}
            <div className="inline-flex rounded-xl border-2 border-slate-300 bg-slate-100 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setPresetMode('daily_log')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  presetMode === 'daily_log' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Nhật trình ngày</span>
              </button>
              <button
                type="button"
                onClick={() => setPresetMode('two_days')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  presetMode === 'two_days' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Báo cáo 2 ngày</span>
              </button>
            </div>

            {/* Chọn ngày đi kèm ngay bên cạnh */}
            {presetMode === 'daily_log' ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Ngày báo cáo:</label>
                <input
                  type="date"
                  value={selectedLogDate}
                  onChange={(e) => setSelectedLogDate(e.target.value)}
                  className="bg-slate-50 font-bold border-2 border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Ngày báo cáo:</label>
                  <input
                    type="date"
                    value={selectedReportDate}
                    onChange={(e) => setSelectedReportDate(e.target.value)}
                    className="bg-slate-50 font-bold border-2 border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Ngày kế hoạch:</label>
                  <input
                    type="date"
                    value={selectedPlanDate}
                    onChange={(e) => setSelectedPlanDate(e.target.value)}
                    className="bg-slate-50 font-bold border-2 border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tóm tắt OQC ngày gọn */}
          {oqcDashboardData ? (
            <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="font-bold text-slate-600">
                OQC {(presetMode === 'two_days' ? selectedReportDate : selectedLogDate).split('-').reverse().join('/')}:
              </span>
              <span className="font-mono font-extrabold text-slate-900">{oqcDashboardData.total} xe</span>
              <span className="text-emerald-700 font-bold">Đạt {oqcDashboardData.passed}</span>
              <span className={`font-bold ${oqcDashboardData.failed > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                Lỗi {oqcDashboardData.failed}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold font-mono text-[11px]">
                Yield {oqcDashboardData.yieldRate}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">
              Chưa có dữ liệu OQC ngày {(presetMode === 'two_days' ? selectedReportDate : selectedLogDate).split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {oqcDashboardData && oqcDashboardData.models.length > 0 && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Theo dòng xe:</span>
            {oqcDashboardData.models.map((m, i) => (
              <span
                key={i}
                className={`text-xs px-2.5 py-0.5 rounded-lg border font-semibold ${
                  m.failed > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {m.model}: {m.passed}/{m.total} ({m.yieldRate}%)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PHẦN 2: XEM NỘI DUNG BÁO CÁO (TOÀN CHIỀU NGANG) */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Xem nội dung báo cáo
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-700 truncate max-w-full">
            {emailSubject || '(Chưa có tiêu đề)'}
          </span>
        </div>

        <div className="p-5 overflow-x-auto bg-white">
          <div
            className="max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{
              __html:
                emailBody ||
                '<p style="color:#94a3b8; text-align:center; padding:40px 0; font-style:italic;">Chưa có nội dung báo cáo cho ngày đã chọn.</p>'
            }}
          />
        </div>
      </div>

      {/* PHẦN 3: CHỨC NĂNG GỬI GMAIL */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* Header kết nối Gmail */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                Gửi báo cáo qua Gmail
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn người nhận, cấu hình gửi theo luồng (nếu cần) và gửi trực tiếp qua tài khoản Google
              </p>
            </div>
          </div>

          <div>
            {isLoadingAuth ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>Đang kiểm tra Gmail...</span>
              </div>
            ) : googleUser ? (
              <div className="bg-white border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-slate-800 truncate">{googleUser.displayName}</p>
                    <p className="text-[10px] text-emerald-700 truncate font-mono">{googleUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất tài khoản Google"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-3.5 py-2 bg-white text-slate-700 hover:text-slate-950 rounded-xl hover:shadow-sm border border-slate-300 font-extrabold text-xs transition duration-150 flex items-center gap-2 cursor-pointer"
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

        {/* Nội dung cấu hình gửi Gmail */}
        <div className="p-5 space-y-4">
          {!accessToken && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Anh cần bấm &ldquo;Kết nối Gmail của bạn&rdquo; ở góc trên bên phải trước khi gửi.</span>
            </div>
          )}

          {/* Người nhận */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-600 uppercase">
              Email người nhận (To) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="manager@dkbike.vn, group-qaqc@dkbike.vn"
              className="w-full bg-slate-50 focus:bg-white border-2 border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => activatePlanningGroup(selectedThread)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                id="btn-planning-group-re"
              >
                👥 Nhóm Báo cáo ({selectedThread.replace('GROUP BÁO CÁO KẾ HOẠCH ', '')})
              </button>
              <button
                type="button"
                onClick={() => handleFillStaffRecipient('sanxuat-manager@dkbike.vn')}
                className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                GĐ Sản xuất
              </button>
              <button
                type="button"
                onClick={() => handleFillStaffRecipient('xuonglaprap@dkbike.vn, thaisonqc@dkbike.vn')}
                className="text-xs font-bold bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                Xưởng Lắp Ráp &amp; QC
              </button>
              {staff.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleFillStaffRecipient(s.email)}
                  className="text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title={s.email}
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{s.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleFillStaffRecipient(initialSenderEmail)}
                className="text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                Tôi ({initialSenderName})
              </button>
              <button
                type="button"
                onClick={() => setEmailTo('')}
                className="text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                Xóa trắng
              </button>
            </div>
          </div>

          {/* Gửi trả lời theo luồng */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                <span className="text-xs font-bold text-slate-700 select-none">
                  Gửi trả lời theo luồng (Threaded Reply)
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowAddThreadInput(!showAddThreadInput)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm luồng mới
              </button>
            </div>

            {showAddThreadInput && (
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-indigo-200">
                <input
                  type="text"
                  value={newThreadInput}
                  onChange={(e) => setNewThreadInput(e.target.value)}
                  placeholder="Nhập tiêu đề luồng..."
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleAddPlanningThread(newThreadInput)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddThreadInput(false); setNewThreadInput(''); }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedThread}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedThread(val);
                  safeStorage.setItem('dk_selected_planning_thread', val);
                  setThreadId(null);
                  setLastMessageId(null);
                  if (isThreaded) activatePlanningGroup(val);
                }}
                className="flex-1 min-w-[240px] bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {planningThreads.map((thread) => (
                  <option key={thread} value={thread}>{thread}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleRemovePlanningThread(selectedThread)}
                title="Xóa luồng báo cáo này"
                className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {isThreaded && (
                <>
                  {isSearchingThread ? (
                    <span className="text-xs font-bold text-indigo-600">Đang tìm luồng...</span>
                  ) : threadId ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                      🟢 Đã liên kết luồng
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
                      🔴 Chưa liên kết luồng
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => activatePlanningGroup(selectedThread)}
                    disabled={isSearchingThread || !accessToken}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSearchingThread ? 'animate-spin' : ''}`} />
                    <span>Đồng bộ luồng</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nút Gửi Gmail */}
          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={triggerEmailDispatch}
              disabled={isSending || isLoadingAuth}
              className={`px-6 py-2.5 font-extrabold text-sm rounded-xl shadow-sm flex items-center gap-2 transition ${
                !accessToken
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi qua Gmail</span>
                </>
              )}
            </button>
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
