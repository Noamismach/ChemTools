import { showToast } from "../utils/notifications.js";
import { parseFormula, calculateMolarMass, buildCompositionBreakdown } from "../utils/chemistry.js";

function initMolarMassCalculator(elementsMap) {
  const form = document.getElementById("form-molar-mass");
  const output = document.getElementById("molar-mass-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const formula = (data.get("formula") || "").toString().trim();

    if (!formula) {
      showToast({ title: "חסרה נוסחה", message: "אנא הזינו נוסחה כימית תקינה", type: "error" });
      return;
    }

    try {
      const composition = parseFormula(formula, elementsMap);
      const molarMass = calculateMolarMass(composition, elementsMap);
      const breakdown = buildCompositionBreakdown(composition, elementsMap);
      output.innerHTML = renderMolarMassResult(formula, molarMass, breakdown);
      showToast({ title: "חישוב הושלם", message: `המסה המולרית: ${molarMass.toFixed(4)} g/mol`, type: "success" });
    } catch (error) {
      console.error(error);
      output.textContent = "שגיאה בחישוב. בדקו את הנוסחה.";
      showToast({ title: "שגיאה בנוסחה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    output.textContent = "";
  });
}

function renderMolarMassResult(formula, molarMass, breakdown) {
  const rows = breakdown
    .map(
      ({ symbol, name, count, massContribution, percent }) => `
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
      <h3>נוסחה: <span>${formula}</span></h3>
      <p><strong>מסה מולרית:</strong> ${molarMass.toFixed(4)} g/mol</p>
      <table class="result-table">
        <thead>
          <tr>
            <th>יסוד</th>
            <th>שם</th>
            <th>מספר אטומים</th>
            <th>תרומת מסה (g/mol)</th>
            <th>% מסה</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export { initMolarMassCalculator };
