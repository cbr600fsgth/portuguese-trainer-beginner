// localStorage の読み書き。iOSのPWAは長期未使用でストレージが破棄されうるため
// エクスポート/インポートを必ず用意する。
//
// 出題は毎回全フレーズなので、カードごとの状態（箱・期限）は保存しない。
// 残すのは連続日数などのセッション記録だけ。
//
// キー接頭辞 ptb. はportuguese-trainer本家（pt.）との名前空間分離のため。
// GitHub Pagesはprojectサイトのpathが違ってもoriginは同じ(cbr600fsgth.github.io)で
// localStorageはorigin単位なので、接頭辞を分けないと同じブラウザで両アプリを開いたときに
// 記録が混線する。
const META_KEY = 'ptb.meta';

const DEFAULT_META = {
  streak: 0,
  lastDone: null,      // 最後にセッションを完了した日 'YYYY-MM-DD'
  totalSessions: 0,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`${key} の読み込みに失敗。初期値を使う`, e);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`${key} の保存に失敗`, e);
    return false;
  }
}

export function loadMeta() {
  return { ...DEFAULT_META, ...read(META_KEY, {}) };
}

export function saveMeta(meta) {
  return write(META_KEY, meta);
}

/** セッション完了を記録し、更新後のmetaを返す。同じ日に2回完了してもストリークは増えない */
export function recordSession(meta, today, yesterday) {
  if (meta.lastDone === today) return meta;

  const next = {
    ...meta,
    lastDone: today,
    totalSessions: (meta.totalSessions || 0) + 1,
    streak: meta.lastDone === yesterday ? (meta.streak || 0) + 1 : 1,
  };
  saveMeta(next);
  return next;
}

// ---- エクスポート / インポート ----

export function exportJSON() {
  return JSON.stringify(
    {
      version: 3,
      exportedAt: new Date().toISOString(),
      meta: loadMeta(),
    },
    null,
    2
  );
}

/** 成功したら true。形式が違えば例外を投げる */
export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data.meta !== 'object' || data.meta === null) {
    throw new Error('meta が見つかりません。このアプリのエクスポートファイルではありません');
  }
  saveMeta({ ...DEFAULT_META, ...data.meta });
  return true;
}

export function resetProgress() {
  localStorage.removeItem(META_KEY);
}
