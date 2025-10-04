import { showToast } from "../utils/notifications.js";

function initDilutionTool() {
  const form = document.getElementById("form-dilution");
  const output = document.getElementById("dilution-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const fields = {
        c1: parseValue("dilution-c1-standalone"),
        v1: parseValue("dilution-v1-standalone"),
        c2: parseValue("dilution-c2-standalone"),
        v2: parseValue("dilution-v2-standalone")
      };

      const provided = Object.values(fields).filter((value) => value != null).length;
      if (provided !== 3) {
        showToast({ title: "חסרים נתונים", message: "יש להזין שלושה ערכים ולחשב את הרביעי", type: "error" });
        return;
      }

      if (fields.c1 == null) fields.c1 = (fields.c2 * fields.v2) / fields.v1;
      else if (fields.v1 == null) fields.v1 = (fields.c2 * fields.v2) / fields.c1;
      else if (fields.c2 == null) fields.c2 = (fields.c1 * fields.v1) / fields.v2;
      else if (fields.v2 == null) fields.v2 = (fields.c1 * fields.v1) / fields.c2;

      updateField("dilution-c1-standalone", fields.c1);
      updateField("dilution-v1-standalone", fields.v1);
      updateField("dilution-c2-standalone", fields.c2);
      updateField("dilution-v2-standalone", fields.v2);

      output.innerHTML = `
        <ul class="result-list">
          <li><strong>C₁:</strong> ${fields.c1.toFixed(6)} M</li>
          <li><strong>V₁:</strong> ${fields.v1.toFixed(6)} L</li>
          <li><strong>C₂:</strong> ${fields.c2.toFixed(6)} M</li>
          <li><strong>V₂:</strong> ${fields.v2.toFixed(6)} L</li>
        </ul>
      `;
      showToast({ title: "דילול חושב", message: "C₁V₁ = C₂V₂", type: "success" });
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

function parseValue(id) {
  const value = document.getElementById(id).value;
  if (value === "" || value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("ערך קלט לא חוקי");
  }
  return numeric;
}

function updateField(id, value) {
  document.getElementById(id).value = value.toFixed(6);
}

export { initDilutionTool };
