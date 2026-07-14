const drawBtn = document.getElementById("drawBtn");
const reloadBtn = document.getElementById("reloadBtn");
const clearBtn = document.getElementById("clearBtn");
const mainBalls = document.getElementById("mainBalls");
const bonusBall = document.getElementById("bonusBall");
const roundLabel = document.getElementById("roundLabel");
const status = document.getElementById("status");
const historyList = document.getElementById("historyList");
const ballTemplate = document.getElementById("ballTemplate");

const LOCAL_HISTORY_KEY = "lotto-local-history-v1";
let drawLock = false;
let history = [];

function setStatus(text) {
  status.textContent = text;
}

function setButtonsDisabled(disabled) {
  drawBtn.disabled = disabled;
  reloadBtn.disabled = disabled;
  clearBtn.disabled = disabled;
}

function createEmptyBalls() {
  mainBalls.innerHTML = "";
  for (let i = 0; i < 6; i += 1) {
    const ball = ballTemplate.content.firstElementChild.cloneNode(true);
    ball.classList.add("is-pending");
    ball.textContent = "-";
    mainBalls.appendChild(ball);
  }
  bonusBall.textContent = "?";
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(items) {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures and keep the app usable.
  }
}

function nextLocalRound(items) {
  if (!items.length) {
    return 1;
  }
  return Math.max(...items.map((item) => Number(item.round_number) || 0)) + 1;
}

function sampleLocalDraw(items) {
  const pool = Array.from({ length: 45 }, (_, index) => index + 1);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const main_numbers = pool.slice(0, 6).sort((a, b) => a - b);
  const remaining = pool.slice(6);
  const bonus_number = remaining[Math.floor(Math.random() * remaining.length)];

  return {
    round_number: nextLocalRound(items),
    main_numbers,
    bonus_number,
    created_at: new Date().toISOString(),
  };
}

function renderBalls(numbers, bonusNumber) {
  const balls = [...mainBalls.children];
  balls.forEach((ball, index) => {
    ball.classList.remove("is-pending");
    ball.classList.add("is-highlight");
    ball.textContent = numbers[index];
  });
  bonusBall.textContent = bonusNumber;
}

function formatDrawLabel(draw) {
  if (!draw?.round_number) {
    return "Draw result";
  }
  return `${draw.round_number} round result`;
}

function renderHistory(items) {
  historyList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "history-item";
    empty.textContent = "No saved draws yet. Start the first draw.";
    historyList.appendChild(empty);
    return;
  }

  items.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${entry.round_number} round`;

    const balls = document.createElement("div");
    balls.className = "history-balls";

    const mainNumbers = Array.isArray(entry.main_numbers) ? entry.main_numbers : [];

    mainNumbers.forEach((number) => {
      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = number;
      balls.appendChild(chip);
    });

    const bonus = document.createElement("span");
    bonus.className = "history-chip bonus";
    bonus.textContent = `+ ${entry.bonus_number}`;
    balls.appendChild(bonus);

    item.append(meta, balls);
    historyList.appendChild(item);
  });
}

async function fetchHistory() {
  setButtonsDisabled(true);
  setStatus("Loading draw history...");

  try {
    if (window.location.protocol === "file:") {
      history = loadLocalHistory();
    } else {
      const response = await fetch("/api/draw", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load draw history.");
      }

      history = payload.draws || [];
    }
    renderHistory(history);

    if (history.length > 0) {
      const latest = history[0];
      roundLabel.textContent = formatDrawLabel(latest);
      renderBalls(latest.main_numbers, latest.bonus_number);
      setStatus(`Latest result: ${latest.main_numbers.join(", ")} | Bonus ${latest.bonus_number}`);
    } else {
      createEmptyBalls();
      roundLabel.textContent = "Not drawn yet";
      setStatus("Press the button to start drawing.");
    }
  } catch (error) {
    history = loadLocalHistory();
    renderHistory(history);

    if (history.length > 0) {
      const latest = history[0];
      roundLabel.textContent = formatDrawLabel(latest);
      renderBalls(latest.main_numbers, latest.bonus_number);
      setStatus(`Local mode: ${latest.main_numbers.join(", ")} | Bonus ${latest.bonus_number}`);
    } else {
      createEmptyBalls();
      roundLabel.textContent = "Not drawn yet";
      setStatus(`Local mode: ${error.message}`);
    }
  } finally {
    setButtonsDisabled(false);
  }
}

async function drawLottery() {
  if (drawLock) {
    return;
  }

  drawLock = true;
  setButtonsDisabled(true);
  setStatus("Shuffling numbers...");
  createEmptyBalls();

  const shimmer = setInterval(() => {
    const numbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 45) + 1);
    [...mainBalls.children].forEach((ball, index) => {
      ball.classList.remove("is-pending");
      ball.textContent = numbers[index];
    });
  }, 110);

  try {
    let draw;

    if (window.location.protocol === "file:") {
      draw = sampleLocalDraw(history);
      history = [draw, ...history].slice(0, 10);
      saveLocalHistory(history);
    } else {
      try {
        const response = await fetch("/api/draw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Draw failed.");
        }

        draw = payload.draw;
        history = [draw, ...history].slice(0, 10);
      } catch {
        draw = sampleLocalDraw(history);
        history = [draw, ...history].slice(0, 10);
        saveLocalHistory(history);
      }
    }

    clearInterval(shimmer);
    renderBalls(draw.main_numbers, draw.bonus_number);
    roundLabel.textContent = formatDrawLabel(draw);
    setStatus(`Done: ${draw.main_numbers.join(", ")} | Bonus ${draw.bonus_number}`);

    renderHistory(history);
  } catch (error) {
    clearInterval(shimmer);
    setStatus(error.message);
  } finally {
    drawLock = false;
    setButtonsDisabled(false);
  }
}

drawBtn.addEventListener("click", drawLottery);
reloadBtn.addEventListener("click", fetchHistory);
clearBtn.addEventListener("click", () => {
  if (window.location.protocol === "file:") {
    history = [];
    saveLocalHistory(history);
    renderHistory(history);
    createEmptyBalls();
    roundLabel.textContent = "Not drawn yet";
    setStatus("Press the button to start drawing.");
    return;
  }

  fetchHistory();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !drawLock) {
    event.preventDefault();
    drawLottery();
  }
});

createEmptyBalls();
fetchHistory();
