import { showToast } from "./utils/notifications.js";
import { getElementsData, getEnthalpyData } from "./utils/dataLoader.js";
import { initMolarMassCalculator } from "./modules/molarMass.js";
import { initMassMoleConverter } from "./modules/massMoles.js";
import { initPercentComposition } from "./modules/percentComposition.js";
import { initConcentrationTools } from "./modules/concentration.js";
import { initPhCalculator } from "./modules/phCalculator.js";
import { initIceCalculator } from "./modules/iceCalculator.js";
import { initEnthalpyCalculator } from "./modules/enthalpy.js";
import { initEmpiricalCalculator } from "./modules/empirical.js";
import { initEquationBalancer } from "./modules/equationBalancer.js";
import { initDilutionTool } from "./modules/dilution.js";
import { initSolutionPrep } from "./modules/solutionPrep.js";
import { initInventoryManager } from "./modules/inventory.js";
import { initReportBuilder } from "./modules/reportBuilder.js";
import { initGasLawsCalculator } from "./modules/gasLaws.js";

const STORAGE_KEYS = {
  THEME: "chemtools-theme"
};

const appState = {
  theme: "light",
  elements: null,
  elementsMap: null,
  enthalpy: null
};

const molecularArtState = {
  active: false,
  intervalId: null,
  animationId: null,
  resizeHandler: null,
  particles: [],
  flowingParticles: [],
  scene: null,
  canvas: null,
  ctx: null,
  moleculeArt: null,
  formulaDisplay: null,
  moleculeName: null,
  structures: [],
  currentStructure: 0
};

const backdrop = document.querySelector("[data-modal-backdrop]");
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.querySelector(".navbar__toggle");
const navLinks = document.querySelector(".navbar__links");

const mobileQuery = window.matchMedia("(max-width: 900px)");
const colorSchemeQuery =
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function init() {
  bindNavigation();
  bindTheme();
  bindModals();
  hydrateTheme();
  initTools();
}

function bindNavigation() {
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-active", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) {
        navLinks.classList.remove("is-open");
        navToggle.classList.remove("is-active");
      }
    });
  });
}

function bindTheme() {
  if (!themeToggle) return;

  themeToggle.addEventListener("click", () => {
    const nextTheme = appState.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persistTheme(nextTheme);
  });
}

function bindModals() {
  const cards = document.querySelectorAll(".tool-card");
  const closeButtons = document.querySelectorAll("[data-close-modal]");

  cards.forEach((card) => {
    const targetId = card.getAttribute("data-modal");
    if (!targetId) return;

    card.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const isButton = event.target.matches("button") || event.target.closest("button");
      if (!isButton) return;

      const modal = document.getElementById(targetId);
      if (modal) openModal(modal);
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  backdrop?.addEventListener("click", () => {
    document.querySelectorAll(".modal:not([hidden])").forEach((modal) => closeModal(modal));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal:not([hidden])").forEach((modal) => closeModal(modal));
    }
  });
}

function initTools() {
  Promise.all([getElementsData(), getEnthalpyData()])
    .then(([elements, enthalpy]) => {
      appState.elements = elements;
      appState.enthalpy = enthalpy;
      appState.elementsMap = buildElementsMap(elements);

      initMolarMassCalculator(appState.elementsMap);
      initMassMoleConverter();
      initPercentComposition(appState.elementsMap);
      initConcentrationTools();
  initGasLawsCalculator();
      initPhCalculator();
      initIceCalculator(appState.elementsMap);
      initEnthalpyCalculator(appState.elementsMap, enthalpy);
      initEmpiricalCalculator(appState.elementsMap);
      initEquationBalancer(appState.elementsMap);
      initDilutionTool();
      initSolutionPrep();
      initInventoryManager();
      initReportBuilder();
    })
    .catch((error) => {
      console.error(error);
      showToast({
        title: "שגיאה בטעינה",
        message: "חלק מהנתונים לא נטענו – חלק מהכלים עשויים שלא לפעול.",
        type: "error"
      });
    });
}

function buildElementsMap(elements) {
  const map = new Map();
  elements.forEach((element) => {
    map.set(element.symbol, element);
  });
  return map;
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  appState.theme = theme;
  updateThemeToggleUI(theme);

  updateMolecularArt(theme);
}

function updateThemeToggleUI(theme) {
  if (!themeToggle) return;

  themeToggle.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");

  const iconEl = themeToggle.querySelector(".theme-switch__icon");
  if (iconEl) {
    iconEl.textContent = theme === "dark" ? "🌙" : "☀️";
  }

  const textEl = themeToggle.querySelector(".theme-switch__text");
  if (textEl) {
    textEl.textContent = theme === "dark" ? "מצב כהה" : "מצב בהיר";
  }

  const nextTheme = theme === "dark" ? "בהיר" : "כהה";
  const ariaLabel = `החלף למצב ${nextTheme}`;
  themeToggle.setAttribute("aria-label", ariaLabel);
  themeToggle.setAttribute("title", ariaLabel);
}

function hydrateTheme() {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    setTheme(storedTheme);
    return;
  }

  applySystemTheme();
  registerSystemThemeListener();
}

