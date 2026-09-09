import * as session from './session.js';
import * as store from './store.js';
import * as audio from './audio.js';

// 画面の不具合がキャッシュ由来かを切り分けるための版番号。コードを変えたら上げる
const APP_VERSION = 'simple-r1';

const SCENE_LABELS = {
  greet: 'あいさつ',
  basic: '基本',
  numero: '数字・時刻',
  pedir: '頼む・尋ねる',
  restaurante: 'レストラン',
  cafe: 'カフェ',
  transporte: '移動',
  hotel: '宿',
  compras: '買い物・チケット',
  problema: '困ったとき',
};

const $ = (id) => document.getElementById(id);

const state = {
  today: null,
  phrases: [],
  byId: {},
  meta: null,
  queue: [],      // 出題するID配列。「だめ」を押すと末尾に同じIDが積まれる
  index: 0,
  revealed: false,
  slow: false,
  ngIds: null,    // Set<string> その回に一度でも「だめ」を押したID
};

// ---- 画面切替 ----

function show(name) {
  ['home', 'session', 'done', 'settings'].forEach((s) => {
    $(`screen-${s}`).classList.toggle('hidden', s !== name);
  });
}

// ---- ホーム ----

function renderHome() {
  $('total').textContent = state.phrases.length;
  $('streak').textContent = state.meta.streak || 0;
  $('sessions').textContent = state.meta.totalSessions || 0;

  $('home-today').textContent =
    state.meta.lastDone === state.today ? '今日はもう確認した' : 'まだ今日の確認をしていない';

  const warn = audio.warningText();
  $('audio-warning').textContent = warn || '';
  $('audio-warning').classList.toggle('hidden', !warn);
}

// ---- セッション ----

/** 日付に関係なく、毎回すべてのフレーズをシャッフルして出す */
function startSession() {
  state.queue = session.buildSession(state.phrases);
  state.index = 0;
  state.ngIds = new Set();

  if (state.queue.length === 0) return;
  show('session');
  renderCard();
}

function currentId() {
  return state.queue[state.index];
}

function renderCard() {
  const p = state.byId[currentId()];

  state.revealed = false;
  state.slow = false;
  $('btn-slow').textContent = 'ゆっくり';

  // 「だめ」で末尾に再出題されるとキューが伸びるため、分母は常に現在のキュー長を使う
  const total = state.queue.length;
  $('session-progress').style.width = `${(state.index / total) * 100}%`;
  $('session-stage').textContent = `${state.index + 1}/${total}`;

  $('card-scene').textContent = SCENE_LABELS[p.scene] || p.scene;
  $('card-jp').textContent = p.jp;
  $('card-pt').textContent = p.pt;
  $('card-kana').textContent = p.kana;
  $('card-it').textContent = p.it;
  $('card-note').textContent = p.note;

  $('card-back').classList.add('hidden');
  $('btn-reveal').classList.remove('hidden');
  $('grade-row').classList.add('hidden');
}

function reveal() {
  if (state.revealed) return;
  state.revealed = true;
  $('card-back').classList.remove('hidden');
  $('btn-reveal').classList.add('hidden');
  $('grade-row').classList.remove('hidden');
  audio.speak(state.byId[currentId()], 1.0);
}

/**
 * 採点は次回以降の予定に影響しない（毎日全フレーズ出す）。
 * 「だめ」はそのセッションの末尾に同じフレーズを積むためだけに使う。
 */
function grade(g) {
  if (!state.revealed) return;

  const id = currentId();
  if (g === 'again') {
    state.ngIds.add(id);
    state.queue.push(id);
  }
  advance();
}

function advance() {
  audio.stop();
  state.index += 1;
  if (state.index >= state.queue.length) {
    finishSession();
    return;
  }
  renderCard();
}

function finishSession() {
  state.meta = store.recordSession(
    state.meta,
    state.today,
    session.addDays(state.today, -1)
  );

  $('done-streak').textContent = state.meta.streak || 0;
  $('done-summary').textContent = `全 ${state.phrases.length} フレーズ確認`;

  const ng = [...state.ngIds];
  $('done-carry').classList.toggle('hidden', ng.length === 0);
  if (ng.length > 0) {
    const list = ng.map((id) => state.byId[id].pt).join(' / ');
    $('done-carry').textContent = `つまずいた ${ng.length}枚: ${list}`;
  }

  show('done');
}

