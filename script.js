const drawBtn = document.getElementById("drawBtn");
const againBtn = document.getElementById("againBtn");
const clearBtn = document.getElementById("clearBtn");
const mainBalls = document.getElementById("mainBalls");
const bonusBall = document.getElementById("bonusBall");
const roundLabel = document.getElementById("roundLabel");
const status = document.getElementById("status");
const historyList = document.getElementById("historyList");
const ballTemplate = document.getElementById("ballTemplate");

const STORAGE_KEY = "lotto-history-v1";
const TOTAL_NUMBERS = 45;
const MAIN_COUNT = 6;

let history = loadHistory();
let currentRound = history.length + 1;
let drawLock = false;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function createEmptyBalls() {
  mainBalls.innerHTML = "";
  for (let i = 0; i < MAIN_COUNT; i += 1) {
    const ball = ballTemplate.content.firstElementChild.cloneNode(true);
    ball.classList.add("is-pending");
    ball.textContent = "—";
    mainBalls.appendChild(ball);
  }
  bonusBall.textContent = "?";
}

function sampleUniqueNumbers(count, exclude = new Set()) {
  const pool = [];
  for (let i = 1; i <= TOTAL_NUMBERS; i += 1) {
    if (!exclude.has(i)) pool.push(i);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).sort((a, b) => a - b);
}

function setStatus(text) {
  status.textContent = text;
}

function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-item";
    empty.textContent = "아직 기록이 없습니다. 첫 추첨을 시작해 보세요.";
    historyList.appendChild(empty);
    return;
  }

  history
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = `${entry.round}회차`;

      const balls = document.createElement("div");
      balls.className = "history-balls";

      entry.main.forEach((number) => {
        const chip = document.createElement("span");
        chip.className = "history-chip";
        chip.textContent = number;
        balls.appendChild(chip);
      });

      const bonus = document.createElement("span");
      bonus.className = "history-chip bonus";
      bonus.textContent = `+ ${entry.bonus}`;
      balls.appendChild(bonus);

      item.append(meta, balls);
      historyList.appendChild(item);
    });
}

function updateStage(mainNumbers, bonusNumber) {
  const balls = [...mainBalls.children];
  balls.forEach((ball, index) => {
    ball.classList.remove("is-pending", "is-highlight");
    ball.textContent = mainNumbers[index];
    ball.classList.add("is-highlight");
  });
  bonusBall.textContent = bonusNumber;
  roundLabel.textContent = `${currentRound}회차 결과`;
}

function animateDraw() {
  if (drawLock) return;
  drawLock = true;
  drawBtn.disabled = true;
  againBtn.disabled = true;
  setStatus("번호를 섞는 중입니다.");
  createEmptyBalls();

  const mainNumbers = sampleUniqueNumbers(MAIN_COUNT);
  const remaining = new Set(mainNumbers);
  const bonusNumber = sampleUniqueNumbers(1, remaining)[0];

  const shuffled = sampleUniqueNumbers(TOTAL_NUMBERS);
  let tick = 0;

  const interval = setInterval(() => {
    const ball = mainBalls.children[tick % MAIN_COUNT];
    ball.classList.remove("is-pending");
    ball.textContent = shuffled[tick % shuffled.length];
    tick += 1;

    if (tick >= MAIN_COUNT * 2) {
      clearInterval(interval);

      mainNumbers.forEach((number, index) => {
        setTimeout(() => {
          const ballEl = mainBalls.children[index];
          ballEl.classList.remove("is-pending");
          ballEl.textContent = number;
        }, index * 120);
      });

      setTimeout(() => {
        bonusBall.textContent = bonusNumber;
        setStatus(
          `완료! ${mainNumbers.join(", ")} | 보너스 ${bonusNumber}`
        );
        roundLabel.textContent = `${currentRound}회차 결과`;

        history.push({
          round: currentRound,
          main: mainNumbers,
          bonus: bonusNumber,
          at: new Date().toISOString(),
        });
        if (history.length > 10) {
          history = history.slice(history.length - 10);
        }
        saveHistory();
        renderHistory();

        currentRound += 1;
        drawLock = false;
        drawBtn.disabled = false;
        againBtn.disabled = false;
      }, 900);
    }
  }, 120);
}

function resetStage() {
  if (drawLock) return;
  createEmptyBalls();
  roundLabel.textContent = "아직 추첨 전";
  setStatus("버튼을 눌러 추첨을 시작하세요.");
}

drawBtn.addEventListener("click", animateDraw);
againBtn.addEventListener("click", animateDraw);

clearBtn.addEventListener("click", () => {
  history = [];
  currentRound = 1;
  saveHistory();
  renderHistory();
  resetStage();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !drawLock) {
    event.preventDefault();
    animateDraw();
  }
});

createEmptyBalls();
renderHistory();
resetStage();
