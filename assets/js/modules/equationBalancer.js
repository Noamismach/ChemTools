import { showToast } from "../utils/notifications.js";
import { balanceEquation, formatBalancedEquation } from "../utils/chemistry.js";

function initEquationBalancer(elementsMap) {
  const form = document.getElementById("form-equation-balancer");
  const output = document.getElementById("equation-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const equation = (document.getElementById("equation-input").value || "").trim();
    if (!equation) {
      showToast({ title: "משוואה חסרה", message: "הזינו משוואת תגובה", type: "error" });
      return;
    }

    try {
      const balanced = balanceEquation(equation, elementsMap);
      const formatted = formatBalancedEquation(balanced);
      output.innerHTML = renderBalancedResult(equation, balanced, formatted);
      showToast({ title: "משוואה מאוזנת", message: formatted, type: "success" });
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

function renderBalancedResult(original, balanced, formatted) {
  const rows = balanced
    .map(
      ({ formula, balancedCoefficient, side }) => `
        <tr>
          <td>${side < 0 ? "מגיב" : "תוצר"}</td>
          <td>${formula}</td>
          <td>${balancedCoefficient}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="result-block">
      <p><strong>מקור:</strong> ${original}</p>
      <p><strong>מאוזן:</strong> ${formatted}</p>
      <table class="result-table">
        <thead><tr><th>צד</th><th>נוסחה</th><th>מקדם</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export { initEquationBalancer };
