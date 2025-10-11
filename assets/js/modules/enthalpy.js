import { showToast } from "../utils/notifications.js";

function initEnthalpyCalculator(elementsMap, enthalpyData) {
  const form = document.getElementById("form-enthalpy");
  const reactantsContainer = document.getElementById("enthalpy-reactants");
  const productsContainer = document.getElementById("enthalpy-products");
  const resultContainer = document.getElementById("enthalpy-result");

  if (!form || !reactantsContainer || !productsContainer || !resultContainer) return;

  const enthalpyIndex = buildEnthalpyIndex(enthalpyData);

  const addReactantButton = form.querySelector('[data-action="add-reactant"]');
  const addProductButton = form.querySelector('[data-action="add-product"]');

  addReactantButton?.addEventListener("click", () => {
    addReactionLine(reactantsContainer, "reactant");
  });

  addProductButton?.addEventListener("click", () => {
    addReactionLine(productsContainer, "product");
  });

  form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-remove-line]")) {
      const line = target.closest(".reaction-line");
      line?.remove();
    }
  });

  if (reactantsContainer.children.length === 0) {
    addReactionLine(reactantsContainer, "reactant");
    addReactionLine(reactantsContainer, "reactant");
  }

  if (productsContainer.children.length === 0) {
    addReactionLine(productsContainer, "product");
  }

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.dataset.field === "formula") {
      handleFormulaChange(target, enthalpyIndex);
    }

    if (target.dataset.field === "enthalpy") {
      target.dataset.autofill = "false";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const reactants = readLines(reactantsContainer, enthalpyIndex, "מגיב");
      const products = readLines(productsContainer, enthalpyIndex, "תוצר");
      if (reactants.length === 0 || products.length === 0) {
        throw new Error("יש להזין לפחות מגיב אחד ותוצר אחד");
      }

      const totalReactants = sumDeltaH(reactants);
      const totalProducts = sumDeltaH(products);
      const deltaH = totalProducts - totalReactants;

      resultContainer.innerHTML = renderEnthalpyResult(reactants, products, deltaH);
      showToast({ title: "חישוב הצליח", message: `ΔH = ${deltaH.toFixed(2)} kJ/mol`, type: "success" });
    } catch (error) {
      console.error(error);
      resultContainer.textContent = "";
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    resultContainer.textContent = "";
  });
}

function buildEnthalpyIndex(enthalpyData) {
  const byCanonical = new Map();
  const byBase = new Map();
  const compounds = Array.isArray(enthalpyData?.compounds) ? enthalpyData.compounds : [];

  compounds.forEach((item) => {
    if (!item?.formula || typeof item.deltaHf !== "number") return;

    const canonical = canonicalFormula(item.formula);
    const entry = {
      formula: item.formula,
      canonical,
      base: baseFormula(canonical),
      deltaHf: item.deltaHf,
      name: item.name ?? ""
    };

    byCanonical.set(canonical, entry);

    if (!byBase.has(entry.base)) {
      byBase.set(entry.base, []);
    }
    byBase.get(entry.base).push(entry);
  });

  return { byCanonical, byBase };
}

function addReactionLine(container, type) {
  const id = uniqueId();
  const label = type === "reactant" ? "מגיב" : "תוצר";
  container.insertAdjacentHTML(
    "beforeend",
    `
      <div class="reaction-line" data-type="${type}" data-line-id="${id}">
        <div class="form-group">
          <label for="coef-${id}">מקדם</label>
          <input type="number" id="coef-${id}" data-field="coefficient" value="1" min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="formula-${id}">${label}</label>
          <input type="text" id="formula-${id}" data-field="formula" placeholder="לדוגמה: H2O" />
        </div>
        <div class="form-group">
          <label for="dh-${id}">ΔHf (kJ/mol)</label>
          <input type="number" id="dh-${id}" data-field="enthalpy" step="any" placeholder="ערך אופציונלי" data-autofill="false" />
        </div>
        <button type="button" class="btn btn--ghost" data-remove-line>הסר</button>
        <p class="form-hint reaction-line__hint" data-role="hint" aria-live="polite"></p>
      </div>
    `
  );
}

