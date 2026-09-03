import toast from 'react-hot-toast';

/**
 * Exports data directly as a Microsoft Excel document (.xls / .xlsx) with styled headers & gridlines.
 * Supports merged section headers (_isBanner) and blank spacing rows (_isBlank).
 * 
 * @param {string} filename - Desired file name (e.g. 'Candidates_Report.xlsx')
 * @param {Array<string>} headers - Header row column titles
 * @param {Array<Array<any>>} rows - 2D matrix of data rows (or banner objects)
 * @param {string} sheetName - Optional worksheet title
 */
export function exportToExcel(filename, headers, rows, sheetName = 'Data Export') {
  try {
    const tableHeaders = headers.map(h => `<th style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; font-size: 11pt; padding: 10px 12px; border: 1px solid #334155; text-align: left; vertical-align: middle; font-family: Calibri, Arial, sans-serif;">${h}</th>`).join('');
    
    const tableRows = rows.map((row, idx) => {
      // Merged & Centered Section Banner Row
      if (row && row._isBanner) {
        return `
          <tr>
            <td colspan="${headers.length}" style="background-color: ${row.bgColor || '#0F766E'}; color: ${row.textColor || '#FFFFFF'}; font-weight: bold; font-size: 12pt; text-align: center; vertical-align: middle; padding: 12px; border: 1px solid #1E293B; letter-spacing: 0.8px; font-family: Calibri, Arial, sans-serif;">
              ${row.title}
            </td>
          </tr>
        `;
      }

      // Blank Line Gap Row
      if (row && row._isBlank) {
        return `
          <tr>
            <td colspan="${headers.length}" style="height: 16px; background-color: #FFFFFF; border: none;"></td>
          </tr>
        `;
      }

      // Normal Data Row
      const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const cells = (Array.isArray(row) ? row : []).map(cell => {
        const strVal = cell ?? '';
        let formattedVal = String(strVal);
        // Convert HTML anchor tags to plain clickable hyperlink inside Excel
        if (formattedVal.includes('<a href=')) {
          const match = formattedVal.match(/<a href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
          if (match) {
            const url = match[1];
            const label = match[2].replace(/<[^>]+>/g, '');
            formattedVal = `<a href="${url}" target="_blank" style="color: #0284C7; text-decoration: underline; font-weight: bold;">${label}</a>`;
          }
        } else {
          formattedVal = formattedVal.replace(/\n/g, '<br/>');
        }

        // Center align fees (₹), numbers, and status badges
        let alignStyle = 'text-align: left;';
        const cleanStr = formattedVal.replace(/<[^>]+>/g, '').trim();
        if (
          cleanStr.includes('₹') || 
          /^\d+$/.test(cleanStr) || 
          ['Active', 'Pending', 'Revoked', 'Upgraded', 'Pending Upgrade', 'Pending Approval', 'Pending Mentor'].includes(cleanStr)
        ) {
          alignStyle = 'text-align: center;';
        }

        return `<td style="padding: 8px 10px; border: 1px solid #CBD5E1; background-color: ${bgColor}; font-size: 10pt; color: #1E293B; vertical-align: middle; white-space: pre-wrap; font-family: Calibri, Arial, sans-serif; ${alignStyle} mso-number-format:'\\@';">${formattedVal}</td>`;
      }).join('');

      return `<tr>${cells}</tr>`;
    }).join('');

    const excelXML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${sheetName}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
            th { font-size: 11pt; font-weight: bold; }
            td { font-size: 10pt; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelXML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let targetName = filename.replace(/\.(csv|txt)$/i, '');
    if (!targetName.endsWith('.xls') && !targetName.endsWith('.xlsx')) {
      targetName = `${targetName}.xls`;
    }
    
    link.setAttribute('download', targetName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`📊 Exported document to ${targetName}!`);
  } catch (err) {
    console.error('[EXPORT EXCEL ERROR]', err);
    toast.error('Failed to export Excel spreadsheet.');
  }
}

/** Alias exportToCSV to exportToExcel for backward compatibility */
export const exportToCSV = exportToExcel;

/**
 * Copies formatted tab-separated values to the clipboard for instant 1-click paste into Google Sheets.
 * 
 * @param {Array<string>} headers 
 * @param {Array<Array<any>>} rows 
 */
export async function copyForGoogleSheets(headers, rows) {
  try {
    const lines = [];
    lines.push(headers.join('\t'));

    rows.forEach(row => {
      if (row && row._isBanner) {
        lines.push(`${row.title}`);
      } else if (row && row._isBlank) {
        lines.push('');
      } else if (Array.isArray(row)) {
        const sanitizedRow = row.map(val => {
          if (val === null || val === undefined) return '';
          let str = String(val);
          // Convert HTML anchor tags to Google Sheets =HYPERLINK("URL", "LABEL") formula
          if (str.includes('<a href=')) {
            const match = str.match(/<a href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
            if (match) {
              const url = match[1];
              const label = match[2].replace(/<[^>]+>/g, '');
              str = `=HYPERLINK("${url}", "${label}")`;
            }
          }
          if (str.includes('\n') || str.includes('\t') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        lines.push(sanitizedRow.join('\t'));
      }
    });

    const tsvContent = lines.join('\n');
    await navigator.clipboard.writeText(tsvContent);
    toast.success('📋 Copied to clipboard! Open Google Sheets and press Ctrl+V to paste.', { duration: 2000 });
  } catch (err) {
    console.error('[COPY TSV ERROR]', err);
    toast.error('Failed to copy data for Google Sheets.');
  }
}

/**
 * Helper to ensure Cloudinary PDF URLs open seamlessly in a new browser tab using Google Docs Viewer.
 * Cleans double extension issues (e.g. .pdf.pdf) and returns the encoded Google Docs Viewer URL.
 */
export function getInlineResumeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let cleanUrl = rawUrl.trim();
  if (!cleanUrl) return '';

  // Fix double extension issues if present (e.g. .pdf.pdf -> .pdf)
  cleanUrl = cleanUrl.replace(/\.pdf\.pdf$/i, '.pdf');

  // If already a Google Docs Viewer URL, return as-is
  if (cleanUrl.startsWith('https://docs.google.com/viewer')) {
    return cleanUrl;
  }

  // Pass through Google Docs Viewer for seamless in-browser PDF rendering across all devices & browsers
  return `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
}

/**
 * Formats and exports Recent Platform Activity audit logs to styled Excel.
 * Filename format: Skill_Bridge_Platform_Activity_YYYY-MM-DD_HH_mm_ss.xls
 */
export function exportPlatformActivityLogs(activities) {
  if (!Array.isArray(activities) || activities.length === 0) {
    toast.error('No activity log data available to export.');
    return;
  }

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '_');
  const filename = `Skill_Bridge_Platform_Activity_${dateStr}_${timeStr}.xls`;

  const headers = [
    'Date & Time',
    'Action Type',
    'Triggered By (Name/Email)',
    'Target (Student/Job/Exam)',
    'Activity Details'
  ];

  const rows = activities.map(act => {
    const timeVal = act.rawTimestamp ? new Date(act.rawTimestamp).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    }) : (act.timestamp || 'N/A');

    const typeVal = act.type || 'Activity';
    const senderName = act.sender?.name || 'System';
    const senderEmail = act.sender?.email || '';
    const triggeredBy = senderEmail ? `${senderName} (${senderEmail})` : senderName;

    const recipientName = act.recipient?.name || 'N/A';
    const recipientEmail = act.recipient?.email || '';
    const targetVal = recipientEmail ? `${recipientName} (${recipientEmail})` : recipientName;

    const detailsVal = act.message || 'No additional details recorded.';

    return [
      timeVal,
      typeVal,
      triggeredBy,
      targetVal,
      detailsVal
    ];
  });

  exportToExcel(filename, headers, rows, 'Platform Activity');
  toast.success('Platform Activity logs exported successfully!');
}

/**
 * Formats and exports Upload Activity Logs to styled Excel with clickable document links.
 * Filename format: Skill_Bridge_Upload_Logs_YYYY-MM-DD_HH_mm_ss.xls
 */
export function exportUploadActivityLogs(uploadLogs) {
  if (!Array.isArray(uploadLogs) || uploadLogs.length === 0) {
    toast.error('No upload log data available to export.');
    return;
  }

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '_');
  const filename = `Skill_Bridge_Upload_Logs_${dateStr}_${timeStr}.xls`;

  const headers = [
    'Timestamp',
    'Student Name',
    'Student Email',
    'Branch / Mentor',
    'Document Type',
    'Document Link',
    'Upload Status'
  ];

  const rows = uploadLogs.map(log => {
    const timeVal = log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    }) : 'N/A';

    const nameVal = log.studentName || 'N/A';
    const emailVal = log.studentEmail || 'N/A';
    const mentorVal = log.mentorName || 'Unassigned';
    const docTypeVal = log.fileType || 'Document';
    const statusVal = (log.status || 'success').toLowerCase() === 'success' ? 'Success' : 'Failed';

    let docLink = '-';
    if (log.message && (log.message.startsWith('http://') || log.message.startsWith('https://'))) {
      docLink = `<a href="${getInlineResumeUrl(log.message)}" target="_blank">View File</a>`;
    } else if (log.filename) {
      docLink = log.filename;
    }

    return [
      timeVal,
      nameVal,
      emailVal,
      mentorVal,
      docTypeVal,
      docLink,
      statusVal
    ];
  });

  exportToExcel(filename, headers, rows, 'Upload Logs');
  toast.success('Upload activity logs exported successfully!');
}

