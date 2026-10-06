const locations = [
  { id: 101, label: "4651 м. Львів, вул. Залізнична, 16", num: 1 },
  { id: 100, label: "4656 м. Львів, вул. Донецька, 3", num: 5 },
  { id: 102, label: "4656 м. Львів, вул. Зелена, 20", num: 1 },
  { id: 91, label: "4628 м. Жовква, вул. Святої Трійці, 3 Г/34", num: 5 }
];

const startButton = document.querySelector("#start-button");
const notificationButton = document.querySelector("#notification-button");
const statusElement = document.querySelector("#status");
const lastCheckElement = document.querySelector("#last-check");
const locationsElement = document.querySelector("#locations");

let timerId = null;
let audioContext = null;

function apiUrl(location) {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 46);
  const query = new URLSearchParams({
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  });
  return `/api/v1/days/${location.id}/${location.num}?${query}`;
}

function dateRangeText() {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 46);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderLocations(results = []) {
  locationsElement.innerHTML = results.map(({ location, available, error }) => `
    <article class="location ${available ? "available" : ""}">
      <div class="location-head">
        <div>
          <div class="label">${location.label}</div>
          <div class="meta">id: ${location.id} · num: ${location.num}</div>
        </div>
        <span class="badge">${error ? "Помилка" : available ? "Є місця" : "Порожньо"}</span>
      </div>
      ${error ? `<div class="meta error">${error}</div>` : ""}
    </article>
  `).join("");
}

function notify(location, count) {
  const message = `${location.label}: доступно записів ${count}.`;

  if (Notification.permission === "granted") {
    new Notification("DMSU: знайдено доступні місця", {
      body: message,
      tag: `dmsu-${location.id}-${location.num}`
    });
  }

  // A short sound is useful when the browser notification is easy to miss.
  if (audioContext) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const soundDuration = 5;
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + soundDuration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + soundDuration);
  }
}

async function checkLocation(location) {
  try {
    const response = await fetch(apiUrl(location), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];
    return { location, available: data.length > 0, count: data.length };
  } catch (error) {
    return { location, available: false, error: error.message };
  }
}

async function checkAll() {
  startButton.disabled = true;
  statusElement.className = "status";
  statusElement.firstElementChild.textContent = "Перевірка...";

  const results = await Promise.all(locations.map(checkLocation));
  const available = results.filter(result => result.available);
  const errors = results.filter(result => result.error);

  renderLocations(results);
  lastCheckElement.textContent = `Дати: ${dateRangeText()} · Остання перевірка: ${new Date().toLocaleTimeString("uk-UA")}`;
  statusElement.className = `status ${available.length ? "alert" : errors.length ? "" : "ok"}`;
  statusElement.firstElementChild.textContent = available.length
    ? `Знайдено доступні місця: ${available.length}`
    : errors.length
      ? `Помилки: ${errors.length}`
      : "Доступних місць не знайдено";

  available.forEach(result => notify(result.location, result.count));
  startButton.disabled = false;
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    notificationButton.textContent = "Сповіщення недоступні";
    return;
  }
  const permission = await Notification.requestPermission();
  notificationButton.textContent = permission === "granted"
    ? "Сповіщення дозволено"
    : "Сповіщення заблоковано";
}

startButton.addEventListener("click", async () => {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") await audioContext.resume();
  if (timerId) clearInterval(timerId);
  await checkAll();
  timerId = setInterval(checkAll, 60_000);
  startButton.textContent = "Моніторинг запущено";
});

notificationButton.addEventListener("click", requestNotifications);
renderLocations(locations.map(location => ({ location, available: false })));
