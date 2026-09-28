/**
 * じぶんで できるよ！たいまーあぷり
 * 特別支援学校 児童向け 登校後支援 & ルーティン支援
 */

// ===== ランドセルの専用SVGアイコン（日本のランドセルの形） =====
const RANDOSERU_SVG = `
<svg class="randoseru-svg-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- 持ち手（ハンドル） -->
  <path d="M 38 18 C 38 10, 62 10, 62 18" fill="none" stroke="#8b0000" stroke-width="5" stroke-linecap="round"/>
  <!-- 本体（メインボディ） -->
  <rect x="22" y="22" width="56" height="66" rx="10" fill="#e74c3c" stroke="#922b21" stroke-width="4" />
  <!-- かぶせ（前面のフラップ） -->
  <path d="M 22 22 L 78 22 C 78 22, 78 74, 50 74 C 22 74, 22 22, 22 22 Z" fill="#c0392b" stroke="#78281f" stroke-width="3" />
  <!-- サイドベルト・ステッチ -->
  <path d="M 24 35 L 24 75" stroke="#f39c12" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 76 35 L 76 75" stroke="#f39c12" stroke-width="2.5" stroke-linecap="round"/>
  <!-- 下部の留め具（錠前・金具） -->
  <rect x="44" y="66" width="12" height="12" rx="2" fill="#f1c40f" stroke="#b7950b" stroke-width="2" />
  <circle cx="50" cy="72" r="2.5" fill="#7f8c8d" />
  <!-- 反射テープライン -->
  <path d="M 32 58 Q 50 62 68 58" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
</svg>
`;

// ===== デフォルトの活動リスト =====
const DEFAULT_MORNING_ACTIVITIES = [
  { id: 'randoseru', line1: 'らんどせる', line2: 'かたづけ', iconType: 'svg-randoseru' },
  { id: 'toilet',    line1: 'といれ',       line2: '',         iconType: 'emoji', icon: '🚻' },
  { id: 'kigae',     line1: 'きがえ',       line2: '',         iconType: 'emoji', icon: '👕' },
  { id: 'kakari',    line1: 'かかりの',     line2: 'しごと',   iconType: 'emoji', icon: '📋' },
  { id: 'benkyo',    line1: 'べんきょう',   line2: '',         iconType: 'emoji', icon: '✏️' }
];

const DEFAULT_CUSTOM_ACTIVITIES = [
  { id: 'clean',    line1: 'おそうじ',     line2: '',         iconType: 'emoji', icon: '🧹' },
  { id: 'wash',     line1: 'てあらい',     line2: 'しょうどく', iconType: 'emoji', icon: '🧴' },
  { id: 'lunch',    line1: 'きゅうしょく', line2: 'じゅんび', iconType: 'emoji', icon: '🍱' },
  { id: 'drink',    line1: 'すいぶん',     line2: 'ほきゅう', iconType: 'emoji', icon: '💧' }
];

// ===== アプリの状態 (State) =====
let state = {
  deviceMode: 'tablet',         // 'tablet' | 'mobile'
  currentCategory: 'morning',   // 'morning' | 'custom'
  categoriesData: {
    morning: JSON.parse(JSON.stringify(DEFAULT_MORNING_ACTIVITIES)),
    custom:  JSON.parse(JSON.stringify(DEFAULT_CUSTOM_ACTIVITIES))
  },
  currentActivityId: null,
  completedMap: {},             // { [category_id]: { [actId]: true } }
  timerSecondsLeft: 0,
  timerTotalSeconds: 0,
  timerInterval: null,
  isPaused: false,
  streak: 0,
  lastCompletedDate: null
};

// ローカルストレージキー
const STORAGE_KEY = 'routine_timer_support_v2';

// 選択可能なアイコン（管理モーダル用）
let selectedNewItemIcon = '🎒';

// ===== Web Audio API（優しい効果音・アラームの自動生成） =====
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playAlarmSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.18 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.18);
      osc.stop(ctx.currentTime + idx * 0.18 + 0.45);
    });
  } catch (e) {}
}

function playHanamaruSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.4, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.15);

    const chimes = [783.99, 987.77, 1174.66, 1567.98];
    chimes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime + 0.15 + i * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.15 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15 + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.15 + i * 0.08);
      osc.stop(ctx.currentTime + 0.15 + i * 0.08 + 0.35);
    });
  } catch (e) {}
}

function playCheerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const chords = [440, 554.37, 659.25];
    chords.forEach(f => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    });
  } catch (e) {}
}

function playFanfareSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const melody = [
      { f: 523.25, t: 0.0,  d: 0.15 },
      { f: 523.25, t: 0.15, d: 0.15 },
      { f: 523.25, t: 0.30, d: 0.15 },
      { f: 659.25, t: 0.48, d: 0.4 },
      { f: 783.99, t: 0.90, d: 0.3 },
      { f: 1046.5, t: 1.25, d: 0.7 }
    ];
    melody.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, ctx.currentTime + item.t);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + item.t);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + item.t + item.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + item.t);
      osc.stop(ctx.currentTime + item.t + item.d + 0.05);
    });
  } catch (e) {}
}

// ===== データ永続化 (LocalStorage) =====
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadSavedData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.deviceMode) state.deviceMode = data.deviceMode;
      if (data.categoriesData) state.categoriesData = data.categoriesData;

      const today = getTodayString();
      if (data.activeDate === today && data.completedMap) {
        state.completedMap = data.completedMap;
      } else {
        state.completedMap = {};
      }

      state.streak = data.streak || 0;
      state.lastCompletedDate = data.lastCompletedDate || null;
    } catch (e) {
      console.error(e);
    }
  }
  applyDeviceMode(state.deviceMode);
  updateStreakUI();
}

function saveData() {
  const data = {
    deviceMode: state.deviceMode,
    categoriesData: state.categoriesData,
    activeDate: getTodayString(),
    completedMap: state.completedMap,
    streak: state.streak,
    lastCompletedDate: state.lastCompletedDate
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateStreakUI();
}

function updateStreakUI() {
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = state.streak;
}

function registerDayCompletion() {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (state.lastCompletedDate === today) {
    // 今日完了済み
  } else if (state.lastCompletedDate === yesterday) {
    state.streak += 1;
    state.lastCompletedDate = today;
  } else {
    state.streak = 1;
    state.lastCompletedDate = today;
  }
  saveData();
}

// ===== 端末モード切り替え（トグルスイッチ同期） =====
function applyDeviceMode(mode) {
  state.deviceMode = mode;
  document.body.classList.remove('mode-tablet', 'mode-mobile');
  document.body.classList.add(mode === 'mobile' ? 'mode-mobile' : 'mode-tablet');

  const btnTablet = document.getElementById('btnToggleTablet');
  const btnMobile = document.getElementById('btnToggleMobile');
  if (btnTablet && btnMobile) {
    if (mode === 'mobile') {
      btnTablet.classList.remove('active');
      btnMobile.classList.add('active');
    } else {
      btnTablet.classList.add('active');
      btnMobile.classList.remove('active');
    }
  }
}

// ===== 画面切り替え =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }
}

function getCurrentActivitiesList() {
  return state.categoriesData[state.currentCategory] || [];
}

function getCurrentActivity() {
  const list = getCurrentActivitiesList();
  return list.find(a => a.id === state.currentActivityId);
}

function renderIconHtml(item) {
  if (item.iconType === 'svg-randoseru' || item.id === 'randoseru') {
    return `<div class="act-icon-wrapper">${RANDOSERU_SVG}</div>`;
  }
  return `<div class="act-icon-wrapper">${item.icon || '⭐'}</div>`;
}

function renderBannerHtml(item) {
  if (!item) return '';
  const nameText = item.line2 ? `${item.line1} ${item.line2}` : item.line1;
  return `${renderIconHtml(item)}<span class="act-name">${nameText}</span>`;
}