function persistTheme(theme) {
  try {
    if (shouldClearStoredTheme(theme)) {
      localStorage.removeItem(STORAGE_KEYS.THEME);
      return;
    }

    const payload = JSON.stringify({
      value: theme,
      source: "user",
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem(STORAGE_KEYS.THEME, payload);
  } catch (error) {
    console.warn("לא ניתן לשמור את נושא התצוגה", error);
  }
}

function shouldClearStoredTheme(theme) {
  if (!colorSchemeQuery) return false;
  const systemTheme = colorSchemeQuery.matches ? "dark" : "light";
  return systemTheme === theme;
}

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (!raw) return null;

    if (raw === "light" || raw === "dark") {
      localStorage.removeItem(STORAGE_KEYS.THEME);
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.value === "string") {
      return parsed.value;
    }

    localStorage.removeItem(STORAGE_KEYS.THEME);
    return null;
  } catch (error) {
    console.warn("לא ניתן לקרוא את נושא התצוגה", error);
    return null;
  }
}

function applySystemTheme() {
  const systemTheme = colorSchemeQuery && colorSchemeQuery.matches ? "dark" : "light";
  setTheme(systemTheme);
}

function registerSystemThemeListener() {
  if (!colorSchemeQuery) return;

  const handler = (event) => {
    if (getStoredTheme()) return;
    setTheme(event.matches ? "dark" : "light");
  };

  if (typeof colorSchemeQuery.addEventListener === "function") {
    colorSchemeQuery.addEventListener("change", handler);
  } else if (typeof colorSchemeQuery.addListener === "function") {
    colorSchemeQuery.addListener(handler);
  }
}

function openModal(modal) {
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  backdrop?.classList.add("is-visible");
  backdrop?.removeAttribute("hidden");
  trapFocus(modal);
}

function closeModal(modal) {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");

  const openModals = document.querySelectorAll(".modal:not([hidden])");
  if (openModals.length === 0) {
    backdrop?.classList.remove("is-visible");
    backdrop?.setAttribute("hidden", "true");
  }
}

function trapFocus(modal) {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea",
    "input",
    "select",
    "[tabindex]:not([tabindex='-1'])"
  ];
  const focusables = Array.from(modal.querySelectorAll(focusableSelectors.join(",")));
  if (focusables.length) {
    focusables[0].focus();
  }
}

function updateMolecularArt(theme) {
  if (theme === "light") {
    startMolecularArt();
  } else {
    stopMolecularArt();
  }
}

