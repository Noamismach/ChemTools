import { showToast } from "../utils/notifications.js";
import { parseEquation } from "../utils/chemistry.js";

const EPSILON = 1e-9;

function initIceCalculator(elementsMap) {
  const form = document.getElementById("form-ice");
  const equationInput = document.getElementById("ice-equation");
  const container = document.getElementById("ice-initial-container");
  const output = document.getElementById("ice-result");

  if (!form || !equationInput || !container || !output) return;

  equationInput.addEventListener("change", () => {
    buildInitialGrid(equationInput.value, container, elementsMap);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const equation = equationInput.value.trim();
    const kValue = Number(document.getElementById("ice-constant").value);

    if (!equation) {
      showToast({ title: "משוואה חסרה", message: "אנא הזינו משוואת שיווי משקל", type: "error" });
      return;
    }
    if (!Number.isFinite(kValue) || kValue <= 0) {
      showToast({ title: "ערך K שגוי", message: "קבוע שיווי המשקל חייב להיות חיובי", type: "error" });
      return;
    }

    try {
      const parsed = parseEquation(equation, elementsMap);
      const entries = aggregateSpecies(parsed);
      ensureInitialGrid(entries, container);
      const initialMap = readInitialValues(entries, container);
      const extent = solveEquilibrium(entries, initialMap, kValue);
      const table = buildIceTable(entries, initialMap, extent);
      output.innerHTML = renderIceResult(table, extent, kValue);
      showToast({ title: "חישוב הושלם", message: "טבלת ICE עודכנה", type: "success" });
    } catch (error) {
      console.error(error);
      output.textContent = "";
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    output.textContent = "";
  });
}

function buildInitialGrid(equation, container, elementsMap) {
  if (!equation.trim()) {
    container.innerHTML = "";
    return;
  }

  try {
    const parsed = parseEquation(equation, elementsMap);
    const entries = aggregateSpecies(parsed);
    container.innerHTML = entries
      .map(
        ({ formula }) => `
          <div class="form-group">
            <label for="ice-${formula}">${formula} (תחילה mol/L)</label>
            <input type="number" id="ice-${formula}" data-formula="${formula}" min="0" step="any" value="0" />
          </div>
        `
      )
      .join("");
  } catch (error) {
    container.innerHTML = "";
  }
}

function ensureInitialGrid(entries, container) {
  const existing = Array.from(container.querySelectorAll("[data-formula]"));
  if (existing.length === entries.length) return;
  container.innerHTML = entries
    .map(
      ({ formula }) => `
        <div class="form-group">
          <label for="ice-${formula}">${formula} (תחילה mol/L)</label>
          <input type="number" id="ice-${formula}" data-formula="${formula}" min="0" step="any" value="0" />
        </div>
      `
    )
    .join("");
}

function aggregateSpecies({ reactants, products }) {
  const map = new Map();

  reactants.forEach(({ formula, coefficient }) => {
    const entry = map.get(formula) ?? { formula, stoich: 0 };
    entry.stoich -= coefficient;
    map.set(formula, entry);
  });

  products.forEach(({ formula, coefficient }) => {
    const entry = map.get(formula) ?? { formula, stoich: 0 };
    entry.stoich += coefficient;
    map.set(formula, entry);
  });

  return Array.from(map.values());
}

function readInitialValues(entries, container) {
  const values = new Map();
  entries.forEach(({ formula }) => {
    const input = container.querySelector(`[data-formula="${formula}"]`);
    if (!input) throw new Error(`לא נמצא שדה עבור ${formula}`);
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`ערך פתיחה לא חוקי עבור ${formula}`);
    }
    values.set(formula, value);
  });
  return values;
}

function reactionQuotient(entries, initialMap, extent) {
  let numerator = 1;
  let denominator = 1;

  entries.forEach(({ formula, stoich }) => {
    const initial = initialMap.get(formula) ?? 0;
    const concentration = initial + stoich * extent;
    if (concentration <= 0) {
      throw new RangeError(`ריכוז של ${formula} הפך ללא חיובי`);
    }
    const power = Math.abs(stoich);
    if (stoich > 0) {
      numerator *= concentration ** power;
    } else if (stoich < 0) {
      denominator *= concentration ** power;
    }
  });

  return numerator / denominator;
}

function solveEquilibrium(entries, initialMap, kValue) {
  const [lowerBound, upperBound] = computeExtentBounds(entries, initialMap);
  const fn = (x) => reactionQuotient(entries, initialMap, x) - kValue;

  let low = lowerBound;
  let high = upperBound;
  let fLow = fn(low);
  let fHigh = fn(high);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) {
    throw new Error("לא ניתן להעריך את פונקציית שיווי המשקל בטווח הנתון");
  }

  if (Math.abs(fLow) < EPSILON) return low;
  if (Math.abs(fHigh) < EPSILON) return high;

  if (fLow * fHigh > 0) {
    throw new Error("לא ניתן למצוא פתרון בתחום הערכים המקובל. בדקו את הנתונים");
  }

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const fMid = fn(mid);
    if (Math.abs(fMid) < EPSILON) {
      return mid;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

function computeExtentBounds(entries, initialMap) {
  let maxForward = Number.POSITIVE_INFINITY;
  let maxBackward = Number.NEGATIVE_INFINITY;

  entries.forEach(({ formula, stoich }) => {
    const initial = initialMap.get(formula) ?? 0;
    if (stoich < 0) {
      const limit = initial / Math.abs(stoich);
      maxForward = Math.min(maxForward, limit);
    } else if (stoich > 0) {
      const limit = -initial / stoich;
      maxBackward = Math.max(maxBackward, limit);
    }
  });

  if (!Number.isFinite(maxForward)) maxForward = 1e6;
  if (!Number.isFinite(maxBackward)) maxBackward = -1e6;

  const lower = maxBackward + EPSILON;
  const upper = maxForward - EPSILON;

  if (upper <= lower) {
    return [maxBackward - 1, maxForward + 1];
  }

  return [lower, upper];
}

function buildIceTable(entries, initialMap, extent) {
  return entries.map(({ formula, stoich }) => {
    const initial = initialMap.get(formula) ?? 0;
    const change = stoich * extent;
    const equilibrium = initial + change;
    if (equilibrium < 0) {
      throw new Error(`הפתרון גורם לריכוז שלילי עבור ${formula}`);
    }
    return {
      formula,
      stoich,
      initial,
      change,
      equilibrium
    };
  });
}

function renderIceResult(table, extent, kValue) {
  const rows = table
    .map(
      ({ formula, initial, change, equilibrium, stoich }) => `
        <tr>
          <th scope="row">${formula}</th>
          <td>${initial.toExponential(4)}</td>
          <td>${formatSigned(change)}</td>
          <td>${equilibrium.toExponential(4)}</td>
          <td>${stoich}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="result-block">
      <p><strong>K:</strong> ${kValue}</p>
      <p><strong>Δ (extent):</strong> ${extent.toExponential(6)}</p>
      <table class="result-table">
        <thead>
          <tr>
            <th>מין</th>
            <th>Initial</th>
            <th>Change</th>
            <th>Equilibrium</th>
            <th>ν</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function formatSigned(value) {
  const formatted = value.toExponential(4);
  return value >= 0 ? `+${formatted}` : formatted;
}

export { initIceCalculator };
