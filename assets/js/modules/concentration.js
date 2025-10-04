import { showToast } from "../utils/notifications.js";

function initConcentrationTools() {
  const form = document.getElementById("form-concentration");
  if (!form) return;

  const tabs = Array.from(form.querySelectorAll(".tab-button"));
  const panels = Array.from(form.querySelectorAll("[data-tab-panel]"));
  const output = document.getElementById("concentration-result");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.toggle("active", btn === tab));
      panels.forEach((panel) => {
        panel.hidden = panel.getAttribute("data-tab-panel") !== tab.dataset.tab;
      });
      form.dataset.activeTab = tab.dataset.tab;
      output.textContent = "";
    });
  });

  form.dataset.activeTab = tabs[0]?.dataset.tab ?? "molarity";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const activeTab = form.dataset.activeTab || "molarity";

    try {
      let result;
      switch (activeTab) {
        case "molarity":
          result = calculateMolarity();
          break;
        case "percent":
          result = calculatePercent();
          break;
        case "ppm":
          result = calculatePPM();
          break;
        case "dilution":
          result = calculateDilutionTab();
          break;
        default:
          throw new Error("לשונית לא נתמכת");
      }
      output.innerHTML = renderResult(result);
      showToast({ title: "חישוב הושלם", message: result.message, type: "success" });
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

function calculateMolarity() {
  const molesInput = document.getElementById("molarity-moles");
  const volumeInput = document.getElementById("molarity-volume");
  const massInput = document.getElementById("molarity-mass");
  const molarMassInput = document.getElementById("molarity-molar-mass");

  const volume = parsePositive(volumeInput.value, "נפח") ?? null;
  const molarMass = parsePositive(molarMassInput.value, "מסה מולרית", false);
  let moles = parsePositive(molesInput.value, "מולים", false);
  let mass = parsePositive(massInput.value, "מסה", false);

  if (!volume) throw new Error("יש להזין נפח (בליטרים)");

  if (!moles) {
    if (mass && molarMass) {
      moles = mass / molarMass;
    } else {
      throw new Error("חסרים נתונים לחישוב מולים");
    }
  }

  if (!mass && molarMass) {
    mass = moles * molarMass;
  }

  if (!molarMass && mass) {
    throw new Error("לחישוב על בסיס מסה נדרש להזין מסה מולרית");
  }

  const molarity = moles / volume;
  molesInput.value = moles.toExponential(6);
  if (mass != null) {
    massInput.value = mass.toFixed(6);
  }
  const message = `M = ${molarity.toFixed(4)} mol/L`;
  return {
    message,
    rows: [
      { label: "ריכוז מולרי", value: `${molarity.toFixed(4)} mol/L` },
      { label: "מולים", value: `${moles.toExponential(6)} mol` },
      { label: "נפח", value: `${volume.toFixed(4)} L` },
      mass != null ? { label: "מסה", value: `${mass.toFixed(4)} g` } : null
    ].filter(Boolean)
  };
}

function calculatePercent() {
  const massInput = document.getElementById("percent-mass");
  const volumeInput = document.getElementById("percent-volume");

  const mass = parsePositive(massInput.value, "מסה");
  const volume = parsePositive(volumeInput.value, "נפח");

  const percent = (mass / volume) * 100;
  return {
    message: `%w/v = ${percent.toFixed(2)}%`,
    rows: [
      { label: "מסה", value: `${mass.toFixed(4)} g` },
      { label: "נפח", value: `${volume.toFixed(2)} mL` },
      { label: "אחוז", value: `${percent.toFixed(2)} %` }
    ]
  };
}

function calculatePPM() {
  const soluteInput = document.getElementById("ppm-solute");
  const solutionInput = document.getElementById("ppm-solution");

  const solute = parsePositive(soluteInput.value, "מסה מומס");
  const solution = parsePositive(solutionInput.value, "מסה/נפח תמיסה");

  const ppm = (solute / solution) * 1e6;
  return {
    message: `ppm = ${ppm.toFixed(2)}`,
    rows: [
      { label: "מסה מומס", value: `${solute.toFixed(4)} mg` },
      { label: "מסה/נפח תמיסה", value: `${solution.toFixed(4)} L / kg` },
      { label: "ppm", value: ppm.toFixed(2) }
    ]
  };
}

function calculateDilutionTab() {
  const fields = {
    c1: parsePositive(document.getElementById("dilution-c1").value, "C₁", false),
    v1: parsePositive(document.getElementById("dilution-v1").value, "V₁", false),
    c2: parsePositive(document.getElementById("dilution-c2").value, "C₂", false),
    v2: parsePositive(document.getElementById("dilution-v2").value, "V₂", false)
  };

  const provided = Object.values(fields).filter((value) => value != null).length;
  if (provided !== 3) {
    throw new Error("יש להזין שלושה ערכים ולחשב את הרביעי");
  }

  if (fields.c1 == null) {
    fields.c1 = (fields.c2 * fields.v2) / fields.v1;
  } else if (fields.v1 == null) {
    fields.v1 = (fields.c2 * fields.v2) / fields.c1;
  } else if (fields.c2 == null) {
    fields.c2 = (fields.c1 * fields.v1) / fields.v2;
  } else if (fields.v2 == null) {
    fields.v2 = (fields.c1 * fields.v1) / fields.c2;
  }

  document.getElementById("dilution-c1").value = fields.c1.toFixed(6);
  document.getElementById("dilution-v1").value = fields.v1.toFixed(6);
  document.getElementById("dilution-c2").value = fields.c2.toFixed(6);
  document.getElementById("dilution-v2").value = fields.v2.toFixed(6);

  return {
    message: "נוסחת הדילול הושלמה",
    rows: [
      { label: "C₁", value: `${fields.c1.toFixed(6)} M` },
      { label: "V₁", value: `${fields.v1.toFixed(6)} L` },
      { label: "C₂", value: `${fields.c2.toFixed(6)} M` },
      { label: "V₂", value: `${fields.v2.toFixed(6)} L` }
    ]
  };
}

function parsePositive(value, label, required = true) {
  if (value === "" || value == null) {
    if (required) throw new Error(`השדה ${label} חובה`);
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`ערך לא חוקי עבור ${label}`);
  }
  return numeric;
}

function renderResult({ rows }) {
  const items = rows
    .map((row) => `<li><strong>${row.label}:</strong> ${row.value}</li>`)
    .join("");
  return `<ul class="result-list">${items}</ul>`;
}

export { initConcentrationTools };