// ===== 活動一覧の描画（2段表記対応） =====
function renderActivitiesMenu() {
  const container = document.getElementById('activitiesGrid');
  container.innerHTML = '';

  const list = getCurrentActivitiesList();
  const currentCompleted = state.completedMap[state.currentCategory] || {};
  let allDone = list.length > 0;

  const headerTitle = document.getElementById('appHeaderTitle');
  if (headerTitle) {
    headerTitle.textContent = state.currentCategory === 'morning' ? 'あさの じゅんび' : 'ほかで つかう';
  }

  list.forEach(act => {
    const isCompleted = !!currentCompleted[act.id];
    if (!isCompleted) allDone = false;

    const btn = document.createElement('button');
    btn.className = `activity-card ${isCompleted ? 'completed' : ''}`;

    let nameHtml = '';
    if (act.line2) {
      nameHtml = `
        <div class="act-name-container">
          <span class="text-line1">${act.line1}</span>
          <span class="text-line2">${act.line2}</span>
        </div>
      `;
    } else {
      nameHtml = `
        <div class="act-name-container single-line">
          <span class="text-line1">${act.line1}</span>
        </div>
      `;
    }

    btn.innerHTML = `${renderIconHtml(act)}${nameHtml}`;

    if (!isCompleted) {
      btn.addEventListener('click', () => {
        playTapSound();
        selectActivity(act.id);
      });
    }

    container.appendChild(btn);
  });

  return allDone;
}

function selectActivity(actId) {
  state.currentActivityId = actId;
  const act = getCurrentActivity();
  document.getElementById('timeActivityBanner').innerHTML = renderBannerHtml(act);
  showScreen('screen-time');
}

// ===== 時間選択（1〜10分） =====
function initTimeGrid() {
  const timeGrid = document.getElementById('timeGrid');
  timeGrid.innerHTML = '';

  for (let m = 1; m <= 10; m++) {
    const btn = document.createElement('button');
    btn.className = 'btn-time-card';
    btn.innerHTML = `
      <span class="time-num">${m}</span>
      <span class="time-unit">${m === 1 || m === 3 || m === 6 || m === 8 || m === 10 ? 'ぷん' : 'ふん'}</span>
    `;
    btn.addEventListener('click', () => {
      playTapSound();
      startTimer(m);
    });
    timeGrid.appendChild(btn);
  }
}

// ===== タイマー処理 =====
function startTimer(minutes) {
  state.timerTotalSeconds = minutes * 60;
  state.timerSecondsLeft = state.timerTotalSeconds;
  state.isPaused = false;

  const act = getCurrentActivity();
  document.getElementById('timerActivityBanner').innerHTML = renderBannerHtml(act);

  updateTimerDisplay();
  showScreen('screen-timer');

  const pauseBtn = document.getElementById('btnPauseResume');
  pauseBtn.textContent = '⏸️ とめる';
  pauseBtn.className = 'btn-action btn-pause';

  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(timerTick, 1000);
}

