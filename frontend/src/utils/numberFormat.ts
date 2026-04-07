import i18n from '../i18n';

/**
 * 会計用数値フォーマット関数。
 * マイナス値は環境に応じて「△」記号（日本語）または括弧書き（英語・その他）で表記する。
 *
 * @param value - フォーマット対象の数値
 * @param options - ロケール、小数点桁数などのオプション
 * @returns フォーマット済み文字列（マイナス値は「△123,456」または「(123,456)」形式）
 */
export function formatAccountingNumber(
  value: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString(options?.locale, {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits,
  });

  if (value >= 0) return formatted;

  // 日本語環境では △ 記号、それ以外は括弧書き
  return i18n.language === 'ja' ? `△${formatted}` : `(${formatted})`;
}

/**
 * 会計用通貨フォーマット関数。
 * マイナス値は「△」記号または括弧書きを付与する。
 *
 * @param value - フォーマット対象の数値
 * @param currency - 通貨コード（例: JPY, USD）
 * @param options - ロケール、小数点桁数などのオプション
 * @returns フォーマット済み文字列（例：「△123,456 JPY」または「(123,456) USD」）
 */
export function formatAccountingCurrency(
  value: number,
  currency: string,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const formatted = formatAccountingNumber(value, options);
  return `${formatted} ${currency}`;
}
