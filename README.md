<div align="center">

# 🧪 ChemTools  
*A Hebrew-first Chemistry Toolkit for Students and Professionals*  

Built with **HTML, CSS, and JavaScript** — a single-page web app (SPA) packed with powerful calculators and lab tools.  
No backend. No setup. Just open and explore.  

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-2ea44f?style=for-the-badge&logo=github)](https://noamismach.github.io/ChemTools)

</div>

---

## Overview

**ChemTools** is a modern chemistry toolkit designed entirely in Hebrew (RTL).  
It offers a smooth, responsive interface with a wide set of calculators, laboratory tools, and data files — all running **locally** inside your browser.

---

## ✨ Key Features

- **Modern UI (RTL)** — responsive Glassmorphism design, dark/light themes, and smooth animations.  
- **Powerful Calculators**  
  - Molar Mass (supports hydrates)  
  - Equation Balancer  
  - Mass–Mole–Particle Conversions  
  - Percent Composition  
  - Concentration and Dilution Tools  
  - Ideal Gas Law (`PV = nRT`) with unit conversions  
  - pH / pOH / Ka / Kb / ICE Table Generator  
  - Reaction Enthalpy (ΔH°) from dataset  
  - Empirical & Molecular Formula Finder  
- **Laboratory Tools**  
  - Chemical Inventory Manager (stored in `localStorage`)  
  - Solution Preparation Assistant  
  - Experiment Report Generator (print/export ready)  
- **Fully Offline** — includes local datasets (`elements.json`, `enthalpy.json`).  
- **Smart UX** — modals, toasts, saved preferences, and input validation for error-free work.

---

## 🧩 Folder Structure

chem/
│ index.html ← Main SPA and modals
│ README.md
├─ assets/
│ ├─ css/style.css ← Styling, responsiveness, dark/light mode
│ ├─ data/
│ │ elements.json ← Periodic table data
│ │ enthalpy.json ← Reaction ΔH° dataset
│ └─ js/
│ app.js ← Core initialization & UI control
│ utils/… ← Shared logic (Math, Chemistry, Toast, etc.)
│ modules/… ← Individual calculators and lab tools

---

## 🚀 Quick Start

1. Clone or download the repository:  
   ```bash
   git clone https://github.com/noamismach/ChemTools.git
   cd ChemTools/chem
Open index.html in any modern browser (Chrome, Edge, Firefox).

Optional: Local Development Server
bash
Copy code
# Requires Node.js
npx serve .
Then open the URL shown in the terminal (usually http://localhost:3000) for live reload.

💡 Usage Tips
Select a calculator card to open its modal.

Toasts appear for input errors or successful actions.

Dark/Light theme preference is saved automatically.

Chemical inventory and reports are stored locally and exportable.

🔧 Extending ChemTools
Each tool is an independent module under assets/js/modules/.

Shared utilities in utils/ handle parsing, matrices, toast notifications, and data loading.

All labels and texts are defined in index.html and fully optimized for RTL and accessibility (aria-labels).

🐞 Troubleshooting
Problem	Possible Fix
Blank or missing data	Some browsers block local JSON — use a local server (npx serve).
Wrong calculation	Check element case (uppercase for elements). Input validation helps but does not auto-correct.
Modal stuck open	Use X, click outside, or press Esc.

📜 License
ChemTools is provided “as is” for educational and laboratory use.
You may copy, modify, or adapt it for internal purposes.
Please credit the original source when redistributing externally.

<div align="center">
Developed by Noam Ismach
Made with ❤️ for chemistry, clarity, and clean code.

</div>
