import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const safeConfig = {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey || 'AIzaSyAz6X3rJv4ScGNSoo7fsuFUKyEd4VAQrac'
};
const app = getApps().length === 0 ? initializeApp(safeConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Gmail scopes
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

// Auth states & flags
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được mã Access Token từ Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google Auth:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sign out
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// UTF-8 safe base64url encoder for RFC 2822 Emails
const makeRawEmail = (to: string, subject: string, htmlBody: string, lastMessageId?: string) => {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
  ];
  if (lastMessageId) {
    emailLines.push(`In-Reply-To: ${lastMessageId}`);
    emailLines.push(`References: ${lastMessageId}`);
  }
  emailLines.push('');
  emailLines.push(htmlBody);
  const email = emailLines.join('\r\n');

  // Convert string to UTF-8 bytes to prevent unicode breakage
  const utf8Bytes = new TextEncoder().encode(email);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Send email via Gmail API with Thread Support
export const sendGmailMessage = async (
  token: string, 
  to: string, 
  subject: string, 
  htmlBody: string,
  threadId?: string,
  lastMessageId?: string
): Promise<{ id: string; threadId: string }> => {
  const raw = makeRawEmail(to, subject, htmlBody, lastMessageId);
  
  const bodyObj: any = { raw };
  if (threadId) {
    bodyObj.threadId = threadId;
  }
  
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyObj)
  });
  
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || 'Có lỗi xảy ra khi gọi Gmail API.');
  }
  
  return response.json();
};

