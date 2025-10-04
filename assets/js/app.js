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

const STORAGE_KEYS = {
  THEME: "chemtools-theme"
};

const appState = {
  theme: "dark",
  elements: null,
  elementsMap: null,
  enthalpy: null
};

const backdrop = document.querySelector("[data-modal-backdrop]");
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.querySelector(".navbar__toggle");
const navLinks = document.querySelector(".navbar__links");

const mobileQuery = window.matchMedia("(max-width: 900px)");

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
  themeToggle?.setAttribute("data-theme", theme);
  const icon = theme === "dark" ? "🌙" : "☀️";
  const iconEl = themeToggle?.querySelector(".theme-switch__icon");
  if (iconEl) iconEl.textContent = icon;
}

function hydrateTheme() {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (storedTheme === "dark" || storedTheme === "light") {
    setTheme(storedTheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn("לא ניתן לשמור את נושא התצוגה", error);
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

window.addEventListener("DOMContentLoaded", init);

export { appState };