function timerTick() {
  if (state.isPaused) return;

  state.timerSecondsLeft--;
  updateTimerDisplay();

  if (state.timerSecondsLeft <= 0) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    timerFinished();
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timerSecondsLeft / 60);
  const secs = state.timerSecondsLeft % 60;
  document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const ratio = state.timerTotalSeconds > 0 ? (state.timerSecondsLeft / state.timerTotalSeconds) : 0;
  const angle = ratio * 360;

  const sliceEl = document.getElementById('timerPieSlice');
  const fullCircleEl = document.getElementById('timerFullCircle');
  const hintEl = document.getElementById('timerHint');

  // 色とメッセージの制御
  let fillColor = '#ff4757'; // 鮮やかな赤
  if (state.timerSecondsLeft <= 30 && state.timerSecondsLeft > 0) {
    fillColor = '#e67e22'; // 30秒以内はオレンジ
    hintEl.textContent = 'あと もうすこし！';
    hintEl.style.color = '#e67e22';
  } else if (state.timerSecondsLeft === 0) {
    fillColor = '#bdc3c7';
    hintEl.textContent = 'じかん だよ！';
    hintEl.style.color = '#e74c3c';
  } else {
    hintEl.textContent = 'がんばってね！';
    hintEl.style.color = '#27ae60';
  }

  sliceEl.setAttribute('fill', fillColor);
  fullCircleEl.setAttribute('fill', fillColor);

  // 扇形（タイムタイマーの面）のSVGパス計算
  if (angle >= 359.5) {
    // ほぼ満タンの場合は完全な円を表示
    fullCircleEl.style.display = 'block';
    sliceEl.setAttribute('d', '');
  } else if (angle <= 0.5) {
    // 時間切れ
    fullCircleEl.style.display = 'none';
    sliceEl.setAttribute('d', '');
  } else {
    // 12時の位置(100, 10)から時計回りに扇形を描く
    fullCircleEl.style.display = 'none';
    const rad = (angle * Math.PI) / 180;
    const endX = 100 + 90 * Math.sin(rad);
    const endY = 100 - 90 * Math.cos(rad);
    const largeArc = angle > 180 ? 1 : 0;

    const pathData = `M 100 100 L 100 10 A 90 90 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)} Z`;
    sliceEl.setAttribute('d', pathData);
  }
}

function timerFinished() {
  playAlarmSound();
  const act = getCurrentActivity();
  document.getElementById('confirmActivityBanner').innerHTML = renderBannerHtml(act);
  showScreen('screen-confirm');
}

function finishTimerEarly() {
  playTapSound();
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  markCurrentActivityCompleted(true);
}

function togglePauseTimer() {
  playTapSound();
  state.isPaused = !state.isPaused;
  const pauseBtn = document.getElementById('btnPauseResume');
  const hintEl = document.getElementById('timerHint');

  if (state.isPaused) {
    pauseBtn.textContent = '▶️ はじめる';
    pauseBtn.style.backgroundColor = '#2ecc71';
    hintEl.textContent = 'やすみちゅう';
    hintEl.style.color = '#7f8c8d';
  } else {
    pauseBtn.textContent = '⏸️ とめる';
    pauseBtn.style.backgroundColor = '#f1c40f';
    hintEl.textContent = 'がんばってね！';
    hintEl.style.color = '#27ae60';
  }
}

// ===== 終了確認 & スタンプ =====
function markCurrentActivityCompleted(isSuccess) {
  if (!state.completedMap[state.currentCategory]) {
    state.completedMap[state.currentCategory] = {};
  }

  const stampContent = document.getElementById('stampContent');
  const stampMessage = document.getElementById('stampMessage');
  const stampNextBtn = document.getElementById('btnStampNext');

  if (isSuccess) {
    state.completedMap[state.currentCategory][state.currentActivityId] = true;
    saveData();

    playHanamaruSound();
    stampContent.innerHTML = '💮';
    stampMessage.textContent = 'たいへん よく できました！';
    stampMessage.style.color = '#c0392b';

    stampNextBtn.textContent = 'つぎへ すすむ';
    stampNextBtn.onclick = () => {
      playTapSound();
      checkAllActivitiesDone();
    };
  } else {
    playCheerSound();
    stampContent.innerHTML = '💪';
    stampMessage.textContent = 'だいじょうぶ！もうちょっと だよ！';
    stampMessage.style.color = '#d35400';

    stampNextBtn.textContent = 'じかんを ふやす？';
    stampNextBtn.onclick = () => {
      playTapSound();
      showScreen('screen-extend');
    };
  }

  showScreen('screen-stamp');
}

