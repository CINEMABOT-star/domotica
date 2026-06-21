const apiBase = window.DOMOTICA_CONFIG?.API_BASE_URL?.replace(/\/$/, "");

const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const refreshBtn = document.querySelector("#refreshBtn");
const roomsEl = document.querySelector("#rooms");
const emptyState = document.querySelector("#emptyState");
const apiStatus = document.querySelector("#apiStatus");

let devices = [];
let refreshTimer = null;

function token() {
  return localStorage.getItem("domotica_token") || "";
}

async function api(path, options = {}) {
  if (!apiBase || apiBase.includes("TUO-PROGETTO")) {
    throw new Error("Configura API_BASE_URL in config.js");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Richiesta non riuscita");
  }
  return data;
}

function setView(authenticated) {
  loginView.hidden = authenticated;
  appView.hidden = !authenticated;
  if (authenticated) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = window.setInterval(() => {
    loadDevices().catch(() => setApiOnline(false));
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function setApiOnline(online) {
  apiStatus.textContent = online ? "API online" : "API offline";
  apiStatus.classList.toggle("online", Boolean(online));
}

function groupByRoom(items) {
  return items.reduce((groups, item) => {
    const room = item.room || "Casa";
    groups.set(room, [...(groups.get(room) || []), item]);
    return groups;
  }, new Map());
}

function renderDevices() {
  emptyState.hidden = devices.length > 0;
  roomsEl.innerHTML = "";

  for (const [room, roomDevices] of groupByRoom(devices)) {
    const section = document.createElement("section");
    section.className = "room";
    section.innerHTML = `<h2>${escapeHtml(room)}</h2><div class="device-grid"></div>`;
    const grid = section.querySelector(".device-grid");

    for (const device of roomDevices) {
      const isOn = device.state === "on";
      const updated = device.updatedAt ? new Date(device.updatedAt).toLocaleString("it-IT") : "mai";
      const card = document.createElement("article");
      card.className = `device ${isOn ? "on" : ""}`;
      card.innerHTML = `
        <div class="device-header">
          <div>
            <h3 class="device-title">${escapeHtml(device.name || device.id)}</h3>
            <p class="device-meta">${escapeHtml(device.id)} · ${escapeHtml(device.availability || "online")} · ${escapeHtml(updated)}</p>
          </div>
          <div class="bulb" aria-hidden="true"></div>
        </div>
        <div class="device-actions">
          <button data-command="${isOn ? "off" : "on"}" data-id="${escapeHtml(device.id)}">${isOn ? "Spegni" : "Accendi"}</button>
          <button class="secondary" data-command="toggle" data-id="${escapeHtml(device.id)}">Inverti</button>
        </div>
      `;
      grid.append(card);
    }

    roomsEl.append(section);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDevices() {
  const data = await api("/api/devices");
  devices = data.devices || [];
  setApiOnline(true);
  renderDevices();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    const form = new FormData(loginForm);
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    localStorage.setItem("domotica_token", data.token);
    setView(true);
    await loadDevices();
  } catch (error) {
    loginError.textContent = error.message;
    setApiOnline(false);
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("domotica_token");
  devices = [];
  renderDevices();
  setView(false);
});

refreshBtn.addEventListener("click", () => {
  loadDevices().catch((error) => {
    setApiOnline(false);
    console.error(error);
  });
});

roomsEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-command]");
  if (!button) {
    return;
  }

  button.disabled = true;
  try {
    await api("/api/command", {
      method: "POST",
      body: JSON.stringify({ id: button.dataset.id, state: button.dataset.command })
    });
    await loadDevices();
  } finally {
    button.disabled = false;
  }
});

setView(Boolean(token()));
if (token()) {
  loadDevices().catch(() => {
    localStorage.removeItem("domotica_token");
    setView(false);
    setApiOnline(false);
  });
}
