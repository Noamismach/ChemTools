import { showToast } from "../utils/notifications.js";

function initReportBuilder() {
  const form = document.getElementById("form-report");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const report = {
      title: form.querySelector("#report-title").value.trim(),
      materials: parseMultiline(form.querySelector("#report-materials").value),
      procedure: form.querySelector("#report-procedure").value.trim(),
      observations: form.querySelector("#report-observations").value.trim(),
      conclusion: form.querySelector("#report-conclusion").value.trim(),
      createdAt: new Date()
    };

    if (!report.title) {
      showToast({ title: "כותרת חסרה", message: "יש להזין כותרת לדוח", type: "error" });
      return;
    }

    try {
      exportAsPdf(report);
      showToast({ title: "נוצר דוח", message: "הקובץ מוכן להדפסה או שמירה כ-PDF", type: "success" });
    } catch (error) {
      console.error(error);
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    showToast({ title: "איפוס", message: "השדות נוקו", type: "info" });
  });
}

function parseMultiline(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function exportAsPdf(report) {
  const printWindow = window.open("", "chemtools-report");
  if (!printWindow) {
    throw new Error("הדפדפן חסם פתיחת חלון חדש");
  }

  const doc = printWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${report.title} – דוח ניסוי</title>
        <style>
          body { font-family: 'Rubik', Arial, sans-serif; margin: 2.5cm; background: white; color: #111; }
          h1 { font-size: 2.2rem; margin-bottom: 0.5rem; }
          h2 { margin-top: 1.8rem; font-size: 1.3rem; border-bottom: 1px solid #ccc; padding-bottom: 0.4rem; }
          ul { padding-inline-start: 1.5rem; }
          li { margin-bottom: 0.3rem; }
          .meta { margin-bottom: 1.5rem; color: #555; }
          .section { margin-bottom: 1.5rem; }
          .footer { margin-top: 2rem; font-size: 0.9rem; color: #777; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <div class="meta">תאריך יצירה: ${report.createdAt.toLocaleString()}</div>
        ${renderListSection("חומרים וציוד", report.materials)}
        ${renderTextSection("תהליך", report.procedure)}
        ${renderTextSection("תצפיות", report.observations)}
        ${renderTextSection("מסקנות", report.conclusion)}
        <div class="footer">נוצר ב-ChemTools</div>
        <script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
      </body>
    </html>
  `);
  doc.close();
}

function renderListSection(title, items) {
  if (!items.length) return "";
  const list = items.map((item) => `<li>${item}</li>`).join("");
  return `<div class="section"><h2>${title}</h2><ul>${list}</ul></div>`;
}

function renderTextSection(title, content) {
  if (!content) return "";
  return `<div class="section"><h2>${title}</h2><p>${content.replace(/\n+/g, "<br />")}</p></div>`;
}

export { initReportBuilder };
