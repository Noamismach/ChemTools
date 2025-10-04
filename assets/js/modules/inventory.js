import { showToast } from "../utils/notifications.js";

const STORAGE_KEY = "chemtools-inventory";

function initInventoryManager() {
  const form = document.getElementById("form-inventory");
  const tableWrapper = document.getElementById("inventory-table");

  if (!form || !tableWrapper) return;

  const state = loadInventory();
  renderTable(state, tableWrapper);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const entry = {
      id: crypto.randomUUID(),
      name: form.querySelector("#inventory-name").value.trim(),
      concentration: form.querySelector("#inventory-concentration").value.trim(),
      amount: form.querySelector("#inventory-amount").value.trim(),
      date: form.querySelector("#inventory-date").value
    };

    if (!entry.name) {
      showToast({ title: "שם חסר", message: "יש להזין שם חומר", type: "error" });
      return;
    }

    state.push(entry);
    persistInventory(state);
    renderTable(state, tableWrapper);
    form.reset();
    showToast({ title: "נשמר", message: `${entry.name} נוסף למלאי`, type: "success" });
  });

  tableWrapper.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-delete-inventory]") || target.closest("[data-delete-inventory]")) {
      const button = target.closest("[data-delete-inventory]");
      const id = button?.getAttribute("data-delete-inventory");
      if (!id) return;
      const index = state.findIndex((item) => item.id === id);
      if (index >= 0) {
        const [removed] = state.splice(index, 1);
        persistInventory(state);
        renderTable(state, tableWrapper);
        showToast({ title: "נמחק", message: `${removed.name} הוסר מהמלאי`, type: "info" });
      }
    }
  });
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn("לא ניתן לטעון מלאי", error);
    return [];
  }
}

function persistInventory(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("לא ניתן לשמור מלאי", error);
  }
}

function renderTable(state, wrapper) {
  if (!state.length) {
    wrapper.innerHTML = `<div class="result-block"><p>אין רשומות מלאי עדיין.</p></div>`;
    return;
  }

  const rows = state
    .map(
      ({ id, name, concentration, amount, date }) => `
        <tr>
          <td>${name}</td>
          <td>${concentration || "-"}</td>
          <td>${amount || "-"}</td>
          <td>${date || "-"}</td>
          <td class="table-actions">
            <button type="button" data-delete-inventory="${id}">מחק</button>
          </td>
        </tr>
      `
    )
    .join("");

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>שם החומר</th>
          <th>ריכוז</th>
          <th>כמות</th>
          <th>תאריך הכנה</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export { initInventoryManager };