// ===== 追加時間 =====
function initExtendScreen() {
  const extendGrid = document.getElementById('extendGrid');
  extendGrid.querySelectorAll('.btn-time-card').forEach(btn => {
    btn.addEventListener('click', () => {
      playTapSound();
      const mins = parseInt(btn.getAttribute('data-minutes'), 10);
      startTimer(mins);
    });
  });

  document.getElementById('btnSkipExtend').addEventListener('click', () => {
    playTapSound();
    if (!state.completedMap[state.currentCategory]) {
      state.completedMap[state.currentCategory] = {};
    }
    state.completedMap[state.currentCategory][state.currentActivityId] = true;
    saveData();
    checkAllActivitiesDone();
  });
}

function checkAllActivitiesDone() {
  const list = getCurrentActivitiesList();
  const currentCompleted = state.completedMap[state.currentCategory] || {};
  const allDone = list.length > 0 && list.every(act => !!currentCompleted[act.id]);

  if (allDone) {
    triggerAllClear();
  } else {
    renderActivitiesMenu();
    showScreen('screen-menu');
  }
}

// ===== 全体クリア =====
function triggerAllClear() {
  registerDayCompletion();
  playFanfareSound();

  document.getElementById('finalStreakCount').textContent = state.streak;

  const cheerEl = document.getElementById('streakCheer');
  if (state.streak >= 3) {
    cheerEl.textContent = `すごーい！ ${state.streak}にち も つづいてるよ！🌟`;
  } else {
    cheerEl.textContent = 'あしたも がんばろうね！✨';
  }

  createConfetti();
  showScreen('screen-all-clear');
}

function createConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ff7979'];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.transform = `scale(${0.5 + Math.random() * 0.8})`;
    container.appendChild(piece);
  }
}

// ===== 先生・保護者向け項目編集モーダル =====
function openManageModal() {
  renderManageItemsList();
  document.getElementById('modalManage').classList.add('active');
}

function closeManageModal() {
  document.getElementById('modalManage').classList.remove('active');
}

function renderManageItemsList() {
  const listEl = document.getElementById('currentItemsList');
  listEl.innerHTML = '';

  const list = getCurrentActivitiesList();
  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'manage-item-row';
    const nameText = item.line2 ? `${item.line1} ${item.line2}` : item.line1;

    row.innerHTML = `
      <div class="manage-item-info">
        <span>${item.iconType === 'svg-randoseru' ? '🎒' : (item.icon || '⭐')}</span>
        <span>${nameText}</span>
      </div>
      <button class="btn-delete-item" data-id="${item.id}">さくじょ</button>
    `;

    row.querySelector('.btn-delete-item').addEventListener('click', () => {
      if (confirm(`「${nameText}」を さくじょ しますか？`)) {
        deleteActivityItem(item.id);
      }
    });

    listEl.appendChild(row);
  });
}

function addNewActivityItem() {
  const input = document.getElementById('inputItemName');
  const rawText = input.value.trim();
  if (!rawText) {
    alert('なまえ を にゅうりょく してください');
    return;
  }

  let line1 = rawText;
  let line2 = '';
  if (rawText.includes(' ')) {
    const parts = rawText.split(' ');
    line1 = parts[0];
    line2 = parts.slice(1).join(' ');
  } else if (rawText.length > 5) {
    line1 = rawText.slice(0, 4);
    line2 = rawText.slice(4);
  }

  const newItem = {
    id: 'item_' + Date.now(),
    line1: line1,
    line2: line2,
    iconType: selectedNewItemIcon === '🎒' ? 'svg-randoseru' : 'emoji',
    icon: selectedNewItemIcon
  };

  state.categoriesData[state.currentCategory].push(newItem);
  saveData();
  input.value = '';
  renderManageItemsList();
  renderActivitiesMenu();
  alert('あたらしい こうもく を ついか しました！');
}

function deleteActivityItem(id) {
  state.categoriesData[state.currentCategory] = state.categoriesData[state.currentCategory].filter(a => a.id !== id);
  if (state.completedMap[state.currentCategory]) {
    delete state.completedMap[state.currentCategory][id];
  }
  saveData();
  renderManageItemsList();
  renderActivitiesMenu();
}