// ---- 設定 ----

function renderSettings() {
  const st = audio.status();
  const statusText = {
    ptpt: 'ヨーロッパポルトガル語（pt-PT）の音声を使用中',
    ptbr: 'pt-PT音声なし。ブラジル音声で代用中',
    none: 'ポルトガル語の音声が見つかりません',
    unsupported: 'この端末は音声合成に未対応',
    unknown: '判定中',
  }[st.voiceStatus];

  $('voice-status').textContent =
    `${statusText}${st.voiceName ? `: ${st.voiceName}` : ''} / MP3 ${st.mp3Count}件`;

  const voices = audio.listPortugueseVoices();
  $('voice-list').textContent = voices.length
    ? `端末の音声: ${voices.join(' , ')}`
    : '端末の音声: なし';

  $('progress-detail').textContent =
    `フレーズ ${state.phrases.length}件 / 連続 ${state.meta.streak || 0}日 / ` +
    `のべ ${state.meta.totalSessions || 0}回`;

  $('app-version').textContent = APP_VERSION;
}

// ---- 配線 ----

function wire() {
  $('btn-start').addEventListener('click', startSession);
  $('btn-reveal').addEventListener('click', reveal);

  document.querySelectorAll('.grade').forEach((b) => {
    b.addEventListener('click', () => grade(b.dataset.grade));
  });

  $('btn-replay').addEventListener('click', (e) => {
    e.stopPropagation();
    audio.speak(state.byId[currentId()], state.slow ? 0.75 : 1.0);
  });

  $('btn-slow').addEventListener('click', (e) => {
    e.stopPropagation();
    state.slow = !state.slow;
    $('btn-slow').textContent = state.slow ? '標準の速さ' : 'ゆっくり';
    audio.speak(state.byId[currentId()], state.slow ? 0.75 : 1.0);
  });

  $('btn-quit').addEventListener('click', () => {
    audio.stop();
    renderHome();
    show('home');
  });

  $('btn-home').addEventListener('click', () => {
    renderHome();
    show('home');
  });

  $('btn-copy').addEventListener('click', async () => {
    const line = `- [x] [[ポルトガル語]] ✅ ${state.today}`;
    try {
      await navigator.clipboard.writeText(line);
      $('btn-copy').textContent = 'コピーしました';
    } catch (e) {
      $('btn-copy').textContent = line;
    }
  });

  $('btn-settings').addEventListener('click', () => {
    renderSettings();
    show('settings');
  });

  $('btn-settings-close').addEventListener('click', () => {
    renderHome();
    show('home');
  });

  $('btn-export').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `portuguese-trainer-beginner-${state.today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('input-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      store.importJSON(await file.text());
      state.meta = store.loadMeta();
      renderSettings();
      alert('読み込みました');
    } catch (err) {
      alert(`読み込みに失敗: ${err.message}`);
    }
    e.target.value = '';
  });

  $('btn-reset').addEventListener('click', () => {
    if (!confirm('連続日数とのべ回数を消します。元に戻せません。')) return;
    store.resetProgress();
    state.meta = store.loadMeta();
    renderSettings();
  });

  // Macでのキーボード操作
  document.addEventListener('keydown', (e) => {
    if ($('screen-session').classList.contains('hidden')) return;
    if (!currentId()) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!state.revealed) reveal();
      return;
    }
    if (state.revealed) {
      if (e.key === '1') grade('again');
      if (e.key === '2') grade('good');
    }
  });
}

// ---- 起動 ----

async function main() {
  state.today = session.isoFromDate(new Date());
  state.meta = store.loadMeta();

  const res = await fetch('data/phrases.json', { cache: 'no-cache' });
  const data = await res.json();
  state.phrases = data.phrases;
  state.byId = Object.fromEntries(state.phrases.map((p) => [p.id, p]));

  wire();

  renderHome();
  show('home');

  await audio.init();
  renderHome(); // 音声の判定結果を反映
}

main().catch((e) => {
  console.error(e);
  const pre = document.createElement('pre');
  pre.style.cssText = 'padding:20px;white-space:pre-wrap';
  pre.textContent =
    `起動に失敗しました\n\n${e.message}\n\n` +
    'file:// で開いていませんか。python3 tools/serve.py で配信してください。';
  document.body.replaceChildren(pre);
});
