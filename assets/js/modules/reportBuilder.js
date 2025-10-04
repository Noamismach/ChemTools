import { showToast } from "../utils/notifications.js";

function initReportBuilder() {
  const form = document.getElementById("form-report");
  if (!form) return;

  const dataRows = [];
  const controls = {
    metric: form.querySelector("#report-data-metric"),
    value: form.querySelector("#report-data-value"),
    units: form.querySelector("#report-data-units"),
    notes: form.querySelector("#report-data-notes"),
    addButton: form.querySelector("#report-data-add"),
    tableBody: form.querySelector("[data-report-data-body]")
  };

  const clearDataInputs = () => {
    [controls.metric, controls.value, controls.units, controls.notes].forEach((input) => {
      if (input) input.value = "";
    });
    controls.metric?.focus();
  };

  const renderDataRows = () => {
    if (!controls.tableBody) return;
    controls.tableBody.innerHTML = "";

    if (!dataRows.length) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "data-empty";
      emptyRow.innerHTML = `<td colspan="6">טרם נוספו מדידות – הוסיפו נתונים לקבלת טבלה בדוח.</td>`;
      controls.tableBody.appendChild(emptyRow);
      return;
    }

    dataRows.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(row.metric)}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.units || "-")}</td>
        <td>${escapeHtml(row.notes || "-")}</td>
        <td class="table-actions">
          <button type="button" data-remove-row="${index}" aria-label="הסר שורה">מחק</button>
        </td>
      `;
      controls.tableBody.appendChild(tr);
    });
  };

  controls.addButton?.addEventListener("click", () => {
    const metric = controls.metric?.value.trim();
    const value = controls.value?.value.trim();
    const units = controls.units?.value.trim();
    const notes = controls.notes?.value.trim();

    if (!metric || !value) {
      showToast({ title: "מידע חסר", message: "יש להזין לפחות מדד וערך למדידה", type: "error" });
      return;
    }

    dataRows.push({ metric, value, units, notes });
    renderDataRows();
    clearDataInputs();
    showToast({ title: "מדידה נוספה", message: "השורה נוספה לטבלת הנתונים", type: "success" });
  });

  controls.tableBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("button[data-remove-row]");
    if (!button) return;
    const index = Number.parseInt(button.dataset.removeRow ?? "-1", 10);
    if (Number.isNaN(index) || index < 0) return;
    dataRows.splice(index, 1);
    renderDataRows();
    showToast({ title: "שורה הוסרה", message: "המדידה נמחקה מהטבלה", type: "info" });
  });

  renderDataRows();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const report = {
      title: form.querySelector("#report-title")?.value.trim() ?? "",
      experimentDate: form.querySelector("#report-date")?.value.trim() ?? "",
      author: form.querySelector("#report-author")?.value.trim() ?? "",
      supervisor: form.querySelector("#report-supervisor")?.value.trim() ?? "",
      location: form.querySelector("#report-location")?.value.trim() ?? "",
      hypothesis: form.querySelector("#report-hypothesis")?.value.trim() ?? "",
      variables: parseMultiline(form.querySelector("#report-variables")?.value ?? ""),
      materials: parseMultiline(form.querySelector("#report-materials")?.value ?? ""),
      procedure: form.querySelector("#report-procedure")?.value.trim() ?? "",
      data: [...dataRows],
      observations: form.querySelector("#report-observations")?.value.trim() ?? "",
      analysis: form.querySelector("#report-analysis")?.value.trim() ?? "",
      conclusion: form.querySelector("#report-conclusion")?.value.trim() ?? "",
      safety: form.querySelector("#report-safety")?.value.trim() ?? "",
      references: parseMultiline(form.querySelector("#report-references")?.value ?? ""),
      createdAt: new Date()
    };

    if (!report.title) {
      showToast({ title: "כותרת חסרה", message: "יש להזין כותרת לדוח", type: "error" });
      return;
    }

    try {
      const summary = createReportSummary(report);
      exportAsPdf(summary);
      showToast({ title: "נוצר דוח", message: "הקובץ מוכן להדפסה או שמירה כ-PDF", type: "success" });
    } catch (error) {
      console.error(error);
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    dataRows.splice(0, dataRows.length);
    renderDataRows();
    showToast({ title: "איפוס", message: "השדות נוקו", type: "info" });
  });
}

function parseMultiline(value) {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createReportSummary(report) {
  const experimentDateFormatted = formatExperimentDate(report.experimentDate);
  return {
    ...report,
    experimentDateFormatted,
    createdAtFormatted: report.createdAt.toLocaleString("he-IL", {
      dateStyle: "long",
      timeStyle: "short"
    }),
    metadataRows: [
      experimentDateFormatted && { label: "תאריך ביצוע", value: experimentDateFormatted },
      report.author && { label: "עורך הדוח / צוות", value: report.author },
      report.supervisor && { label: "מנחה / מורה", value: report.supervisor },
      report.location && { label: "מיקום / מעבדה", value: report.location }
    ].filter(Boolean)
  };
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
        <title>${escapeHtml(report.title)} – דוח ניסוי</title>
        <style>
          @page { size: A4; margin: 2.2cm; }
          body { font-family: 'Rubik', Arial, sans-serif; background: #f7f9fc; color: #0f172a; margin: 0; }
          h1 { font-size: 2.3rem; margin: 0 0 0.35rem; }
          h2 { font-size: 1.45rem; margin: 0 0 0.75rem; color: #172554; }
          p { margin: 0 0 0.65rem; line-height: 1.6; }
          ul { margin: 0; padding: 0 1.1rem 0 0; }
          li { margin-bottom: 0.35rem; line-height: 1.5; }
          .report-wrapper { padding: 2.4cm 2.6cm; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #94a3b8; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .report-badge { display: inline-flex; align-items: center; gap: 0.35rem; background: #4f46e5; color: #fff; font-size: 0.85rem; padding: 0.35rem 0.8rem; border-radius: 999px; margin-bottom: 0.6rem; }
          .report-meta { font-size: 0.95rem; color: #475569; text-align: left; }
          .section { margin-bottom: 1.7rem; padding: 1.1rem 1.3rem; background: #fff; border-radius: 1.1rem; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08); border: 1px solid rgba(148, 163, 184, 0.2); page-break-inside: avoid; }
          .meta-table { width: 100%; border-collapse: collapse; font-size: 0.98rem; }
          .meta-table th, .meta-table td { text-align: start; padding: 0.55rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.35); }
          .meta-table th { width: 220px; font-weight: 600; color: #0f172a; background: rgba(79, 70, 229, 0.08); }
          .meta-table tr:last-child th, .meta-table tr:last-child td { border-bottom: none; }
          .data-table-pdf { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
          .data-table-pdf th, .data-table-pdf td { padding: 0.6rem 0.75rem; border: 1px solid rgba(100, 116, 139, 0.35); text-align: start; }
          .data-table-pdf thead th { background: rgba(59, 130, 246, 0.15); font-weight: 600; }
          .footer { margin-top: 2rem; font-size: 0.9rem; color: #475569; text-align: center; }
          .two-column { column-count: 2; column-gap: 1.4rem; }
          .two-column li { break-inside: avoid-column; }
        </style>
      </head>
      <body>
        <div class="report-wrapper">
          <header class="report-header">
            <div>
              <span class="report-badge">ChemTools · דוח מעבדה</span>
              <h1>${escapeHtml(report.title)}</h1>
            </div>
            <div class="report-meta">
              <div>נוצר בתאריך: ${escapeHtml(report.createdAtFormatted)}</div>
            </div>
          </header>
          ${renderMetadataSection(report.metadataRows)}
          ${renderTextSection("השערה", report.hypothesis)}
          ${renderListSection("משתנים", report.variables, true)}
          ${renderListSection("חומרים וציוד", report.materials, true)}
          ${renderTextSection("שלבי ביצוע", report.procedure)}
          ${renderDataTable(report.data)}
          ${renderTextSection("תצפיות", report.observations)}
          ${renderTextSection("ניתוח תוצאות", report.analysis)}
          ${renderTextSection("מסקנות", report.conclusion)}
          ${renderTextSection("הערות בטיחות", report.safety)}
          ${renderListSection("מקורות", report.references, false)}
          <footer class="footer">נוצר והודפס באמצעות ChemTools · ${escapeHtml(new Date().toLocaleDateString("he-IL"))}</footer>
        </div>
        <script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
      </body>
    </html>
  `);
  doc.close();
}

