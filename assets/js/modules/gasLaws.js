import { showToast } from "../utils/notifications.js";

const GAS_CONSTANT = 0.082057366; // L·atm·K⁻¹·mol⁻¹

const PRESSURE_UNITS = {
  atm: {
    label: "אטמוספרות (atm)",
    toAtm: (value) => value,
    fromAtm: (value) => value
  },
  kpa: {
    label: "קילו־פסקל (kPa)",
    toAtm: (value) => value / 101.325,
    fromAtm: (value) => value * 101.325
  },
  mmhg: {
    label: "מילימטר כספית (mmHg)",
    toAtm: (value) => value / 760,
    fromAtm: (value) => value * 760
  },
  bar: {
    label: "בר (bar)",
    toAtm: (value) => value / 1.01325,
    fromAtm: (value) => value * 1.01325
  }
};

const VOLUME_UNITS = {
  l: {
    label: "ליטר (L)",
    toLiters: (value) => value,
    fromLiters: (value) => value
  },
  ml: {
    label: "מיליליטר (mL)",
    toLiters: (value) => value / 1000,
    fromLiters: (value) => value * 1000
  }
};

const TEMPERATURE_UNITS = {
  k: {
    label: "קלווין (K)",
    toKelvin: (value) => value,
    fromKelvin: (value) => value
  },
  c: {
    label: "צלזיוס (°C)",
    toKelvin: (value) => value + 273.15,
    fromKelvin: (value) => value - 273.15
  }
};

function initGasLawsCalculator() {
  const form = document.getElementById("form-gas-laws");
  if (!form) return;

  const resultContainer = form.querySelector("#gas-laws-result");
  const solveSelect = form.querySelector("#gas-solve-for");
  const pressureInput = form.querySelector("#gas-pressure");
  const pressureUnits = form.querySelector("#gas-pressure-units");
  const volumeInput = form.querySelector("#gas-volume");
  const volumeUnits = form.querySelector("#gas-volume-units");
  const molesInput = form.querySelector("#gas-moles");
  const temperatureInput = form.querySelector("#gas-temperature");
  const temperatureUnits = form.querySelector("#gas-temperature-units");

  const fieldGroups = {
    pressure: form.querySelector('[data-field="pressure"]'),
    volume: form.querySelector('[data-field="volume"]'),
    moles: form.querySelector('[data-field="moles"]'),
    temperature: form.querySelector('[data-field="temperature"]')
  };

  function updateTargetField(target) {
    Object.entries(fieldGroups).forEach(([key, group]) => {
      if (!group) return;
      const input = group.querySelector("input");
      const select = group.querySelector("select");
      const disable = key === target;
      if (input) {
        input.disabled = disable;
        if (disable) input.value = "";
      }
      if (select) {
        select.disabled = disable;
      }
      group.classList.toggle("is-disabled", disable);
    });
  }

  solveSelect?.addEventListener("change", () => {
    updateTargetField(solveSelect.value);
    resultContainer.innerHTML = "";
  });

  updateTargetField(solveSelect?.value ?? "pressure");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const solveFor = solveSelect?.value ?? "pressure";

    const inputs = {
      pressure: readNumber(pressureInput),
      volume: readNumber(volumeInput),
      moles: readNumber(molesInput),
      temperature: readNumber(temperatureInput)
    };

    const units = {
      pressure: pressureUnits?.value ?? "atm",
      volume: volumeUnits?.value ?? "l",
      temperature: temperatureUnits?.value ?? "k"
    };

    try {
      const calculation = calculateGasLaw({ solveFor, inputs, units });
      renderResult(resultContainer, calculation);
      showToast({
        title: "החישוב הצליח",
        message: `המשתנה ${getVariableLabel(solveFor)} חושב בהצלחה`,
        type: "success"
      });
    } catch (error) {
      console.error(error);
      resultContainer.innerHTML = "";
      showToast({
        title: "שגיאה בחישוב",
        message: error.message || "בדקו את הנתונים ונסו שוב",
        type: "error"
      });
    }
  });

  form.addEventListener("reset", () => {
    resultContainer.innerHTML = "";
    updateTargetField(solveSelect?.value ?? "pressure");
    showToast({ title: "איפוס", message: "השדות נוקו", type: "info" });
  });
}

