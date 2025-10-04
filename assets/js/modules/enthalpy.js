import { showToast } from "../utils/notifications.js";

function initEnthalpyCalculator(elementsMap, enthalpyData) {
  const form = document.getElementById("form-enthalpy");
  const reactantsContainer = document.getElementById("enthalpy-reactants");
  const productsContainer = document.getElementById("enthalpy-products");
  const resultContainer = document.getElementById("enthalpy-result");

  if (!form || !reactantsContainer || !productsContainer || !resultContainer) return;

  const dataMap = buildEnthalpyMap(enthalpyData);

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const reactants = readLines(reactantsContainer, dataMap, "מגיב");
      const products = readLines(productsContainer, dataMap, "תוצר");
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

function buildEnthalpyMap(enthalpyData) {
  const map = new Map();
  if (!enthalpyData?.compounds) return map;
  enthalpyData.compounds.forEach((item) => {
    map.set(item.formula, item.deltaHf);
  });
  return map;
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
          <input type="number" id="dh-${id}" data-field="enthalpy" step="any" placeholder="ערך אופציונלי" />
        </div>
        <button type="button" class="btn btn--ghost" data-remove-line>הסר</button>
      </div>
    `
  );
}

function readLines(container, dataMap, label) {
  const lines = Array.from(container.querySelectorAll(".reaction-line"));
  return lines.map((line) => {
    const coefficient = Number(line.querySelector('[data-field="coefficient"]').value);
    if (!Number.isFinite(coefficient) || coefficient < 0) {
      throw new Error(`מקדם לא חוקי עבור ${label}`);
    }

    const formula = line.querySelector('[data-field="formula"]').value.trim();
    if (!formula) {
      throw new Error(`נוסחה חסרה עבור ${label}`);
    }

    const custom = line.querySelector('[data-field="enthalpy"]').value;
    let deltaHf = custom !== "" ? Number(custom) : dataMap.get(formula);
    if (custom !== "" && !Number.isFinite(deltaHf)) {
      throw new Error(`ערך ΔHf מותאם אישית לא חוקי עבור ${formula}`);
    }
    if (custom === "" && deltaHf == null) {
      throw new Error(`לא נמצא ערך ΔHf עבור ${formula}. הזינו ערך ידני.`);
    }

    return { coefficient, formula, deltaHf };
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
              <tr><th>נוסחה</th><th>מקדם</th><th>ΔHf</th><th>תרומה</th></tr>
            </thead>
            <tbody>${reactantRows}</tbody>
          </table>
        </div>
        <div>
          <h4>תוצרים</h4>
          <table class="result-table">
            <thead>
              <tr><th>נוסחה</th><th>מקדם</th><th>ΔHf</th><th>תרומה</th></tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function rowTemplate({ formula, coefficient, deltaHf }) {
  const contribution = coefficient * deltaHf;
  return `
    <tr>
      <td>${formula}</td>
      <td>${coefficient}</td>
      <td>${deltaHf.toFixed(2)}</td>
      <td>${contribution.toFixed(2)}</td>
    </tr>
  `;
}

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export { initEnthalpyCalculator };
