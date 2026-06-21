const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const refreshBtn = document.querySelector("#refreshBtn");
const roomsEl = document.querySelector("#rooms");
const emptyState = document.querySelector("#emptyState");
const mqttStatus = document.querySelector("#mqttStatus");

let events = null;
let devices = [];

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Richiesta non riuscita");
  }

  return response.json();
}

function setView(authenticated) {
  loginView.hidden = authenticated;
  appView.hidden = !authenticated;
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
      const isOnline = device.availability === "online";
      const card = document.createElement("article");
      card.className = `device ${isOn ? "on" : ""}`;
      card.innerHTML = `
        <div class="device-header">
          <div>
            <h3 class="device-title">${escapeHtml(device.name || device.id)}</h3>
            <p class="device-meta">${escapeHtml(device.id)} · ${isOnline ? "online" : "offline"}${typeof device.rssi === "number" ? ` · ${device.rssi} dBm` : ""}</p>
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
  mqttStatus.textContent = data.mqttConnected ? "Server online" : "Server offline";
  mqttStatus.classList.toggle("online", Boolean(data.mqttConnected));
  renderDevices();
}

function connectEvents() {
  if (events) {
    events.close();
  }

  events = new EventSource("/api/events");
  events.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === "devices") {
      devices = event.devices || [];
      renderDevices();
    }
    if (event.type === "mqtt") {
      mqttStatus.textContent = event.connected ? "Server online" : "Server offline";
      mqttStatus.classList.toggle("online", Boolean(event.connected));
    }
  };
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    const form = new FormData(loginForm);
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    setView(true);
    await loadDevices();
    connectEvents();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" }).catch(() => {});
  if (events) {
    events.close();
    events = null;
  }
  setView(false);
});

refreshBtn.addEventListener("click", () => {
  loadDevices().catch((error) => {
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
    await api(`/api/devices/${encodeURIComponent(button.dataset.id)}/command`, {
      method: "POST",
      body: JSON.stringify({ state: button.dataset.command })
    });
  } finally {
    button.disabled = false;
  }
});

const session = await api("/api/session").catch(() => ({ authenticated: false }));
setView(Boolean(session.authenticated));
if (session.authenticated) {
  await loadDevices();
  connectEvents();
}