// Search relative thread and fetch threadId + Internet Message-ID of the latest message in thread
export const searchGmailMessageForThread = async (
  token: string,
  subjectQuery: string
): Promise<{ threadId: string; lastMessageId: string; threadEmails?: string } | null> => {
  try {
    const q = encodeURIComponent(`subject:"${subjectQuery}"`);
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=3`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!listRes.ok) {
      const errData = await listRes.json();
      throw new Error(errData.error?.message || 'Không thể tìm kiếm tin nhắn trên Gmail.');
    }
    
    const listData = await listRes.json();
    if (!listData.messages || listData.messages.length === 0) {
      return null;
    }
    
    // Gmail API returns messages sorted by date descending. The first item is the most recent.
    const latestMsg = listData.messages[0];
    const msgId = latestMsg.id;
    const threadId = latestMsg.threadId;
    
    // Fetch detailed message headers to extract standard Internet Message-ID
    const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!detailRes.ok) {
      // Fallback if detail fetch fails
      return { threadId, lastMessageId: `<${msgId}@mail.gmail.com>` };
    }
    
    const detailData = await detailRes.json();
    const headers = detailData.payload?.headers || [];
    const messageIdHeader = headers.find((h: any) => h.name.toLowerCase() === 'message-id');
    const lastMessageId = messageIdHeader ? messageIdHeader.value : `<${msgId}@mail.gmail.com>`;
    
    // Extract To, Cc, From headers to get thread emails
    const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
    const ccHeader = headers.find((h: any) => h.name.toLowerCase() === 'cc')?.value || '';
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
    
    // Parse email addresses from headers
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allEmails = `${toHeader} ${ccHeader} ${fromHeader}`.match(emailRegex) || [];
    
    // De-duplicate and filter
    const uniqueEmails = Array.from(new Set(allEmails.map(e => e.toLowerCase().trim())));
    const threadEmails = uniqueEmails.join(', ');
    
    return { threadId, lastMessageId, threadEmails };
  } catch (error) {
    console.error('Lỗi khi định vị luồng thư của Gmail:', error);
    throw error;
  }
};

const getLastName = (fullName?: string): string => {
  if (!fullName) return '';
  const separators = /[,;/&\\+\|]|\s+và\s+|\s+and\s+/i;
  const parts = fullName.split(separators);
  if (parts.length > 1) {
    return parts
      .map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        const words = trimmed.split(/\s+/);
        return words[words.length - 1] || '';
      })
      .filter(Boolean)
      .join(', ');
  }
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] || '';
};

// HELPER TO RENDER HIGH-FIDELITY CONSOLIDATED OQC SECTION IN EMAILS
const renderOqcHtmlSection = (oqcList: any[], titleText: string) => {
  if (!oqcList || oqcList.length === 0) {
    return `
      <!-- OQC SECTION (EMPTY) -->
      <div style="margin-bottom: 25px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; background-color: #f8fafc; font-size: 13px; color: #64748b; text-align: center;">
        <strong>📋 ${titleText}:</strong> Chưa có dữ liệu nghiệm thu xuất xưởng (OQC) được chốt cho ngày này.
      </div>
    `;
  }

  const totalOqc = oqcList.length;
  const passedList = oqcList.filter(rec => {
    if (rec.status === 'Đạt') return true;
    if (rec.status === 'Lỗi') return false;
    const details = rec.defectDetail ? rec.defectDetail.trim().toLowerCase() : '';
    if (!details || details === 'không' || details === 'sạch không lỗi' || details === 'ok' || details === 'pass' || details.includes('sạch')) {
      return true;
    }
    return false;
  });
  const passedOqc = passedList.length;
  const failedOqc = totalOqc - passedOqc;
  const yieldRate = totalOqc > 0 ? ((passedOqc / totalOqc) * 100).toFixed(1) : "100.0";

  // Group stats by model to structure model, pass rate, defective, top defects per model
  const modelStatsMap = new Map<string, {
    model: string;
    total: number;
    passed: number;
    failed: number;
    defectMap: Map<string, number>;
  }>();

  oqcList.forEach(rec => {
    const rawModel = rec.model || 'Dòng xe thô';
    const modelName = rawModel.trim();
    if (!modelStatsMap.has(modelName)) {
      modelStatsMap.set(modelName, {
        model: modelName,
        total: 0,
        passed: 0,
        failed: 0,
        defectMap: new Map<string, number>()
      });
    }

    const stat = modelStatsMap.get(modelName)!;
    stat.total++;

    const isPassed = rec.status === 'Đạt' || (rec.status !== 'Lỗi' && (!rec.defectDetail || rec.defectDetail.trim() === '' || rec.defectDetail.trim().toLowerCase() === 'không' || rec.defectDetail.trim().toLowerCase() === 'ok' || rec.defectDetail.trim().toLowerCase() === 'pass'));

    if (isPassed) {
      stat.passed++;
    } else {
      stat.failed++;
      const defDetail = rec.defectDetail ? rec.defectDetail.trim() : 'Lỗi ngoại quan';
      const failedCountVal = Number(rec.failedCount) || 1;
      stat.defectMap.set(defDetail, (stat.defectMap.get(defDetail) || 0) + failedCountVal);
    }
  });

  const modelStatsList = Array.from(modelStatsMap.values()).map(stat => {
    const modelYield = stat.total > 0 ? ((stat.passed / stat.total) * 100).toFixed(1) : "100.0";
    const sortedDefects = Array.from(stat.defectMap.entries())
      .map(([defect, count]) => ({ defect, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return {
      ...stat,
      yieldRate: modelYield,
      topDefects: sortedDefects
    };
  });

  // Render HTML rows for Model stats
  const modelRowsHtml = modelStatsList.map((mStat, idx) => {
    let defectSummaryText = '';
    if (mStat.topDefects.length === 0) {
      defectSummaryText = '<span style="color:#047857; font-weight:600;">✓ Sạch lỗi 100% (Đạt tuyệt đối)</span>';
    } else {
      defectSummaryText = mStat.topDefects.map(d => `• Lỗi: <strong>${d.defect}</strong> (ảnh hưởng <span style="color:#e11d48; font-weight:bold;">${d.count} xe</span>)`).join('<br/>');
    }

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px; background-color: ${mStat.failed > 0 ? '#fffbf8' : '#ffffff'};">
        <td style="padding: 12px 10px; font-weight: bold; color: #64748b; font-family: monospace; width: 4%; min-width: 35px;">${idx + 1}</td>
        <td style="padding: 12px 10px; font-weight: 800; color: #1e293b; width: 12%; min-width: 100px;">
          <span style="padding: 3px 8px; background-color: #f1f5f9; border-radius: 4px; border-left: 3.5px solid #2563eb;">
            ${mStat.model}
          </span>
        </td>
        <td style="padding: 12px 10px; text-align: center; font-weight: bold; color: #2563eb; width: 8%; min-width: 70px;">${mStat.total} xe</td>
        <td style="padding: 12px 10px; text-align: center; font-weight: bold; color: #16a34a; width: 8%; min-width: 70px;">${mStat.passed} xe</td>
        <td style="padding: 12px 10px; text-align: center; font-weight: bold; color: ${mStat.failed > 0 ? '#dc2626' : '#64748b'}; width: 8%; min-width: 70px;">${mStat.failed} xe</td>
        <td style="padding: 12px 10px; text-align: center; font-weight: 900; font-family: monospace; color: ${Number(mStat.yieldRate) < 95 ? '#ea580c' : '#16a34a'}; width: 10%; min-width: 80px;">
          ${mStat.yieldRate}%
        </td>
        <td style="padding: 12px 10px; font-size: 11.5px; color: #431407; width: 50%; min-width: 250px; line-height: 1.5; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word;">
          ${defectSummaryText}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!-- OQC HIGH-FIDELITY DASHBOARD & MODEL PERFORMANCE -->
    <div style="margin-top: 25px; margin-bottom: 25px; border: 1px solid #0284c7; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08); font-family: system-ui, -apple-system, sans-serif;">
      
      <!-- Header -->
      <div style="background-image: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 15px 20px; color: #ffffff;">
        <strong style="font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
          🚚 ${titleText}
        </strong>
      </div>
      
      <!-- Key KPI Numbers (Metrics Summary Card) -->
      <div style="padding: 15px 20px; background-color: #f0f9ff; border-bottom: 1.5px solid #bae6fd; display: table; width: 100%; box-sizing: border-box;">
        <div style="display: table-row; width: 100%;">
          <div style="display: table-cell; width: 25%; padding: 6px; text-align: center; border-right: 1px solid #e0f2fe; vertical-align: middle;">
            <span style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 3px;">TỔNG NGHIỆM THU</span>
            <strong style="font-size: 18px; color: #0369a1; font-family:-apple-system,BlinkMacSystemFont,monospace;">${totalOqc} xe</strong>
          </div>
          <div style="display: table-cell; width: 25%; padding: 6px; text-align: center; border-right: 1px solid #e0f2fe; vertical-align: middle;">
            <span style="font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 3px;">ĐẠT TIÊU CHUẨN</span>
            <strong style="font-size: 18px; color: #16a34a; font-family:-apple-system,BlinkMacSystemFont,monospace;">${passedOqc} xe</strong>
          </div>
          <div style="display: table-cell; width: 25%; padding: 6px; text-align: center; border-right: 1px solid #e0f2fe; vertical-align: middle;">
            <span style="font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 3px;">PHÁT HIỆN LỖI</span>
            <strong style="font-size: 18px; color: #dc2626; font-family:-apple-system,BlinkMacSystemFont,monospace;">${failedOqc} xe</strong>
          </div>
          <div style="display: table-cell; width: 25%; padding: 6px; text-align: center; vertical-align: middle;">
            <span style="padding: 6px 14px; background-color: #0284c7; color: #ffffff; border-radius: 20px; font-weight: 900; font-family:-apple-system,BlinkMacSystemFont,monospace; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
              OQC YIELD: ${yieldRate}%
            </span>
          </div>
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div style="padding: 15px;">
        <div style="color: #475569; font-size: 11px; font-weight: bold; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
          📊 DASHBOARD CHI TIẾT OQC THEO TỪNG MODEL XE ĐIỆN DKBike
        </div>
        
        <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 600px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 11px; color: #475569; text-transform: uppercase; font-weight: 800;">
                <th style="padding: 10px; width: 4%; min-width: 35px;">STT</th>
                <th style="padding: 10px; width: 12%; min-width: 100px;">Dòng Xe (Model)</th>
                <th style="padding: 10px; text-align: center; width: 8%; min-width: 70px;">Tổng Kiểm</th>
                <th style="padding: 10px; text-align: center; width: 8%; min-width: 70px;">Đạt chuẩn</th>
                <th style="padding: 10px; text-align: center; width: 8%; min-width: 70px;">Xe Lỗi</th>
                <th style="padding: 10px; text-align: center; width: 10%; min-width: 80px;">Tỉ Lệ Đạt</th>
                <th style="padding: 10px; width: 50%; min-width: 250px;">Phân tích Top lỗi xuất hiện nhiều theo Model</th>
              </tr>
            </thead>
            <tbody>
              ${modelRowsHtml}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 15px; font-size: 11.5px; color: #64748b; line-height: 1.45; background-color: #f8fafc; padding: 10px 12px; border-radius: 6px; border-left: 3.5px solid #0284c7;">
          💡 <strong>Chú thích:</strong> Các lỗi hư hỏng trên sườn sản xuất (như lệch ngàm nhựa, trầy xước nước sơn, độ rơ tay ga...) được nhân sự OQC kiểm chuẩn kĩ càng tại công đoạn kiểm tra chất lượng xuất xưởng của nhà máy xe điện DKBike để kịp thời đưa vào trạm sửa chữa (Rework) trước khi xuất thành phẩm bàn giao cho Tổng kho điều phối.
        </div>
      </div>
    </div>
  `;
};

// Generate Template layouts
export const generateDailyLogEmailTemplate = (logs: any[], dateStr: string, senderName: string, oqcRecords?: any[]) => {
  const rows = logs.map((log, idx) => `
    <tr style="border-bottom: 1px solid #e1e8ed;">
      <td data-label="STT" style="padding: 10px; font-weight: bold; font-family: monospace; color: #475569; white-space: nowrap; width: 4%; min-width: 40px; max-width: 40px;">${idx + 1}</td>
      <td data-label="Hạng Mục" style="padding: 10px; color: #1e293b; font-weight: 600; width: 15%; min-width: 120px;">
        <span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; line-height: 1.25; word-break: keep-all; ${
          log.category === 'IQC' ? 'background-color: #fce8e6; color: #a51d24;' :
          log.category === 'PQC' ? 'background-color: #fef3c7; color: #b45309;' :
          log.category === 'OQC' ? 'background-color: #ecfdf5; color: #047857;' :
          log.category === 'SQC/QA' ? 'background-color: #fce8e6; color: #a51d24; border: 1px solid #fecdd3;' :
          'background-color: #f1f5f9; color: #475569;'
        }">${log.category || 'QA/QC'}</span>
      </td>
      <td data-label="Công Việc" style="padding: 10px; color: #1e293b; line-height: 1.4; width: 29%; min-width: 210px; page-break-inside: avoid; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${(log.content || '').replace(/\n/g, '<br/>')}</td>
      <td data-label="Chỉ Tiêu" style="padding: 10px; color: #475569; text-align: center; white-space: nowrap; width: 11%; min-width: 90px;">${log.target || '1'} / ${log.unit || 'Lượt'}</td>
      <td data-label="Hiệu Suất" style="padding: 10px; color: #1e293b; font-weight: bold; text-align: center; white-space: nowrap; width: 9%; min-width: 75px;">${log.statusPercent || '100%'}</td>
      <td data-label="Đánh Giá" style="padding: 10px; color: #334155; line-height: 1.4; width: 23%; min-width: 185px; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${(log.note || '-').replace(/\n/g, '<br/>')}</td>
      <td data-label="Nhân Sự" style="padding: 10px; color: #64748b; font-size: 11px; font-family: sans-serif; white-space: nowrap; width: 9%; min-width: 70px; text-overflow: ellipsis; overflow: hidden;">${getLastName(log.assignee) || ''}</td>
    </tr>
  `).join('');

  return `
    <div class="email-wrapper" style="background-color: #f8fafc; padding: 30px; font-family: system-ui, -apple-system, sans-serif;">
      
      <style>
        /* Modern high-quality responsive email layout */
        @media only screen and (max-width: 768px) {
          .email-wrapper {
            padding: 10px !important;
          }
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 8px !important;
          }
          .email-header {
            padding: 24px 15px !important;
          }
          .email-header h2 {
            font-size: 18px !important;
          }
          .email-body {
            padding: 16px 12px !important;
          }
          
          /* Transform tables to clean touch-focused mobile cards */
          .responsive-table {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table thead {
            display: none !important;
          }
          .responsive-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table tr {
            display: block !important;
            width: 100% !important;
            margin-bottom: 16px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 12px 14px !important;
            background-color: #ffffff !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
            box-sizing: border-box !important;
          }
          .responsive-table td {
            display: block !important;
            width: 100% !important;
            padding: 5px 0 !important;
            border-bottom: 1px dotted #f1f5f9 !important;
            text-align: left !important;
            font-size: 13px !important;
            box-sizing: border-box !important;
          }
          .responsive-table td:last-child {
            border-bottom: none !important;
          }
          
          /* Dynamic label display */
          .responsive-table td::before {
            content: attr(data-label) ": ";
            display: inline-block;
            width: 95px;
            font-weight: 800;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            margin-right: 10px;
            text-align: center;
          }
          
          /* Summary cards stackable row */
          .metrics-table, .metrics-table tr, .metrics-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .metrics-table td {
            padding: 6px 10px !important;
            border-bottom: 1px solid #e0f2fe !important;
            text-align: left !important;
          }
          .metrics-table td:last-child {
            border-bottom: none !important;
          }
          
          /* CAPA tabular stack */
          .capa-details-table, .capa-details-table tr, .capa-details-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .capa-details-table tr {
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 8px 0 !important;
          }
          .capa-details-table td {
            padding: 4px 0 !important;
          }
          .capa-details-table td:first-child {
            font-weight: 850 !important;
            color: #475569 !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
        }
      </style>

      <div class="email-container" style="max-width: 950px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
        
        <!-- Header -->
        <div class="email-header" style="background-image: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); padding: 30px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">
             Báo Cáo Công Việc QA/QC DKBike
          </h2>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">
            Ngày gửi báo cáo: <strong style="color: #38bdf8;">${dateStr}</strong> | Người lập: <strong>${senderName}</strong>
          </p>
        </div>

        <!-- Body -->
        <div class="email-body" style="padding: 24px;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; font-weight: 500;">
            Xin chào Qúy Ban Giám đốc và Quản lý phòng QA/QC,<br/>
            Dưới đây là chi tiết kết quả ghi nhận công việc kiểm soát chất lượng (QMS Daily Logs) ngày <strong>${dateStr}</strong>:
          </p>

          <!-- Table -->
          <div style="width: 100%; min-width: 100%; display: block; clear: both; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; margin: 15px 0;">
            <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; min-width: 820px; border-collapse: collapse; font-size: 13px; text-align: left; table-layout: fixed;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; width: 4%; min-width: 40px; white-space: nowrap;">STT</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; width: 15%; min-width: 120px;">Mục</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; width: 29%; min-width: 210px;">Nội Dung Công Việc</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; text-align: center; width: 11%; min-width: 90px; white-space: nowrap;">Mục Tiêu/ĐVT</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; text-align: center; width: 9%; min-width: 75px; white-space: nowrap;">Hiệu Suất</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; width: 23%; min-width: 185px;">Đánh giá</th>
                  <th style="padding: 12px 10px; font-weight: 700; color: #334155; width: 9%; min-width: 70px; white-space: nowrap;">Nhân Sự</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length > 0 ? rows : `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #94a3b8; font-style: italic;">Không có công việc nào được báo cáo.</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- OQC Dynamic Section -->
          ${oqcRecords ? renderOqcHtmlSection(oqcRecords, `TỔNG HỢP KẾT QUẢ NGHIỆM THU OQC XUẤX XƯỞNG NGÀY ${dateStr}`) : ''}

          <!-- Bottom Summary Status -->
          <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; font-size: 13px;">
            <strong style="color: #1e293b; display: block; margin-bottom: 5px;">📍 Ghi chú tổng hợp:</strong>
            <span style="color: #475569;">Báo cáo được lập tự động từ DK QMS Cloud Dashboard. Mọi thông tin phản hồi, xin phản hồi trực tiếp qua hòm thư của người báo cáo.</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 5px 0; font-weight: 600;">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG SẢN XUẤT DKBIKE - QMS CLOUD</p>
          <p style="margin: 0;">Trụ sở: Lạng Sơn, Việt Nam | Bản quyền thuộc về DK Việt Nhật</p>
        </div>
      </div>
    </div>
  `;
};

export const generateCapaEmailTemplate = (capa: any, senderName: string) => {
  return `
    <div class="email-wrapper" style="background-color: #f8fafc; padding: 30px; font-family: system-ui, -apple-system, sans-serif;">
      
      <style>
        /* Modern high-quality responsive email layout */
        @media only screen and (max-width: 768px) {
          .email-wrapper {
            padding: 10px !important;
          }
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 8px !important;
          }
          .email-header {
            padding: 24px 15px !important;
          }
          .email-header h2 {
            font-size: 18px !important;
          }
          .email-body {
            padding: 16px 12px !important;
          }
          
          /* Transform tables to clean touch-focused mobile cards */
          .responsive-table {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table thead {
            display: none !important;
          }
          .responsive-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table tr {
            display: block !important;
            width: 100% !important;
            margin-bottom: 16px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 12px 14px !important;
            background-color: #ffffff !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
            box-sizing: border-box !important;
          }
          .responsive-table td {
            display: block !important;
            width: 100% !important;
            padding: 5px 0 !important;
            border-bottom: 1px dotted #f1f5f9 !important;
            text-align: left !important;
            font-size: 13px !important;
            box-sizing: border-box !important;
          }
          .responsive-table td:last-child {
            border-bottom: none !important;
          }
          
          /* Dynamic label display */
          .responsive-table td::before {
            content: attr(data-label) ": ";
            display: inline-block;
            width: 95px;
            font-weight: 800;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            margin-right: 10px;
            text-align: center;
          }
          
          /* Summary cards stackable row */
          .metrics-table, .metrics-table tr, .metrics-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .metrics-table td {
            padding: 6px 10px !important;
            border-bottom: 1px solid #e0f2fe !important;
            text-align: left !important;
          }
          .metrics-table td:last-child {
            border-bottom: none !important;
          }
          
          /* CAPA tabular stack */
          .capa-details-table, .capa-details-table tr, .capa-details-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .capa-details-table tr {
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 8px 0 !important;
          }
          .capa-details-table td {
            padding: 4px 0 !important;
          }
          .capa-details-table td:first-child {
            font-weight: 850 !important;
            color: #475569 !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
        }
      </style>

      <div class="email-container" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
        
        <!-- Header -->
        <div class="email-header" style="background-image: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); padding: 30px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">
             🔥 CẢNH BÁO HÀNH ĐỘNG KHẮC PHỤC - CAPA
          </h2>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            Mã yêu cầu: <strong style="color: #fca5a5;">${capa.id || 'CAPA-NEW'}</strong>
          </p>
        </div>

        <!-- Body -->
        <div class="email-body" style="padding: 24px; font-size: 14px; line-height: 1.6; color: #334155;">
          <div style="padding-bottom: 15px; border-bottom: 2px solid #f1f5f9; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0;"><strong>Kính gửi các bộ phận liên quan,</strong></p>
            <p style="margin: 0;">Bộ phận Trực ban QMS phát hiện điểm không phù hợp và điều phối thực hiện hành động khắc phục phòng ngừa CAPA với các thông số sau:</p>
          </div>

          <table class="capa-details-table" style="width: 100%; font-size: 13px; text-align: left; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 140px;">Hạng mục lỗi:</td>
              <td style="padding: 10px 0; color: #dc2626; font-weight: bold; font-size: 14px;">${capa.defectType || capa.title || 'Lỗi phát hiện'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Phân xưởng / Trực ca:</td>
              <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${capa.workshop || 'Xưởng lắp ráp'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Mô tả lỗi chi tiết:</td>
              <td style="padding: 10px 0; color: #334155;">${capa.description || 'Chưa ghi rõ'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Nguyên nhân gốc rễ:</td>
              <td style="padding: 10px 0; color: #475569; font-style: italic;">${capa.rootCause || 'Đang phân tích'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Hành động khắc phục:</td>
              <td style="padding: 10px 0; color: #1e293b; font-weight: bold;">${capa.correctiveAction || 'Cần bổ sung hành động ngay'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Người chịu trách nhiệm:</td>
              <td style="padding: 10px 0; color: #4f46e5; font-weight: bold;">${capa.owner || 'Bộ phận trưởng xưởng'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Hạn hoàn thành (Deadline):</td>
              <td style="padding: 10px 0; color: #d97706; font-weight: bold;">${capa.deadline || 'Báo cáo ngay trong ngày'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Trạng thái điều phối:</td>
              <td style="padding: 10px 0;">
                <span style="padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; ${
                  capa.status === 'Đóng' ? 'background-color: #ecfdf5; color: #047857;' :
                  capa.status === 'Theo dõi' ? 'background-color: #fef3c7; color: #d97706;' :
                  'background-color: #fee2e2; color: #dc2626;'
                }">${capa.status || 'Chờ duyệt xử lý'}</span>
              </td>
            </tr>
          </table>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 15px; font-size: 13px;">
            <strong>⚠️ ĐỀ NGHỊ CHÚ Ý:</strong> Bộ phận điều phối chịu trách nhiệm hoàn thiện kế hoạch sửa chữa và gửi tài liệu báo cáo chất lượng đúng thời hạn yêu cầu để đảm bảo không tái lỗi trên dây chuyền hàng loạt.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 5px 0;">Người điều phối cảnh báo: <strong>${senderName}</strong></p>
          <p style="margin: 0;">DKBIKE QMS CENTRAL ALERTS ENGINE</p>
        </div>
      </div>
    </div>
  `;
};

export const generateTodayAndTomorrowEmailTemplate = (
  todayLogs: any[], 
  tomorrowLogs: any[], 
  todayStr: string, 
  tomorrowStr: string, 
  senderName: string,
  oqcRecordsToday?: any[],
  oqcRecordsTomorrow?: any[]
) => {
  const makeRows = (logs: any[]) => {
    if (logs.length === 0) {
      return `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">Không có hoạt động ghi nhận</td></tr>`;
    }
    return logs.map((log, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td data-label="STT" style="padding: 8px 10px; font-weight: bold; font-family: monospace; color: #64748b; white-space: nowrap; width: 4%; min-width: 40px; max-width: 40px;">${idx + 1}</td>
        <td data-label="Hạng Mục" style="padding: 8px 10px; color: #1e293b; font-weight: 600; width: 15%; min-width: 120px;">
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; line-height: 1.25; word-break: keep-all; ${
            log.category === 'IQC' ? 'background-color: #fce8e6; color: #a51d24;' :
            log.category === 'PQC' ? 'background-color: #fef3c7; color: #b45309;' :
            log.category === 'OQC' ? 'background-color: #ecfdf5; color: #047857;' :
            log.category === 'SQC/QA' ? 'background-color: #fce8e6; color: #a51d24; border: 1px solid #fecdd3;' :
            'background-color: #f1f5f9; color: #475569;'
          }">${log.category || 'QA/QC'}</span>
        </td>
        <td data-label="Công Việc" style="padding: 8px 10px; color: #1e293b; line-height: 1.4; width: 29%; min-width: 210px; page-break-inside: avoid; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${(log.content || '').replace(/\n/g, '<br/>')}</td>
        <td data-label="Chỉ tiêu" style="padding: 8px 10px; color: #475569; text-align: center; white-space: nowrap; width: 11%; min-width: 90px;">${log.target || '1'} / ${log.unit || 'Lượt'}</td>
        <td data-label="Hiệu Suất" style="padding: 8px 10px; color: #1e293b; font-weight: bold; text-align: center; white-space: nowrap; width: 9%; min-width: 75px;">${log.statusPercent || '100%'}</td>
        <td data-label="Đánh giá" style="padding: 8px 10px; color: #334155; line-height: 1.4; width: 23%; min-width: 185px; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${(log.note || '-').replace(/\n/g, '<br/>')}</td>
        <td data-label="Nhân Sự" style="padding: 8px 10px; color: #64748b; font-size: 11px; white-space: nowrap; width: 9%; min-width: 70px; text-overflow: ellipsis; overflow: hidden;">${getLastName(log.assignee) || ''}</td>
      </tr>
    `).join('');
  };

  const todayRows = makeRows(todayLogs);
  const tomorrowRows = makeRows(tomorrowLogs);

  return `
    <div class="email-wrapper" style="background-color: #f8fafc; padding: 25px; font-family: system-ui, -apple-system, sans-serif;">
      
      <style>
        /* Modern high-quality responsive email layout */
        @media only screen and (max-width: 768px) {
          .email-wrapper {
            padding: 10px !important;
          }
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 8px !important;
          }
          .email-header {
            padding: 24px 15px !important;
          }
          .email-header h2 {
            font-size: 18px !important;
          }
          .email-body {
            padding: 16px 12px !important;
          }
          
          /* Transform tables to clean touch-focused mobile cards */
          .responsive-table {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table thead {
            display: none !important;
          }
          .responsive-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .responsive-table tr {
            display: block !important;
            width: 100% !important;
            margin-bottom: 16px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 12px 14px !important;
            background-color: #ffffff !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
            box-sizing: border-box !important;
          }
          .responsive-table td {
            display: block !important;
            width: 100% !important;
            padding: 5px 0 !important;
            border-bottom: 1px dotted #f1f5f9 !important;
            text-align: left !important;
            font-size: 13px !important;
            box-sizing: border-box !important;
          }
          .responsive-table td:last-child {
            border-bottom: none !important;
          }
          
          /* Dynamic label display */
          .responsive-table td::before {
            content: attr(data-label) ": ";
            display: inline-block;
            width: 95px;
            font-weight: 800;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            margin-right: 10px;
            text-align: center;
          }
          
          /* Summary cards stackable row */
          .metrics-table, .metrics-table tr, .metrics-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .metrics-table td {
            padding: 6px 10px !important;
            border-bottom: 1px solid #e0f2fe !important;
            text-align: left !important;
          }
          .metrics-table td:last-child {
            border-bottom: none !important;
          }
          
          /* CAPA tabular stack */
          .capa-details-table, .capa-details-table tr, .capa-details-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .capa-details-table tr {
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 8px 0 !important;
          }
          .capa-details-table td {
            padding: 4px 0 !important;
          }
          .capa-details-table td:first-child {
            font-weight: 850 !important;
            color: #475569 !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
        }
      </style>

      <div class="email-container" style="max-width: 950px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
        
        <!-- Header -->
        <div class="email-header" style="background-image: linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%); padding: 25px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">
             BÁO CÁO NGÀY ${todayStr} & KẾ HOẠCH NGÀY ${tomorrowStr}
          </h2>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">
            Phòng: <strong>Quản lý Chất lượng DKBike</strong> | Người lập: <strong>${senderName}</strong>
          </p>
        </div>

        <!-- Body -->
        <div class="email-body" style="padding: 24px;">
          
          <p style="font-size: 13px; color: #475569; margin: 0 0 20px 0;">
            Kính gửi Ban Giám đốc và Quản lý nhà máy DKBike,<br/>
            Dưới đây là chi tiết kết quả ghi nhận công việc kiểm soát chất lượng QMS hôm nay (<strong>${todayStr}</strong>) và kế hoạch dự kiến ngày mai (<strong>${tomorrowStr}</strong>):
          </p>

          <!-- SECTION 1: TODAY LOGS -->
          <div style="margin-bottom: 25px; border: 1px solid #bae6fd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #e0f2fe; padding: 10px 15px; border-bottom: 1px solid #bae6fd;">
              <strong style="color: #0369a1; font-size: 13.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                📅 1. BÁO CÁO CÔNG VIỆC THỰC HIỆN HÔM NAY (${todayStr})
              </strong>
            </div>
            <div style="width: 100%; min-width: 100%; display: block; clear: both; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; margin: 10px 0;">
              <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; min-width: 820px; border-collapse: collapse; font-size: 12.5px; text-align: left; table-layout: fixed;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 4%; min-width: 40px; white-space: nowrap;">STT</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 15%; min-width: 120px;">Mục</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 29%; min-width: 210px;">Nội Dung QA/QC</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; text-align: center; width: 11%; min-width: 90px; white-space: nowrap;">Chỉ tiêu</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; text-align: center; width: 9%; min-width: 75px; white-space: nowrap;">H.Suất</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 23%; min-width: 185px;">Đánh giá</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 9%; min-width: 70px; white-space: nowrap;">Nhân Sự</th>
                  </tr>
                </thead>
                <tbody>
                  ${todayRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- OQC Dynamic Section Today -->
          ${oqcRecordsToday ? renderOqcHtmlSection(oqcRecordsToday, `KẾT QUẢ NGHIỆM THU OQC XUẤT XƯỞNG HÔM NAY (${todayStr})`) : ''}

          <!-- SECTION 2: TOMORROW PLANS -->
          <div style="margin-bottom: 25px; border: 1px solid #fecdd3; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ffe4e6; padding: 10px 15px; border-bottom: 1px solid #fecdd3;">
              <strong style="color: #be123c; font-size: 13.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                🎯 2. KẾ HOẠCH CÔNG VIỆC CHI TIẾT NGÀY MAI (${tomorrowStr})
              </strong>
            </div>
            <div style="width: 100%; min-width: 100%; display: block; clear: both; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; margin: 10px 0;">
              <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; min-width: 820px; border-collapse: collapse; font-size: 12.5px; text-align: left; table-layout: fixed;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 4%; min-width: 40px; white-space: nowrap;">STT</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 15%; min-width: 120px;">Mục</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 29%; min-width: 210px;">Nội Dung Kế Hoạch</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; text-align: center; width: 11%; min-width: 90px; white-space: nowrap;">Dự kiến</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; text-align: center; width: 9%; min-width: 75px; white-space: nowrap;">H.Suất</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 23%; min-width: 185px;">Đánh giá</th>
                    <th style="padding: 8px 10px; font-weight: 700; color: #334155; width: 9%; min-width: 70px; white-space: nowrap;">Nhân Sự</th>
                  </tr>
                </thead>
                <tbody>
                  ${tomorrowRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- OQC Dynamic Section Tomorrow -->
          ${oqcRecordsTomorrow && oqcRecordsTomorrow.length > 0 ? renderOqcHtmlSection(oqcRecordsTomorrow, `KẾT QUẢ NGHIỆM THU OQC XUẤT XƯỞNG DỰ KIẾN NGÀY MAI (${tomorrowStr})`) : ''}

          <!-- Note -->
          <div style="padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; font-size: 12px; color: #475569;">
            <strong>💡 Ghi chú Đồng bộ:</strong> Báo cáo này đại diện cho dữ liệu đồng thời từ lưới quản lý DK QMS Cloud. Mọi kế hoạch điều động và phối kiểm tra chất lượng sẽ được thông báo trực tiếp trên dây chuyền theo phân xưởng.
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 5px 0; font-weight: bold; text-transform: uppercase;">HỆ THỐNG ĐIỀU ĐỘNG CHẤT LƯỢNG DKBIKE - QMS SMART WORKSPACE</p>
          <p style="margin: 0;">Xuất bản tự động qua tài khoản kết nối Gmail của người lập báo cáo</p>
        </div>

      </div>
    </div>
  `;
};
