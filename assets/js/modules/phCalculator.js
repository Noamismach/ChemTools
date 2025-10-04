import { showToast } from "../utils/notifications.js";

const AUTO_IONIZATION = 1e-14;

function initPhCalculator() {
  const form = document.getElementById("form-ph");
  const typeSelect = document.getElementById("ph-type");
  const kaGroup = document.querySelector('[data-role="ka"]');
  const kbGroup = document.querySelector('[data-role="kb"]');
  const output = document.getElementById("ph-result");

  if (!form || !typeSelect || !output) return;

  const toggleOptionalFields = () => {
    const type = typeSelect.value;
    kaGroup?.classList.toggle("hidden", type !== "weak-acid");
    kbGroup?.classList.toggle("hidden", type !== "weak-base");
    document.getElementById("ph-ka")?.toggleAttribute("required", type === "weak-acid");
    document.getElementById("ph-kb")?.toggleAttribute("required", type === "weak-base");
  };

  toggleOptionalFields();
  typeSelect.addEventListener("change", toggleOptionalFields);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const concentration = Number(document.getElementById("ph-concentration").value);
    const type = typeSelect.value;
    const ka = Number(document.getElementById("ph-ka").value);
    const kb = Number(document.getElementById("ph-kb").value);

    try {
      if (!Number.isFinite(concentration) || concentration <= 0) {
        throw new Error("יש להזין ריכוז חיובי");
      }

      let result;
      switch (type) {
        case "strong-acid":
          result = strongAcid(concentration);
          break;
        case "strong-base":
          result = strongBase(concentration);
          break;
        case "weak-acid":
          if (!Number.isFinite(ka) || ka <= 0) throw new Error("Ka חייב להיות גדול מאפס");
          result = weakAcid(concentration, ka);
          break;
        case "weak-base":
          if (!Number.isFinite(kb) || kb <= 0) throw new Error("Kb חייב להיות גדול מאפס");
          result = weakBase(concentration, kb);
          break;
        default:
          throw new Error("סוג תמיסה לא נתמך");
      }

      output.innerHTML = renderPhResult(result);
      showToast({ title: "חישוב הושלם", message: `pH = ${result.pH.toFixed(3)}`, type: "success" });
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

function strongAcid(concentration) {
  const h = concentration;
  const ph = -Math.log10(h);
  const poh = 14 - ph;
  return composeResult({ h, oh: AUTO_IONIZATION / h, ph, poh, type: "חומצה חזקה" });
}

function strongBase(concentration) {
  const oh = concentration;
  const poh = -Math.log10(oh);
  const ph = 14 - poh;
  return composeResult({ h: AUTO_IONIZATION / oh, oh, ph, poh, type: "בסיס חזק" });
}

function weakAcid(concentration, ka) {
  const x = solveQuadratic(1, ka, -(ka * concentration));
  const h = x;
  const ph = -Math.log10(h);
  const poh = 14 - ph;
  return composeResult({ h, oh: AUTO_IONIZATION / h, ph, poh, type: "חומצה חלשה", ka, concentration });
}

function weakBase(concentration, kb) {
  const x = solveQuadratic(1, kb, -(kb * concentration));
  const oh = x;
  const poh = -Math.log10(oh);
  const ph = 14 - poh;
  return composeResult({ h: AUTO_IONIZATION / oh, oh, ph, poh, type: "בסיס חלש", kb, concentration });
}

function solveQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    throw new Error("לא ניתן לפתור את המשוואה (דיסקרימיננטה שלילית)");
  }
  const root = (-b + Math.sqrt(discriminant)) / (2 * a);
  if (!Number.isFinite(root) || root <= 0) {
    throw new Error("לא התקבל פתרון חיובי");
  }
  return root;
}

function composeResult({ type, h, oh, ph, poh, ka, kb, concentration }) {
  return {
    type,
    pH: ph,
    pOH: poh,
    h,
    oh,
    ka,
    kb,
    concentration,
    classification: classify(ph)
  };
}

function classify(ph) {
  if (ph < 7) return "חומצי";
  if (ph > 7) return "בסיסי";
  return "נייטרלי";
}

function renderPhResult(result) {
  return `
    <div class="result-block">
      <p><strong>סוג:</strong> ${result.type}</p>
      <ul class="result-list">
        <li><strong>pH:</strong> ${result.pH.toFixed(3)}</li>
        <li><strong>pOH:</strong> ${result.pOH.toFixed(3)}</li>
        <li><strong>[H⁺]:</strong> ${formatScientific(result.h)} mol/L</li>
        <li><strong>[OH⁻]:</strong> ${formatScientific(result.oh)} mol/L</li>
        ${result.ka ? `<li><strong>Ka:</strong> ${result.ka}</li>` : ""}
        ${result.kb ? `<li><strong>Kb:</strong> ${result.kb}</li>` : ""}
        ${result.concentration ? `<li><strong>ריכוז:</strong> ${result.concentration} mol/L</li>` : ""}
        <li><strong>סיווג:</strong> ${result.classification}</li>
      </ul>
    </div>
  `;
}

function formatScientific(value) {
  if (!Number.isFinite(value)) return "N/A";
  if (value === 0) return "0";
  return value.toExponential(3);
}

export { initPhCalculator };