function renderMetadataSection(rows) {
  if (!rows || !rows.length) return "";
  const list = rows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`)
    .join("");
  return `<section class="section"><h2>פרטי ניסוי</h2><table class="meta-table">${list}</table></section>`;
}

function renderListSection(title, items, twoColumn = false) {
  if (!items || !items.length) return "";
  const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<section class="section"><h2>${escapeHtml(title)}</h2><ul class="${twoColumn ? "two-column" : ""}">${list}</ul></section>`;
}

function renderTextSection(title, content) {
  if (!content) return "";
  const body = escapeHtml(content).replace(/\n+/g, "<br />");
  return `<section class="section"><h2>${escapeHtml(title)}</h2><p>${body}</p></section>`;
}

function renderDataTable(data) {
  if (!data || !data.length) return "";
  const rows = data
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.metric)}</td>
          <td>${escapeHtml(row.value)}</td>
          <td>${escapeHtml(row.units || "-")}</td>
          <td>${escapeHtml(row.notes || "-")}</td>
        </tr>
      `
    )
    .join("");
  return `
    <section class="section">
      <h2>טבלת נתונים</h2>
      <table class="data-table-pdf" role="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">מדד</th>
            <th scope="col">ערך</th>
            <th scope="col">יחידות</th>
            <th scope="col">הערות</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function formatExperimentDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export { initReportBuilder };