function readLines(container, enthalpyIndex, label) {
  const lines = Array.from(container.querySelectorAll(".reaction-line"));
  return lines.map((line) => {
    const coefficient = Number(line.querySelector('[data-field="coefficient"]').value);
    if (!Number.isFinite(coefficient) || coefficient < 0) {
      throw new Error(`מקדם לא חוקי עבור ${label}`);
    }

    const rawFormula = line.querySelector('[data-field="formula"]').value.trim();
    if (!rawFormula) {
      throw new Error(`נוסחה חסרה עבור ${label}`);
    }

    const enthalpyInput = line.querySelector('[data-field="enthalpy"]');
    const custom = enthalpyInput.value;
    const canonical = canonicalFormula(rawFormula);
    const datasetEntry = enthalpyIndex.byCanonical.get(canonical);
    let deltaHf;
    let source;

    if (custom !== "") {
      deltaHf = Number(custom);
      if (!Number.isFinite(deltaHf)) {
        throw new Error(`ערך ΔHf מותאם אישית לא חוקי עבור ${rawFormula}`);
      }
      source = "manual";
    } else if (datasetEntry) {
      deltaHf = datasetEntry.deltaHf;
      source = "dataset";
    } else {
      throw new Error(formatMissingMessage(rawFormula, enthalpyIndex));
    }

    return {
      coefficient,
      formula: datasetEntry?.formula ?? rawFormula,
      displayName: datasetEntry?.name ?? "",
      deltaHf,
      source
    };
  });
}

function sumDeltaH(items) {
  return items.reduce((total, item) => total + item.coefficient * item.deltaHf, 0);
}

function renderEnthalpyResult(reactants, products, deltaH) {
  const reactantRows = reactants
    .map((item) => rowTemplate(item))
    .join("");
  const productRows = products
    .map((item) => rowTemplate(item))
    .join("");

  return `
    <div class="result-block">
      <p><strong>ΔH (תוצרים - מגיבים):</strong> ${deltaH.toFixed(2)} kJ/mol</p>
      <div class="result-columns">
        <div>
          <h4>מגיבים</h4>
          <table class="result-table">
            <thead>
              <tr><th>נוסחה</th><th>מקדם</th><th>ΔHf</th><th>תרומה</th><th>מקור</th></tr>
            </thead>
            <tbody>${reactantRows}</tbody>
          </table>
        </div>
        <div>
          <h4>תוצרים</h4>
          <table class="result-table">
            <thead>
              <tr><th>נוסחה</th><th>מקדם</th><th>ΔHf</th><th>תרומה</th><th>מקור</th></tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function rowTemplate({ formula, coefficient, deltaHf, source, displayName }) {
  const contribution = coefficient * deltaHf;
  return `
    <tr>
      <td>
        <span title="${displayName ? displayName : ""}">${formula}</span>
        ${displayName ? `<div class="result-table__subtitle">${displayName}</div>` : ""}
      </td>
      <td>${coefficient}</td>
      <td>${deltaHf.toFixed(2)}</td>
      <td>${contribution.toFixed(2)}</td>
      <td>${source === "dataset" ? "מאגר" : "מותאם"}</td>
    </tr>
  `;
}

function handleFormulaChange(input, enthalpyIndex) {
  const line = input.closest(".reaction-line");
  if (!line) return;

  const enthalpyInput = line.querySelector('[data-field="enthalpy"]');
  const hint = line.querySelector('[data-role="hint"]');

  if (!enthalpyInput || !hint) return;

  const rawFormula = input.value.trim();
  if (!rawFormula) {
    resetAutofill(enthalpyInput, hint);
    return;
  }

  const canonical = canonicalFormula(rawFormula);
  const entry = enthalpyIndex.byCanonical.get(canonical);

  if (entry) {
    const numericValue = entry.deltaHf;
    if (!enthalpyInput.value || enthalpyInput.dataset.autofill === "true") {
      enthalpyInput.value = String(numericValue);
      enthalpyInput.dataset.autofill = "true";
    }
    enthalpyInput.placeholder = String(numericValue);
    hint.textContent = `ΔHf° = ${numericValue.toFixed(2)} kJ/mol${entry.name ? ` · ${entry.name}` : ""}`;
  } else {
    resetAutofill(enthalpyInput, hint);
  }
}

function resetAutofill(enthalpyInput, hint) {
  if (enthalpyInput.dataset.autofill === "true") {
    enthalpyInput.value = "";
  }
  enthalpyInput.placeholder = "ערך אופציונלי";
  enthalpyInput.dataset.autofill = "false";
  hint.textContent = "";
}

function canonicalFormula(formula) {
  return formula.replace(/\s+/g, "").toLowerCase();
}

function baseFormula(canonical) {
  return canonical.replace(/\([^)]*\)/g, "");
}

function formatMissingMessage(formula, enthalpyIndex) {
  const canonical = canonicalFormula(formula);
  const base = baseFormula(canonical);
  const suggestions = enthalpyIndex.byBase.get(base);

  if (suggestions && suggestions.length > 0) {
    const options = suggestions.map((entry) => entry.formula).join(", ");
    return `לא נמצא ערך ΔHf עבור ${formula}. נסו לבחור אחת מהתצורות הבאות: ${options}, או הזינו ערך ידני.`;
  }

  return `לא נמצא ערך ΔHf עבור ${formula}. ודאו שהנוסחה והמצב הפיזיקלי נכונים או הזינו ערך ידני.`;
}

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export { initEnthalpyCalculator };
