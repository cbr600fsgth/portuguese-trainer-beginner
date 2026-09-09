// 出題の組み立て。日付には一切依存しない。
//
// 1回のセッションで全フレーズを必ず1回ずつ出す。順序は毎回シャッフルする。
// 並び順で答えを思い出す癖がつくと、現地で日本語から出てこないため。
//
// 「だめ」を押したフレーズをそのセッションの末尾へ回すのは画面側（app.js）の担当。
// ここは純関数のみで、状態も実日付も持たない。
//
// 日付ユーティリティは連続日数の判定にだけ使う。出題内容は日付で変わらない。

// ---- 日付ユーティリティ（UTC日番号ベース。DSTの影響を受けない） ----

function pad(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' → 1970-01-01からの日数 */
export function dayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 日数 → 'YYYY-MM-DD' */
export function fromDayNum(n) {
  const dt = new Date(n * 86400000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(iso, n) {
  return fromDayNum(dayNum(iso) + n);
}

/** to - from を日数で返す */
export function diffDays(from, to) {
  return dayNum(to) - dayNum(from);
}

/** Dateオブジェクト → 'YYYY-MM-DD'（ローカル暦日） */
export function isoFromDate(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// ---- 出題 ----

/** Fisher-Yates。引数は変更せず、シャッフルした新しい配列を返す */
export function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 1回のセッションで出すID配列。全フレーズをシャッフルして返す。
 * @param {{id:string}[]} allPhrases phrases.json の配列
 */
export function buildSession(allPhrases) {
  return shuffle(allPhrases.map((p) => p.id));
}