function startMolecularArt() {
  const scene = document.querySelector("[data-molecule-scene]");
  if (!scene) return;

  stopMolecularArt();

  requestAnimationFrame(() => {
    if (appState.theme !== "light") return;

    const moleculeArt = scene.querySelector("[data-molecule-art]");
    const formulaDisplay = scene.querySelector("[data-molecule-formula]");
    const moleculeName = scene.querySelector("[data-molecule-name]");
    const canvas = scene.querySelector("[data-molecule-canvas]");

    if (!moleculeArt || !formulaDisplay || !moleculeName || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const structures = [
      {
        name: "C₆H₆",
        englishName: "Benzene",
        hebrewName: "בנזן",
        nodes: [
          { angle: 0, distance: 110, type: "normal" },
          { angle: 60, distance: 110, type: "normal" },
          { angle: 120, distance: 110, type: "normal" },
          { angle: 180, distance: 110, type: "normal" },
          { angle: 240, distance: 110, type: "normal" },
          { angle: 300, distance: 110, type: "normal" }
        ]
      },
      {
        name: "H₂O",
        englishName: "Water",
        hebrewName: "מים",
        nodes: [
          { angle: 0, distance: 0, type: "special" },
          { angle: 52, distance: 85, type: "accent" },
          { angle: 308, distance: 85, type: "accent" }
        ]
      },
      {
        name: "CO₂",
        englishName: "Carbon Dioxide",
        hebrewName: "פחמן דו-חמצני",
        nodes: [
          { angle: 0, distance: 0, type: "normal" },
          { angle: 0, distance: 100, type: "special" },
          { angle: 180, distance: 100, type: "special" }
        ]
      },
      {
        name: "CH₄",
        englishName: "Methane",
        hebrewName: "מתאן",
        nodes: [
          { angle: 0, distance: 0, type: "normal" },
          { angle: 60, distance: 95, type: "accent" },
          { angle: 180, distance: 95, type: "accent" },
          { angle: 300, distance: 95, type: "accent" },
          { angle: 330, distance: 70, type: "special" }
        ]
      },
      {
        name: "NH₃",
        englishName: "Ammonia",
        hebrewName: "אמוניה",
        nodes: [
          { angle: 0, distance: 0, type: "special" },
          { angle: 80, distance: 90, type: "accent" },
          { angle: 200, distance: 90, type: "accent" },
          { angle: 320, distance: 90, type: "accent" }
        ]
      },
      {
        name: "C₂H₅OH",
        englishName: "Ethanol",
        hebrewName: "אתנול",
        nodes: [
          { angle: 0, distance: 0, type: "normal" },
          { angle: 180, distance: 80, type: "normal" },
          { angle: 30, distance: 110, type: "special" },
          { angle: 300, distance: 110, type: "accent" },
          { angle: 90, distance: 95, type: "accent" },
          { angle: 240, distance: 95, type: "accent" }
        ]
      },
      {
        name: "C₆H₁₂O₆",
        englishName: "Glucose",
        hebrewName: "גלוקוז",
        nodes: [
          { angle: 0, distance: 100, type: "normal" },
          { angle: 60, distance: 100, type: "normal" },
          { angle: 120, distance: 100, type: "special" },
          { angle: 180, distance: 100, type: "normal" },
          { angle: 240, distance: 100, type: "normal" },
          { angle: 300, distance: 100, type: "special" }
        ]
      },
      {
        name: "C₈H₁₀N₄O₂",
        englishName: "Caffeine",
        hebrewName: "קפאין",
        nodes: [
          { angle: 0, distance: 90, type: "normal" },
          { angle: 51.4, distance: 90, type: "special" },
          { angle: 102.8, distance: 90, type: "normal" },
          { angle: 154.2, distance: 90, type: "accent" },
          { angle: 205.6, distance: 90, type: "special" },
          { angle: 257, distance: 90, type: "normal" },
          { angle: 308.4, distance: 90, type: "accent" }
        ]
      },
      {
        name: "O₂",
        englishName: "Oxygen",
        hebrewName: "חמצן",
        nodes: [
          { angle: 0, distance: 60, type: "special" },
          { angle: 180, distance: 60, type: "special" }
        ]
      },
      {
        name: "NaCl",
        englishName: "Sodium Chloride",
        hebrewName: "מלח",
        nodes: [
          { angle: 0, distance: 0, type: "accent" },
          { angle: 0, distance: 90, type: "special" },
          { angle: 90, distance: 90, type: "accent" },
          { angle: 180, distance: 90, type: "special" },
          { angle: 270, distance: 90, type: "accent" }
        ]
      },
      {
        name: "C₃H₈",
        englishName: "Propane",
        hebrewName: "פרופאן",
        nodes: [
          { angle: 0, distance: 0, type: "normal" },
          { angle: 0, distance: 80, type: "normal" },
          { angle: 180, distance: 80, type: "normal" },
          { angle: 60, distance: 115, type: "accent" },
          { angle: 300, distance: 115, type: "accent" },
          { angle: 120, distance: 115, type: "accent" },
          { angle: 240, distance: 115, type: "accent" }
        ]
      },
      {
        name: "SO₂",
        englishName: "Sulfur Dioxide",
        hebrewName: "גופרית דו-חמצנית",
        nodes: [
          { angle: 0, distance: 0, type: "special" },
          { angle: 119, distance: 90, type: "accent" },
          { angle: 241, distance: 90, type: "accent" }
        ]
      }
    ];

    const setCanvasSize = () => {
      const rect = scene.getBoundingClientRect();
      canvas.width = Math.max(rect.width, 1);
      canvas.height = Math.max(rect.height, 1);
    };

    setCanvasSize();

    const particleElements = [];
    for (let i = 0; i < 120; i++) {
      const particle = document.createElement("div");
      particle.className = "particle-field";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.setProperty("--tx", `${(Math.random() - 0.5) * 500}px`);
      particle.style.setProperty("--ty", `${(Math.random() - 0.5) * 500}px`);
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.animationDuration = `${12 + Math.random() * 10}s`;
      scene.appendChild(particle);
      particleElements.push(particle);
    }

    const renderStructure = (index, animateText = true) => {
      const structure = structures[index];
      if (!structure) return;

      moleculeArt.querySelectorAll(".atom-node, .connection-line").forEach((el) => el.remove());

      const rect = moleculeArt.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      structure.nodes.forEach((node, nodeIndex) => {
        const atom = document.createElement("div");
        atom.className = `atom-node ${node.type}`;
        const radians = (node.angle * Math.PI) / 180;
        const x = centerX + Math.cos(radians) * node.distance;
        const y = centerY + Math.sin(radians) * node.distance;

        atom.style.left = `${x - 11}px`;
        atom.style.top = `${y - 11}px`;
        atom.style.animationDelay = `${nodeIndex * 0.08}s`;
        moleculeArt.appendChild(atom);

        if (nodeIndex > 0) {
          const anchor = structure.nodes[0];
          const anchorRadians = (anchor.angle * Math.PI) / 180;
          const anchorX = centerX + Math.cos(anchorRadians) * anchor.distance;
          const anchorY = centerY + Math.sin(anchorRadians) * anchor.distance;

          const dx = x - anchorX;
          const dy = y - anchorY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

          const line = document.createElement("div");
          line.className = "connection-line";
          line.style.left = `${anchorX}px`;
          line.style.top = `${anchorY}px`;
          line.style.width = `${length}px`;
          line.style.animationDelay = `${nodeIndex * 0.1}s`;
          line.style.transform = `rotate(${angleDeg}deg)`;
          moleculeArt.appendChild(line);
        }
      });

      if (structure.nodes.length > 2) {
        structure.nodes.forEach((node, nodeIndex) => {
          if (nodeIndex > 0 && nodeIndex < structure.nodes.length - 1) {
            const currentRadians = (node.angle * Math.PI) / 180;
            const next = structure.nodes[nodeIndex + 1];
            const nextRadians = (next.angle * Math.PI) / 180;

            const x1 = centerX + Math.cos(currentRadians) * node.distance;
            const y1 = centerY + Math.sin(currentRadians) * node.distance;
            const x2 = centerX + Math.cos(nextRadians) * next.distance;
            const y2 = centerY + Math.sin(nextRadians) * next.distance;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

            const line = document.createElement("div");
            line.className = "connection-line";
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.width = `${length}px`;
            line.style.animationDelay = `${nodeIndex * 0.12}s`;
            line.style.transform = `rotate(${angleDeg}deg)`;
            moleculeArt.appendChild(line);
          }
        });
      }

      if (formulaDisplay && moleculeName) {
        if (animateText) {
          formulaDisplay.style.animation = "none";
          moleculeName.style.animation = "none";
          void formulaDisplay.offsetWidth;
        }

        formulaDisplay.innerHTML =
          `<span class="formula-display__formula">${structure.name}</span>` +
          `<span class="formula-display__hebrew">${structure.hebrewName}</span>`;

        moleculeName.textContent = structure.englishName;

        if (animateText) {
          formulaDisplay.style.animation = "fadeInText 2s ease-out forwards";
          moleculeName.style.animation = "fadeInText 2s 0.5s ease-out forwards";
        }
      }
    };

    renderStructure(0, true);

    molecularArtState.currentStructure = 0;

    molecularArtState.intervalId = window.setInterval(() => {
      molecularArtState.currentStructure = (molecularArtState.currentStructure + 1) % structures.length;
      renderStructure(molecularArtState.currentStructure, true);
    }, 7000);

    class FlowingParticle {
      constructor(width, height) {
        this.reset(width, height);
      }

      reset(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        this.opacity = Math.random() * 0.6 + 0.2;
        this.hue = Math.random() * 60 + 240;
      }

      update(width, height) {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < -10 || this.x > width + 10 || this.y < -10 || this.y > height + 10) {
          this.reset(width, height);
        }
      }

      draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        gradient.addColorStop(0, `hsla(${this.hue}, 70%, 60%, ${this.opacity})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 70%, 60%, 0)`);
        context.fillStyle = gradient;
        context.fill();
      }
    }

    const flowingParticles = Array.from({ length: 150 }, () => new FlowingParticle(canvas.width, canvas.height));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      flowingParticles.forEach((particle) => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      molecularArtState.animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!molecularArtState.active) return;
      setCanvasSize();
      flowingParticles.forEach((particle) => particle.reset(canvas.width, canvas.height));
      renderStructure(molecularArtState.currentStructure, false);
    };

    window.addEventListener("resize", handleResize);

    molecularArtState.active = true;
    molecularArtState.scene = scene;
    molecularArtState.canvas = canvas;
    molecularArtState.ctx = ctx;
    molecularArtState.moleculeArt = moleculeArt;
    molecularArtState.formulaDisplay = formulaDisplay;
    molecularArtState.moleculeName = moleculeName;
    molecularArtState.structures = structures;
    molecularArtState.flowingParticles = flowingParticles;
    molecularArtState.particles = particleElements;
    molecularArtState.resizeHandler = handleResize;
  });
}

