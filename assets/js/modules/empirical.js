import { showToast } from "../utils/notifications.js";
import { empiricalFromMasses, molecularFromEmpirical, calculateMolarMass } from "../utils/chemistry.js";

function initEmpiricalCalculator(elementsMap) {
  const form = document.getElementById("form-empirical");
  const rowsContainer = document.getElementById("empirical-rows");
  const addRowButton = document.getElementById("empirical-add-row");
  const resultContainer = document.getElementById("empirical-result");

  if (!form || !rowsContainer || !addRowButton || !resultContainer) return;

  const addRow = () => {
    const id = uniqueId();
    rowsContainer.insertAdjacentHTML(
      "beforeend",
      `
        <div class="empirical-row" data-row-id="${id}">
          <div class="form-group">
            <label for="emp-symbol-${id}">יסוד</label>
            <input type="text" id="emp-symbol-${id}" data-field="symbol" placeholder="לדוגמה: C" />
          </div>
          <div class="form-group">
            <label for="emp-value-${id}">ערך</label>
            <input type="number" id="emp-value-${id}" data-field="value" step="any" min="0" />
          </div>
          <div class="form-group">
            <label for="emp-unit-${id}">סוג הערך</label>
            <select id="emp-unit-${id}" data-field="unit">
              <option value="percent">אחוז מסה (%)</option>
              <option value="mass">מסה (g)</option>
            </select>
          </div>
          <button type="button" class="btn btn--ghost" data-remove-row>הסר</button>
        </div>
      `
    );
  };

  const ensureRows = () => {
    if (rowsContainer.children.length === 0) {
      addRow();
      addRow();
      addRow();
    }
  };

  ensureRows();

  addRowButton.addEventListener("click", () => {
    addRow();
  });

  rowsContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches("[data-remove-row]")) {
      target.closest(".empirical-row")?.remove();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const entries = readRows(rowsContainer);
      if (entries.length === 0) {
        throw new Error("יש להזין לפחות יסוד אחד");
      }

      const masses = convertToMasses(entries);
      const empirical = empiricalFromMasses(masses, elementsMap);
      const empiricalFormula = formulaFromComponents(empirical);
      const empiricalMass = calculateMolarMass(listToObject(empirical), elementsMap);

      let molecularFormula = null;
      const targetMolarMassInput = document.getElementById("empirical-molar-mass");
      const targetMolarMass = Number(targetMolarMassInput.value);

      if (Number.isFinite(targetMolarMass) && targetMolarMass > 0) {
        const molecularComponents = molecularFromEmpirical(empirical, targetMolarMass, elementsMap);
        molecularFormula = formulaFromComponents(molecularComponents);
      }

      resultContainer.innerHTML = renderEmpiricalResult({
        empiricalFormula,
        empiricalMass,
        molecularFormula,
        targetMolarMass
      });

      showToast({
        title: "נוסחה חושבה",
        message: molecularFormula
          ? `נוסחה אמפירית: ${empiricalFormula}, נוסחה מולקולרית: ${molecularFormula}`
          : `נוסחה אמפירית: ${empiricalFormula}`,
        type: "success"
      });
    } catch (error) {
      console.error(error);
      resultContainer.textContent = "";
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    resultContainer.textContent = "";
    rowsContainer.innerHTML = "";
    ensureRows();
  });
}

function readRows(container) {
  return Array.from(container.querySelectorAll(".empirical-row")).map((row) => {
    const symbol = row.querySelector('[data-field="symbol"]').value.trim();
    if (!symbol) throw new Error("יש להזין סימול כימי");
    const normalizedSymbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();

    const value = Number(row.querySelector('[data-field="value"]').value);
    if (!Number.isFinite(value) || value <= 0) throw new Error("ערך חייב להיות חיובי");

    const unit = row.querySelector('[data-field="unit"]').value;

    return { symbol: normalizedSymbol, value, unit };
  });
}

function convertToMasses(entries) {
  let percentTotal = 0;
  const masses = entries.map((entry) => {
    if (entry.unit === "percent") {
      percentTotal += entry.value;
      return { symbol: entry.symbol, mass: entry.value };
    }
    return { symbol: entry.symbol, mass: entry.value };
  });

  if (percentTotal > 0 && Math.abs(percentTotal - 100) > 0.5) {
    showToast({
      title: "אזהרה",
      message: "סכום האחוזים שונה מ-100. מניחים דגימה של 100g", // toast only
      type: "info"
    });
  }

  return masses;
}

function formulaFromComponents(components) {
  return components
    .map(({ symbol, count }) => `${symbol}${count === 1 ? "" : count}`)
    .join("");
}

function listToObject(components) {
  return components.reduce((acc, { symbol, count }) => {
    acc[symbol] = count;
    return acc;
  }, {});
}

function renderEmpiricalResult({ empiricalFormula, empiricalMass, molecularFormula, targetMolarMass }) {
  return `
    <div class="result-block">
      <p><strong>נוסחה אמפירית:</strong> ${empiricalFormula}</p>
      <p><strong>מסה מולרית אמפירית:</strong> ${empiricalMass.toFixed(4)} g/mol</p>
      ${targetMolarMass && molecularFormula ? `<p><strong>נוסחה מולקולרית:</strong> ${molecularFormula}</p>` : ""}
      ${targetMolarMass && molecularFormula ? `<p><strong>מסה מולרית מבוקשת:</strong> ${targetMolarMass} g/mol</p>` : ""}
    </div>
  `;
}

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export { initEmpiricalCalculator };
