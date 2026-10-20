export interface NumberLabelOptions {
  locale?: string;
  mode?: 'currency' | 'count' | 'decimal';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}
