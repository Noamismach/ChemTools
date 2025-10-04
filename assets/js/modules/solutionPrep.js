import { showToast } from "../utils/notifications.js";

function initSolutionPrep() {
  const form = document.getElementById("form-solution-prep");
  const output = document.getElementById("solution-prep-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const concentration = parsePositive("prep-concentration", "ריכוז");
      const volume = parsePositive("prep-volume", "נפח");
      const molarMass = parsePositive("prep-molar-mass", "מסה מולרית");
      const purityInput = Number(document.getElementById("prep-purity").value);
      if (!Number.isFinite(purityInput) || purityInput <= 0 || purityInput > 100) {
        throw new Error("אחוז טוהר חייב להיות בין 0 ל-100");
      }

      const molesNeeded = concentration * volume;
      const pureMass = molesNeeded * molarMass;
      const actualMass = pureMass / (purityInput / 100);

      output.innerHTML = `
        <ul class="result-list">
          <li><strong>מולים נדרשים:</strong> ${molesNeeded.toFixed(4)} mol</li>
          <li><strong>מסה טהורה:</strong> ${pureMass.toFixed(4)} g</li>
          <li><strong>מסה לשקילה (עם טוהר ${purityInput}%):</strong> ${actualMass.toFixed(4)} g</li>
        </ul>
      `;
      showToast({ title: "חישוב הושלם", message: "כמות החומר חושבה", type: "success" });
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

function parsePositive(id, label) {
  const value = Number(document.getElementById(id).value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} חייב להיות גדול מאפס`);
  }
  return value;
}

export { initSolutionPrep };
