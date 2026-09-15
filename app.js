// Sound Synth Synthesizer for Offline Audio Feedback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'add') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'exotic') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(750, now + 0.08);
    osc.frequency.setValueAtTime(1000, now + 0.16);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'bank') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'drown') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.4);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

// Player Colors Palette
const PLAYER_COLORS = ['#16a34a', '#2563eb', '#d97706', '#9333ea', '#dc2626'];

// Game State
let gameState = {
  players: [],
  history: []
};

let activeAttackerIndex = null;

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const playerCountGroup = document.getElementById('playerCountGroup');
const playerInputsContainer = document.getElementById('playerInputsContainer');
const startGameBtn = document.getElementById('startGameBtn');
const playersGrid = document.getElementById('playersGrid');
const actionLog = document.getElementById('actionLog');
const undoBtn = document.getElementById('undoBtn');
const resetGameBtn = document.getElementById('resetGameBtn');
const rulesBtn = document.getElementById('rulesBtn');
const rulesModal = document.getElementById('rulesModal');
const closeRulesBtn = document.getElementById('closeRulesBtn');
const attackModal = document.getElementById('attackModal');
const closeAttackBtn = document.getElementById('closeAttackBtn');
const attackTargets = document.getElementById('attackTargets');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  renderSetupInputs(3);
  loadSavedState();
  registerServiceWorker();
});

// Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Reg error:', err));
  }
}

// Setup Player Inputs
playerCountGroup.addEventListener('click', (e) => {
  if (e.target.classList.contains('count-btn')) {
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderSetupInputs(parseInt(e.target.dataset.count));
  }
});

function renderSetupInputs(count) {
  playerInputsContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'input-row';
    row.innerHTML = `
      <label style="color: ${PLAYER_COLORS[i]}">Player ${i + 1}:</label>
      <input type="text" class="player-name-input" value="Player ${i + 1}" maxlength="12" />
    `;
    playerInputsContainer.appendChild(row);
  }
}

startGameBtn.addEventListener('click', () => {
  const inputs = document.querySelectorAll('.player-name-input');
  gameState.players = Array.from(inputs).map((input, idx) => ({
    name: input.value.trim() || `Player ${idx + 1}`,
    unbanked: 0,
    banked: 0,
    color: PLAYER_COLORS[idx]
  }));
  gameState.history = [];
  saveState();
  showGameScreen();
});

function saveState() {
  localStorage.setItem('cow_game_state', JSON.stringify(gameState));
}

function loadSavedState() {
  const saved = localStorage.getItem('cow_game_state');
  if (saved) {
    try {
      gameState = JSON.parse(saved);
      if (gameState.players && gameState.players.length > 0) {
        showGameScreen();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function showGameScreen() {
  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  renderGameGrid();
  renderLog();
}

function renderGameGrid() {
  playersGrid.innerHTML = '';
  gameState.players.forEach((player, idx) => {
    const card = document.createElement('div');
    card.className = 'card player-card';
    card.style.borderTopColor = player.color;

    card.innerHTML = `
      <div class="player-header">
        <span class="player-name" style="color:${player.color}">${escapeHtml(player.name)}</span>
        <span class="total-score-badge">Banked: ${player.banked}</span>
      </div>
      <div class="score-display-box">
        <div class="herd-value">${player.unbanked}</div>
        <div class="herd-label">Unbanked Herd</div>
      </div>
      <div class="action-buttons-grid">
        <button class="act-btn add" onclick="addCows(${idx}, 1)">+1 Cow</button>
        <button class="act-btn add" onclick="addCows(${idx}, 20)">+20 Herd</button>
        <button class="act-btn exotic" onclick="addExotic(${idx})">🪅 +15 Exotic</button>
      </div>
      <div class="action-buttons-grid secondary">
        <button class="act-btn drown" onclick="openAttackModal(${idx})">🌊/🪦 Drown</button>
        <button class="act-btn bank" onclick="bankCows(${idx}, 20)">🏡 Yard (20)</button>
        <button class="act-btn bank" onclick="bankCows(${idx}, 'ALL')">🚛 Truck (All)</button>
      </div>
    `;
    playersGrid.appendChild(card);
  });
}

function recordHistory(description) {
  gameState.history.push({
    state: JSON.parse(JSON.stringify(gameState.players)),
    desc: description
  });
  saveState();
  renderLog();
}

function addCows(playerIdx, count) {
  recordHistory(`${gameState.players[playerIdx].name} spotted +${count} cows`);
  gameState.players[playerIdx].unbanked += count;
  playSound('add');
  saveState();
  renderGameGrid();
}

function addExotic(playerIdx) {
  recordHistory(`🪅 ${gameState.players[playerIdx].name} spotted an Exotic Animal! (+15)`);
  gameState.players[playerIdx].unbanked += 15;
  playSound('exotic');
  saveState();
  renderGameGrid();
}

function bankCows(playerIdx, amount) {
  const p = gameState.players[playerIdx];
  if (p.unbanked <= 0) return;

  let actualBanked = 0;
  if (amount === 'ALL') {
    actualBanked = p.unbanked;
    p.banked += p.unbanked;
    p.unbanked = 0;
    recordHistory(`🚛 ${p.name} banked full herd (+${actualBanked}) via Truck`);
  } else {
    actualBanked = Math.min(p.unbanked, amount);
    p.unbanked -= actualBanked;
    p.banked += actualBanked;
    recordHistory(`🏡 ${p.name} banked +${actualBanked} cows via Cattle Yard`);
  }

  playSound('bank');
  saveState();
  renderGameGrid();
}

function openAttackModal(attackerIdx) {
  activeAttackerIndex = attackerIdx;
  attackTargets.innerHTML = '';
  
  const targets = gameState.players.filter((_, idx) => idx !== attackerIdx);
  targets.forEach(target => {
    const origIdx = gameState.players.findIndex(p => p.name === target.name);
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.innerText = `Drown ${target.name}'s Herd (${target.unbanked} Unbanked)`;
    btn.onclick = () => executeAttack(origIdx);
    attackTargets.appendChild(btn);
  });

  attackModal.classList.remove('hidden');
}

function executeAttack(targetIdx) {
  const attacker = gameState.players[activeAttackerIndex];
  const target = gameState.players[targetIdx];
  
  recordHistory(`🌊 ${attacker.name} drowned ${target.name}'s unbanked herd (${target.unbanked} cows lost)`);
  target.unbanked = 0;
  
  playSound('drown');
  attackModal.classList.add('hidden');
  saveState();
  renderGameGrid();
}

undoBtn.addEventListener('click', () => {
  if (gameState.history.length === 0) return;
  const lastState = gameState.history.pop();
  gameState.players = lastState.state;
  saveState();
  renderGameGrid();
  renderLog();
});

function renderLog() {
  actionLog.innerHTML = '';
  if (gameState.history.length === 0) {
    actionLog.innerHTML = '<li class="empty-log">Game started! Keep an eye out on the road.</li>';
    undoBtn.disabled = true;
    return;
  }
  
  undoBtn.disabled = false;
  const recent = [...gameState.history].reverse().slice(0, 10);
  recent.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.desc;
    actionLog.appendChild(li);
  });
}

// Reset Game
resetGameBtn.addEventListener('click', () => {
  if (confirm('Start a new trip game? All current scores will be reset.')) {
    localStorage.removeItem('cow_game_state');
    location.reload();
  }
});

// Rules Modal
rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
closeAttackBtn.addEventListener('click', () => attackModal.classList.add('hidden'));

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}