function stopMolecularArt() {
  if (!molecularArtState.active) return;

  if (molecularArtState.intervalId) {
    clearInterval(molecularArtState.intervalId);
    molecularArtState.intervalId = null;
  }

  if (molecularArtState.animationId) {
    cancelAnimationFrame(molecularArtState.animationId);
    molecularArtState.animationId = null;
  }

  if (molecularArtState.resizeHandler) {
    window.removeEventListener("resize", molecularArtState.resizeHandler);
    molecularArtState.resizeHandler = null;
  }

  molecularArtState.particles.forEach((particle) => particle.remove());
  molecularArtState.particles = [];

  molecularArtState.scene?.querySelectorAll(".trail").forEach((trail) => trail.remove());

  if (molecularArtState.moleculeArt) {
    molecularArtState.moleculeArt.querySelectorAll(".atom-node, .connection-line").forEach((el) => el.remove());
  }

  if (molecularArtState.formulaDisplay) {
    molecularArtState.formulaDisplay.textContent = "";
    molecularArtState.formulaDisplay.style.animation = "none";
    void molecularArtState.formulaDisplay.offsetWidth;
    molecularArtState.formulaDisplay.style.removeProperty("animation");
  }

  if (molecularArtState.moleculeName) {
    molecularArtState.moleculeName.textContent = "";
    molecularArtState.moleculeName.style.animation = "none";
    void molecularArtState.moleculeName.offsetWidth;
    molecularArtState.moleculeName.style.removeProperty("animation");
  }

  if (molecularArtState.ctx && molecularArtState.canvas) {
    molecularArtState.ctx.clearRect(0, 0, molecularArtState.canvas.width, molecularArtState.canvas.height);
  }

  molecularArtState.flowingParticles = [];
  molecularArtState.scene = null;
  molecularArtState.canvas = null;
  molecularArtState.ctx = null;
  molecularArtState.moleculeArt = null;
  molecularArtState.formulaDisplay = null;
  molecularArtState.moleculeName = null;
  molecularArtState.structures = [];
  molecularArtState.currentStructure = 0;
  molecularArtState.active = false;
}

window.addEventListener("DOMContentLoaded", () => {
  init();
});

export { appState };
