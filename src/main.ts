import './style.css';

// ─── 型定義 ────────────────────────────────────────────────────────────────

type TeamKey   = 'blue' | 'red';
type ZoneField = 'yagura' | 'ringsOnYagura' | 'ringsInZone';

/** 1陣 × 1チーム分の状態 */
interface ZoneHalf {
  yagura:        number;  // 陣取りゾーン内の櫓数          → 得点 B
  ringsOnYagura: number;  // 櫓に通っているリング数          → 得点 D / 陣取り判定
  ringsInZone:   number;  // ゾーン内のリング（櫓上でない） → 得点 C
  knocked:       boolean; // 自チームの櫓が相手に倒された   → 陣取りとみなす
}

interface TeamState {
  isAuto:      boolean; // true=自動 / false=手動（試合前に決定）
  yagurazZone: boolean; // 櫓ゾーン初進入（得点 A トリガー）
  ohte:        boolean; // 王手
}

interface Zone {
  blue: ZoneHalf;
  red:  ZoneHalf;
}

interface GameState {
  blue:  TeamState;
  red:   TeamState;
  zones: Zone[];
}

interface ScoreBreakdown {
  a: number; // 櫓ゾーン進入
  b: number; // 櫓接地
  c: number; // リング（ゾーン）
  d: number; // リング（櫓上）
  e: number; // 陣取り
  total: number;
}

// ─── 初期状態 ──────────────────────────────────────────────────────────────

const makeHalf  = (): ZoneHalf  => ({ yagura: 0, ringsOnYagura: 0, ringsInZone: 0, knocked: false });
const makeTeam  = (): TeamState => ({ isAuto: true, yagurazZone: false, ohte: false });
const makeState = (): GameState => ({
  blue:  makeTeam(),
  red:   makeTeam(),
  zones: Array.from({ length: 5 }, () => ({ blue: makeHalf(), red: makeHalf() })),
});

let state: GameState = makeState();

// ─── ゲームロジック ────────────────────────────────────────────────────────

const opp = (t: TeamKey): TeamKey => (t === 'blue' ? 'red' : 'blue');

/** 指定チームが当該陣を陣取りしているか */
function isCaptured(zone: Zone, team: TeamKey): boolean {
  // 転倒ルール：自チームの櫓が倒されても陣取りと認められる
  if (zone[team].knocked) return true;
  return zone[team].ringsOnYagura > zone[opp(team)].ringsOnYagura;
}

/** 陣の表示色を決定 */
function zoneOwner(zone: Zone): 'blue' | 'red' | 'none' {
  const b = isCaptured(zone, 'blue');
  const r = isCaptured(zone, 'red');
  if (b && !r) return 'blue';
  if (r && !b) return 'red';
  return 'none';
}

/** 得点A〜Eを計算 */
function calcScore(team: TeamKey): ScoreBreakdown {
  const t    = state[team];
  const auto = t.isAuto;

  // A: 櫓ゾーン初進入
  const a = t.yagurazZone ? (auto ? 20 : 10) : 0;

  // B: 櫓接地（手動:5pt/個 max25 / 自動:10pt/個 max50）
  const totalY = state.zones.reduce((s, z) => s + z[team].yagura, 0);
  const b      = Math.min(totalY * (auto ? 10 : 5), auto ? 50 : 25);

  // C: リング（ゾーン内・櫓上以外）（手動:2pt/個 max40 / 自動:4pt/個 max80）
  const totalR = state.zones.reduce((s, z) => s + z[team].ringsInZone, 0);
  const c      = Math.min(totalR * (auto ? 4 : 2), auto ? 80 : 40);

  // D: リング（B達成の櫓上）（手動:10pt/個 max200 / 自動:20pt/個 max400）
  const totalRY = state.zones.reduce(
    (s, z) => s + (z[team].yagura > 0 ? z[team].ringsOnYagura : 0), 0
  );
  const d = Math.min(totalRY * (auto ? 20 : 10), auto ? 400 : 200);

  // E: 陣取り 30pt/陣 max150
  const captured = state.zones.filter(z => isCaptured(z, team)).length;
  const e        = captured * 30;

  return { a, b, c, d, e, total: a + b + c + d + e };
}

// ─── レンダリング ──────────────────────────────────────────────────────────

function renderScoreBox(team: TeamKey): string {
  const s  = calcScore(team);
  const t  = state[team];
  const nm = team === 'blue' ? '青チーム' : '赤チーム';
  return `
    <div class="score-box ${team}-score-box">
      <div class="score-top">
        <span class="score-name">${nm}</span>
        <span class="mode-tag ${t.isAuto ? 'tag-auto' : 'tag-manual'}">${t.isAuto ? '自動' : '手動'}</span>
      </div>
      <div class="score-num ${team}-num">${s.total}</div>
      <div class="score-detail">
        <span title="A:櫓ゾーン進入">A<em>${s.a}</em></span>
        <span title="B:櫓接地">B<em>${s.b}</em></span>
        <span title="C:リング(ゾーン)">C<em>${s.c}</em></span>
        <span title="D:リング(櫓上)">D<em>${s.d}</em></span>
        <span title="E:陣取り">E<em>${s.e}</em></span>
      </div>
    </div>`;
}