function calculateGasLaw({ solveFor, inputs, units }) {
  const pressureUnit = PRESSURE_UNITS[units.pressure] ?? PRESSURE_UNITS.atm;
  const volumeUnit = VOLUME_UNITS[units.volume] ?? VOLUME_UNITS.l;
  const temperatureUnit = TEMPERATURE_UNITS[units.temperature] ?? TEMPERATURE_UNITS.k;

  const provided = {
    pressure: inputs.pressure,
    volume: inputs.volume,
    moles: inputs.moles,
    temperature: inputs.temperature
  };

  const base = {
    pressureAtm: provided.pressure != null ? pressureUnit.toAtm(provided.pressure) : null,
    volumeLiters: provided.volume != null ? volumeUnit.toLiters(provided.volume) : null,
    temperatureKelvin: provided.temperature != null ? temperatureUnit.toKelvin(provided.temperature) : null
  };

  if (solveFor !== "pressure" && (base.pressureAtm == null || base.pressureAtm <= 0)) {
    throw new Error("יש להזין לחץ גדול מאפס");
  }

  if (solveFor !== "volume" && (base.volumeLiters == null || base.volumeLiters <= 0)) {
    throw new Error("יש להזין נפח גדול מאפס");
  }

  if (solveFor !== "moles" && (provided.moles == null || provided.moles <= 0)) {
    throw new Error("יש להזין מספר מולים גדול מאפס");
  }

  if (solveFor !== "temperature") {
    if (base.temperatureKelvin == null || base.temperatureKelvin <= 0) {
      throw new Error("יש להזין טמפרטורה תקפה (מעל 0 K)");
    }
  }

  let resultValue;
  let resultBase;

  switch (solveFor) {
    case "pressure": {
      const volume = ensurePositive(base.volumeLiters, "נפח");
      const moles = ensurePositive(provided.moles, "מספר מולים");
      const temperature = ensurePositive(base.temperatureKelvin, "טמפרטורה");
      const pressureAtm = (moles * GAS_CONSTANT * temperature) / volume;
      resultValue = pressureUnit.fromAtm(pressureAtm);
      resultBase = pressureAtm;
      base.pressureAtm = pressureAtm;
      break;
    }
    case "volume": {
      const pressure = ensurePositive(base.pressureAtm, "לחץ");
      const moles = ensurePositive(provided.moles, "מספר מולים");
      const temperature = ensurePositive(base.temperatureKelvin, "טמפרטורה");
      const volumeLiters = (moles * GAS_CONSTANT * temperature) / pressure;
      resultValue = volumeUnit.fromLiters(volumeLiters);
      resultBase = volumeLiters;
      base.volumeLiters = volumeLiters;
      break;
    }
    case "moles": {
      const pressure = ensurePositive(base.pressureAtm, "לחץ");
      const volume = ensurePositive(base.volumeLiters, "נפח");
      const temperature = ensurePositive(base.temperatureKelvin, "טמפרטורה");
      const moles = (pressure * volume) / (GAS_CONSTANT * temperature);
      resultValue = moles;
      resultBase = moles;
      provided.moles = moles;
      break;
    }
    case "temperature": {
      const pressure = ensurePositive(base.pressureAtm, "לחץ");
      const volume = ensurePositive(base.volumeLiters, "נפח");
      const moles = ensurePositive(provided.moles, "מספר מולים");
      const temperatureKelvin = (pressure * volume) / (GAS_CONSTANT * moles);
      resultValue = TEMPERATURE_UNITS[units.temperature]?.fromKelvin(temperatureKelvin) ?? temperatureKelvin;
      resultBase = temperatureKelvin;
      base.temperatureKelvin = temperatureKelvin;
      break;
    }
    default:
      throw new Error("משתנה לחישוב אינו נתמך");
  }

  return {
    solveFor,
    resultValue,
    resultUnit: getUnitLabel(solveFor, units),
    provided,
    base,
    conversions: buildConversionSummary(provided, base, units)
  };
}

function buildConversionSummary(provided, base, units) {
  return {
    pressure: provided.pressure != null ? { original: provided.pressure, base: base.pressureAtm, unit: units.pressure } : null,
    volume: provided.volume != null ? { original: provided.volume, base: base.volumeLiters, unit: units.volume } : null,
    temperature: provided.temperature != null ? { original: provided.temperature, base: base.temperatureKelvin, unit: units.temperature } : null
  };
}

