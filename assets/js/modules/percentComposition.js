import { showToast } from "../utils/notifications.js";
import { parseFormula, buildCompositionBreakdown, calculateMolarMass } from "../utils/chemistry.js";

function initPercentComposition(elementsMap) {
  const form = document.getElementById("form-percent-composition");
  const output = document.getElementById("percent-composition-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formula = (document.getElementById("composition-formula").value || "").trim();
    if (!formula) {
      showToast({ title: "נוסחה חסרה", message: "אנא הזינו נוסחה", type: "error" });
      return;
    }

    try {
      const composition = parseFormula(formula, elementsMap);
      const breakdown = buildCompositionBreakdown(composition, elementsMap);
      const molarMass = calculateMolarMass(composition, elementsMap);
      output.innerHTML = renderPercentResult(formula, breakdown, molarMass);
      showToast({ title: "חישוב הושלם", message: "אחוזים חושבו בהצלחה", type: "success" });
    } catch (error) {
      console.error(error);
      output.textContent = "שגיאה בניתוח הנוסחה";
      showToast({ title: "שגיאה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    output.textContent = "";
  });
}

function renderPercentResult(formula, breakdown, molarMass) {
  const rows = breakdown
    .map(
      ({ symbol, name, percent, count, massContribution }) => `
        <tr>
          <td>${symbol}</td>
          <td>${name}</td>
          <td>${count}</td>
          <td>${massContribution.toFixed(4)}</td>
          <td>${percent.toFixed(2)}%</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="result-block">
      <p><strong>נוסחה:</strong> ${formula}</p>
      <p><strong>מסה מולרית:</strong> ${molarMass.toFixed(4)} g/mol</p>
      <table class="result-table">
        <thead>
          <tr>
            <th>יסוד</th>
            <th>שם</th>
            <th>אטומים</th>
            <th>תרומת מסה</th>
            <th>% מסה</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export { initPercentComposition };
