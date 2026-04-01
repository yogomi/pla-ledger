/**
 * 印刷ユーティリティ
 *
 * @media print の visibility ルールを動的に適用し、指定した要素だけを印刷する。
 * document.body.innerHTML を書き換えないため React の状態を破壊しない。
 */

const PRINT_STYLE_ID = 'pla-ledger-print-style';
const PRINT_TARGET_ID = 'pla-ledger-print-target';

/**
 * 指定した要素のみを印刷する。
 * CSS の visibility を利用して印刷対象以外の要素を非表示にする。
 * @param element - 印刷する要素
 */
export function printElement(element: HTMLElement): void {
  // 既存の印刷スタイルを削除する
  document.getElementById(PRINT_STYLE_ID)?.remove();

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = [
    '@media print {',
    '  body * { visibility: hidden; }',
    `  #${PRINT_TARGET_ID}, #${PRINT_TARGET_ID} * { visibility: visible; }`,
    `  #${PRINT_TARGET_ID} { position: absolute; left: 0; top: 0; width: 100%; }`,
    '}',
  ].join('\n');

  document.head.appendChild(style);
  element.id = PRINT_TARGET_ID;

  window.print();

  // 印刷後にクリーンアップする
  element.removeAttribute('id');
  style.remove();
}
