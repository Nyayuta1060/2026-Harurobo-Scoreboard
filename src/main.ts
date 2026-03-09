import './style.css';

// ─── 型定義 ────────────────────────────────────────────────────────────────

type FortressOwner = 'none' | 'blue' | 'red';
type TeamKey = 'blue' | 'red';
type BooleanTeamKey = 'ohte' | 'yagurazZone' | 'isAuto';

interface FortressState {
  owner: FortressOwner;
}

interface TeamState {
  score: number;
  ohte: boolean;  // 王手
  yagurazZone: boolean;  // 櫓ゾーン
  isAuto: boolean;  // true = 自動, false = 手動
}

interface GameState {
  blue: TeamState;
  red: TeamState;
  fortresses: FortressState[];
}

// ─── 初期状態 ──────────────────────────────────────────────────────────────

const createTeamState = (): TeamState => ({
  score: 0,
  ohte: false,
  yagurazZone: false,
  isAuto: true,
});

const state: GameState = {
  blue: createTeamState(),
  red: createTeamState(),
  fortresses: Array.from({ length: 5 }, (): FortressState => ({ owner: 'none' })),
};

const FORTRESS_CYCLE: Record<FortressOwner, FortressOwner> = {
  none: 'blue',
  blue: 'red',
  red: 'none',
};

// ─── レンダリング ──────────────────────────────────────────────────────────

function renderScoreBox(team: TeamKey): string {
  const t = state[team];
  const label = team === 'blue' ? '青チーム' : '赤チーム';
  return `
    <div class="score-box ${team}-score-box">
      <div class="score-label">${label}</div>
      <div class="score-display">
        <button class="score-btn" data-action="score" data-team="${team}" data-delta="-1">−</button>
        <span class="score-value ${team}-value">${t.score}</span>
        <button class="score-btn" data-action="score" data-team="${team}" data-delta="1">＋</button>
      </div>
    </div>`;
}

function renderFortresses(): string {
  return state.fortresses.map((f, i) => `
    <div class="fortress fortress-${f.owner}" data-action="fortress" data-index="${i}">
      <span class="fortress-number">陣 ${i + 1}</span>
    </div>`).join('');
}

function renderBottomPanel(team: TeamKey): string {
  const t = state[team];
  const badge = team === 'blue' ? '青' : '赤';
  const statusCls = (active: boolean) => `status-btn ${active ? 'achieved' : 'not-achieved'}`;
  const modeCls = t.isAuto ? 'auto-mode' : 'manual-mode';
  return `
    <div class="bottom-panel ${team}-bottom-panel">
      <span class="team-badge ${team}-badge">${badge}</span>
      <button class="${statusCls(t.ohte)}"
        data-action="toggle" data-team="${team}" data-key="ohte">王手</button>
      <button class="${statusCls(t.yagurazZone)}"
        data-action="toggle" data-team="${team}" data-key="yagurazZone">櫓ゾーン</button>
      <button class="mode-btn ${modeCls}"
        data-action="toggle" data-team="${team}" data-key="isAuto">
        ${t.isAuto ? '自動' : '手動'}
      </button>
    </div>`;
}

function render(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="layout">

      <!-- ▸ 上部: スコア -->
      <div class="top-bar">
        ${renderScoreBox('blue')}
        <div class="top-center">
          <h1 class="title">春ロボ 2026</h1>
          <button class="reset-btn" data-action="reset">リセット</button>
        </div>
        ${renderScoreBox('red')}
      </div>

      <!-- ▸ 中央: 陣 + サイドパネル -->
      <div class="middle">
        <div class="side-panel blue-panel" id="blue-conditions">
          <!-- 条件ボタン（後で実装） -->
        </div>

        <div class="fortress-area">
          ${renderFortresses()}
        </div>

        <div class="side-panel red-panel" id="red-conditions">
          <!-- 条件ボタン（後で実装） -->
        </div>
      </div>

      <!-- ▸ 下部: 状態ボタン -->
      <div class="bottom-bar">
        ${renderBottomPanel('blue')}
        ${renderBottomPanel('red')}
      </div>

    </div>`;
}

// ─── イベント処理 ──────────────────────────────────────────────────────────

function handleClick(e: Event): void {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;

  const { action } = el.dataset;

  switch (action) {
    case 'score': {
      const team = el.dataset.team as TeamKey;
      const delta = parseInt(el.dataset.delta ?? '0', 10);
      state[team].score = Math.max(0, state[team].score + delta);
      break;
    }
    case 'toggle': {
      const team = el.dataset.team as TeamKey;
      const key = el.dataset.key as BooleanTeamKey;
      state[team][key] = !state[team][key];
      break;
    }
    case 'fortress': {
      const i = parseInt(el.dataset.index ?? '0', 10);
      state.fortresses[i].owner = FORTRESS_CYCLE[state.fortresses[i].owner];
      break;
    }
    case 'reset': {
      if (confirm('リセットしますか？')) {
        state.blue = createTeamState();
        state.red = createTeamState();
        state.fortresses.forEach(f => { f.owner = 'none'; });
      }
      break;
    }
    default:
      return; // render をスキップ
  }

  render();
}

// ─── 起動 ──────────────────────────────────────────────────────────────────

function init(): void {
  document.getElementById('app')!.addEventListener('click', handleClick);
  render();
}

init();