function renderCtrlGroup(team: TeamKey, zi: number, field: ZoneField, label: string, val: number): string {
  return `
    <div class="ctrl-group">
      <span class="ctrl-lbl">${label}</span>
      <button class="ctrl-btn"
        data-action="zone" data-team="${team}" data-zone="${zi}"
        data-field="${field}" data-delta="-1">−</button>
      <span class="ctrl-num">${val}</span>
      <button class="ctrl-btn"
        data-action="zone" data-team="${team}" data-zone="${zi}"
        data-field="${field}" data-delta="1">＋</button>
    </div>`;
}

function renderZoneCtrl(team: TeamKey, zi: number): string {
  const z = state.zones[zi][team];
  return `
    <div class="zone-ctrl ${team}-ctrl">
      ${renderCtrlGroup(team, zi, 'yagura',        '櫓', z.yagura)}
      ${renderCtrlGroup(team, zi, 'ringsOnYagura', '↑R', z.ringsOnYagura)}
      ${renderCtrlGroup(team, zi, 'ringsInZone',   'R',  z.ringsInZone)}
      <button class="knocked-btn ${z.knocked ? 'knocked-on' : ''}"
        data-action="knocked" data-team="${team}" data-zone="${zi}">転倒</button>
    </div>`;
}

function renderZoneRows(): string {
  return state.zones.map((z, i) => {
    const o    = zoneOwner(z);
    const bcap = isCaptured(z, 'blue');
    const rcap = isCaptured(z, 'red');
    return `
      <div class="zone-row">
        ${renderZoneCtrl('blue', i)}
        <div class="fortress fortress-${o}">
          <div class="fortress-zi">陣 ${i + 1}</div>
          <div class="fortress-caps">
            <span class="cap-ind ${bcap ? 'cap-blue' : 'cap-off'}">◀</span>
            <span class="cap-ind ${rcap ? 'cap-red' : 'cap-off'}">▶</span>
          </div>
        </div>
        ${renderZoneCtrl('red', i)}
      </div>`;
  }).join('');
}

function renderBottomPanel(team: TeamKey): string {
  const t  = state[team];
  const nm = team === 'blue' ? '青' : '赤';
  return `
    <div class="bot-panel ${team}-bot-panel">
      <span class="team-badge ${team}-badge">${nm}</span>
      <button class="status-btn ${t.ohte ? 'achieved' : 'unachieved'}"
        data-action="toggle" data-team="${team}" data-key="ohte">王手</button>
      <button class="status-btn ${t.yagurazZone ? 'achieved' : 'unachieved'}"
        data-action="toggle" data-team="${team}" data-key="yagurazZone">櫓ゾーン</button>
      <button class="mode-btn ${t.isAuto ? 'auto-mode' : 'manual-mode'}"
        data-action="toggle" data-team="${team}" data-key="isAuto">
        ${t.isAuto ? '自動' : '手動'}
      </button>
    </div>`;
}

function render(): void {
  document.getElementById('app')!.innerHTML = `
    <div class="layout">
      <header class="top-bar">
        ${renderScoreBox('blue')}
        <div class="title-area">
          <h1 class="title">春ロボ 2026</h1>
          <div class="legend">
            <span>櫓=B得点</span><span>↑R=陣取り/D</span><span>R=C得点</span>
          </div>
          <button class="reset-btn" data-action="reset">リセット</button>
        </div>
        ${renderScoreBox('red')}
      </header>

      <main class="zone-area">
        ${renderZoneRows()}
      </main>

      <footer class="bot-bar">
        ${renderBottomPanel('blue')}
        ${renderBottomPanel('red')}
      </footer>
    </div>`;
}

// ─── イベント処理 ──────────────────────────────────────────────────────────

function handleClick(e: Event): void {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;

  switch (el.dataset.action) {
    case 'zone': {
      const team  = el.dataset.team as TeamKey;
      const zi    = Number(el.dataset.zone);
      const field = el.dataset.field;
      const delta = Number(el.dataset.delta);
      if (field === 'yagura' || field === 'ringsOnYagura' || field === 'ringsInZone') {
        state.zones[zi][team][field] = Math.max(0, state.zones[zi][team][field] + delta);
      }
      break;
    }
    case 'knocked': {
      const team = el.dataset.team as TeamKey;
      const zi   = Number(el.dataset.zone);
      state.zones[zi][team].knocked = !state.zones[zi][team].knocked;
      break;
    }
    case 'toggle': {
      const team = el.dataset.team as TeamKey;
      const key  = el.dataset.key;
      if (key === 'ohte' || key === 'yagurazZone' || key === 'isAuto') {
        state[team][key] = !state[team][key];
      }
      break;
    }
    case 'reset':
      if (confirm('スコアをリセットしますか？')) state = makeState();
      break;
    default:
      return;
  }

  render();
}

// ─── 起動 ──────────────────────────────────────────────────────────────────

document.getElementById('app')!.addEventListener('click', handleClick);
render();