function resetCurrentCategoryToDefault() {
  if (confirm('この ページの こうもく を さいしょの じょうたい に もどしますか？')) {
    if (state.currentCategory === 'morning') {
      state.categoriesData.morning = JSON.parse(JSON.stringify(DEFAULT_MORNING_ACTIVITIES));
    } else {
      state.categoriesData.custom = JSON.parse(JSON.stringify(DEFAULT_CUSTOM_ACTIVITIES));
    }
    if (state.completedMap[state.currentCategory]) {
      state.completedMap[state.currentCategory] = {};
    }
    saveData();
    renderManageItemsList();
    renderActivitiesMenu();
  }
}

// ===== イベントリスナーと初期化 =====
function setupEventListeners() {
  // ヘッダーのトグルスイッチ（たぶれっと／すまほ）
  document.getElementById('btnToggleTablet').addEventListener('click', () => {
    playTapSound();
    applyDeviceMode('tablet');
    saveData();
  });

  document.getElementById('btnToggleMobile').addEventListener('click', () => {
    playTapSound();
    applyDeviceMode('mobile');
    saveData();
  });

  // カテゴリ選択（あさのじゅんび / 他で使う）
  document.getElementById('btnSelectMorning').addEventListener('click', () => {
    playTapSound();
    state.currentCategory = 'morning';
    renderActivitiesMenu();
    showScreen('screen-menu');
  });

  document.getElementById('btnSelectCustom').addEventListener('click', () => {
    playTapSound();
    state.currentCategory = 'custom';
    renderActivitiesMenu();
    showScreen('screen-menu');
  });

  // メニュー画面の「前の画面（カテゴリ選び）」
  document.getElementById('btnBackToCategory').addEventListener('click', () => {
    playTapSound();
    showScreen('screen-category-select');
  });

  // 時間選択画面の「もどる」
  document.getElementById('btnBackToMenu').addEventListener('click', () => {
    playTapSound();
    renderActivitiesMenu();
    showScreen('screen-menu');
  });

  // タイマー画面の「時間を選び直す」
  document.getElementById('btnBackToTime').addEventListener('click', () => {
    playTapSound();
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    showScreen('screen-time');
  });

  // タイマー操作
  document.getElementById('btnPauseResume').addEventListener('click', togglePauseTimer);
  document.getElementById('btnFinishEarly').addEventListener('click', finishTimerEarly);

  // 終了確認
  document.getElementById('btnConfirmDone').addEventListener('click', () => {
    markCurrentActivityCompleted(true);
  });
  document.getElementById('btnConfirmNotYet').addEventListener('click', () => {
    markCurrentActivityCompleted(false);
  });

  // 全クリア画面から戻る
  document.getElementById('btnCompleteBackToMenu').addEventListener('click', () => {
    playTapSound();
    renderActivitiesMenu();
    showScreen('screen-menu');
  });

  // 今日の準備やり直し
  document.getElementById('btnResetDay').addEventListener('click', () => {
    if (confirm('きょうの じゅんびを はじめから やりなおしますか？')) {
      playTapSound();
      if (state.completedMap[state.currentCategory]) {
        state.completedMap[state.currentCategory] = {};
      }
      saveData();
      renderActivitiesMenu();
    }
  });

  // 管理モーダル開閉
  document.getElementById('btnOpenManageModal').addEventListener('click', () => {
    playTapSound();
    openManageModal();
  });
  document.getElementById('btnCloseModal').addEventListener('click', closeManageModal);

  // 管理モーダル内のアイコン選択
  document.querySelectorAll('.icon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedNewItemIcon = btn.getAttribute('data-icon');
    });
  });

  // 項目追加ボタン
  document.getElementById('btnAddActivity').addEventListener('click', addNewActivityItem);

  // 初期状態にリセット
  document.getElementById('btnResetToDefault').addEventListener('click', resetCurrentCategoryToDefault);
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  initTimeGrid();
  initExtendScreen();
  setupEventListeners();

  // 起動時は直接カテゴリ選択画面（朝の準備 / 他で使う）を表示
  showScreen('screen-category-select');
});
