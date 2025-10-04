import { showToast } from "../utils/notifications.js";
import { AVOGADRO } from "../utils/constants.js";

function initMassMoleConverter() {
  const form = document.getElementById("form-mass-moles");
  const output = document.getElementById("mass-moles-result");

  if (!form || !output) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const massInput = document.getElementById("mass-value");
    const molesInput = document.getElementById("moles-value");
    const particlesInput = document.getElementById("particles-value");
    const molarMassInput = document.getElementById("molar-mass-value");

    const molarMass = parseFloat(molarMassInput.value);
    if (!molarMass || molarMass <= 0) {
      showToast({ title: "מסה מולרית חסרה", message: "אנא הזינו מסה מולרית תקפה", type: "error" });
      return;
    }

    let mass = parseFloat(massInput.value);
    let moles = parseFloat(molesInput.value);
    let particles = parseFloat(particlesInput.value);

    const hasMass = !Number.isNaN(mass);
    const hasMoles = !Number.isNaN(moles);
    const hasParticles = !Number.isNaN(particles);

    if (!hasMass && !hasMoles && !hasParticles) {
      showToast({ title: "חסרים נתונים", message: "אנא הזינו לפחות ערך אחד לחישוב", type: "error" });
      return;
    }

    try {
      if (!hasMoles) {
        if (hasMass) {
          moles = mass / molarMass;
        } else if (hasParticles) {
          moles = particles / AVOGADRO;
        } else {
          throw new Error("לא ניתן לחשב מולים ללא נתון מסה או חלקיקים");
        }
      }

      if (!hasMass) {
        mass = moles * molarMass;
      }

      if (!hasParticles) {
        particles = moles * AVOGADRO;
      }

      massInput.value = mass.toFixed(6);
      molesInput.value = moles.toExponential(6);
      particlesInput.value = particles.toExponential(6);

      output.innerHTML = `
        <ul class="result-list">
          <li><strong>מסה:</strong> ${mass.toFixed(6)} g</li>
          <li><strong>מולים:</strong> ${moles.toExponential(6)} mol</li>
          <li><strong>מספר חלקיקים:</strong> ${particles.toExponential(6)}</li>
        </ul>
      `;
      showToast({ title: "המרה הצליחה", message: "הערכים חושבו מחדש", type: "success" });
    } catch (error) {
      console.error(error);
      showToast({ title: "שגיאה בהמרה", message: error.message, type: "error" });
    }
  });

  form.addEventListener("reset", () => {
    output.textContent = "";
  });
}

export { initMassMoleConverter };