function renderResult(container, calculation) {
  if (!container) return;
  const { solveFor, resultValue, resultUnit, base, conversions } = calculation;
  const formatted = formatNumber(resultValue);
  const equationDetail = buildEquationDetail(calculation);

  const conversionTableRows = [
    conversions.pressure && `
      <tr>
        <th scope="row">לחץ</th>
        <td>${formatNumber(conversions.pressure.original)} ${getUnitLabel("pressure", { pressure: conversions.pressure.unit })}</td>
        <td>${formatNumber(base.pressureAtm)} atm</td>
      </tr>
    `,
    conversions.volume && `
      <tr>
        <th scope="row">נפח</th>
        <td>${formatNumber(conversions.volume.original)} ${getUnitLabel("volume", { volume: conversions.volume.unit })}</td>
        <td>${formatNumber(base.volumeLiters)} L</td>
      </tr>
    `,
    conversions.temperature && `
      <tr>
        <th scope="row">טמפרטורה</th>
        <td>${formatNumber(conversions.temperature.original)} ${getUnitLabel("temperature", { temperature: conversions.temperature.unit })}</td>
        <td>${formatNumber(base.temperatureKelvin)} K</td>
      </tr>
    `
  ]
    .filter(Boolean)
    .join("");

  container.innerHTML = `
    <div class="result-block">
      <h3>תוצאה: ${formatted} ${resultUnit}</h3>
      <p>${equationDetail}</p>
      <div class="result-columns">
        <div>
          <h4>נתוני בסיס (יחידות SI)</h4>
          <table class="result-table">
            <thead>
              <tr>
                <th scope="col">גודל</th>
                <th scope="col">ערך מקור</th>
                <th scope="col">ערך לאחר המרה</th>
              </tr>
            </thead>
            <tbody>
              ${conversionTableRows || '<tr><td colspan="3">לא הוזנו המרות נוספות</td></tr>'}
            </tbody>
          </table>
        </div>
        <div>
          <h4>קבועים ונוסחה</h4>
          <ul class="result-list">
            <li>קבוע הגזים האוניברסלי R = ${GAS_CONSTANT} L·atm·mol⁻¹·K⁻¹</li>
            <li>משוואה: PV = nRT</li>
            <li>משתנה מחושב: ${getVariableLabel(solveFor)}</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function buildEquationDetail({ solveFor, base, provided }) {
  const p = base.pressureAtm != null ? `${formatNumber(base.pressureAtm)} atm` : "P";
  const v = base.volumeLiters != null ? `${formatNumber(base.volumeLiters)} L` : "V";
  const n = provided.moles != null ? `${formatNumber(provided.moles)} mol` : "n";
  const t = base.temperatureKelvin != null ? `${formatNumber(base.temperatureKelvin)} K` : "T";

  switch (solveFor) {
    case "pressure":
      return `P = (nRT) / V = (${n} × ${GAS_CONSTANT} × ${t}) / ${v}`;
    case "volume":
      return `V = (nRT) / P = (${n} × ${GAS_CONSTANT} × ${t}) / ${p}`;
    case "moles":
      return `n = (PV) / (RT) = (${p} × ${v}) / (${GAS_CONSTANT} × ${t})`;
    case "temperature":
      return `T = (PV) / (nR) = (${p} × ${v}) / (${n} × ${GAS_CONSTANT})`;
    default:
      return "PV = nRT";
  }
}

function ensurePositive(value, name) {
  if (value == null || value <= 0) {
    throw new Error(`${name} חייב להיות גדול מאפס`);
  }
  return value;
}

function readNumber(input) {
  if (!input || input.disabled) return null;
  const value = input.value.trim();
  if (value === "") return null;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(3);
  }
  return Number(value).toFixed(4).replace(/\.0+$/, ".0").replace(/(\.[0-9]*[1-9])0+$/, "$1");
}

function getVariableLabel(key) {
  switch (key) {
    case "pressure":
      return "לחץ (P)";
    case "volume":
      return "נפח (V)";
    case "moles":
      return "מספר מולים (n)";
    case "temperature":
      return "טמפרטורה (T)";
    default:
      return key;
  }
}

function getUnitLabel(variable, units) {
  switch (variable) {
    case "pressure":
      return PRESSURE_UNITS[units.pressure]?.label ?? "atm";
    case "volume":
      return VOLUME_UNITS[units.volume]?.label ?? "L";
    case "temperature":
      return TEMPERATURE_UNITS[units.temperature]?.label ?? "K";
    case "moles":
      return "mol";
    default:
      return "";
  }
}

export { initGasLawsCalculator };
