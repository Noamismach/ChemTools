const toastContainer = document.getElementById("toast-container");

function showToast({ title, message, type = "info", timeout = 4200 }) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const toastTitle = document.createElement("div");
  toastTitle.className = "toast__title";
  toastTitle.textContent = title;

  const toastMessage = document.createElement("div");
  toastMessage.className = "toast__message";
  toastMessage.textContent = message;

  toast.append(toastTitle, toastMessage);
  toastContainer?.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, timeout);
}

export { showToast };
