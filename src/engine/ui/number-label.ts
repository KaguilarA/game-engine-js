import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import type { LabelOptions } from '../interfaces/label-options';
import type { NumberLabelOptions } from '../interfaces/number-label-options';
import { Label } from './label';

/** Formats reactive currency, count, or decimal values as a standard Label. */
export class NumberLabel extends Label {
  private readonly value: SignalValue<number>;
  private readonly numberOptions: Required<NumberLabelOptions>;

  public constructor(value: number | string, labelOptions: LabelOptions = {}, numberOptions: NumberLabelOptions = {}) {
    const normalizedOptions: Required<NumberLabelOptions> = {
      locale: numberOptions.locale ?? 'en-US',
      mode: numberOptions.mode ?? 'decimal',
      currency: numberOptions.currency ?? 'USD',
      minimumFractionDigits: numberOptions.minimumFractionDigits ?? (numberOptions.mode === 'count' ? 0 : 2),
      maximumFractionDigits: numberOptions.maximumFractionDigits ?? (numberOptions.mode === 'count' ? 0 : 2),
      useGrouping: numberOptions.useGrouping ?? true
    };
    const parsed = NumberLabel.parseValue(value, normalizedOptions.locale);
    super(NumberLabel.formatValue(parsed, normalizedOptions), labelOptions);
    this.value = signalValue(parsed);
    this.numberOptions = normalizedOptions;
  }

  public setValue(value: number | string): void {
    const parsed = NumberLabel.parseValue(value, this.numberOptions.locale);
    this.value.set(parsed);
    this.setText(NumberLabel.formatValue(parsed, this.numberOptions));
  }

  public getValue(): number { return this.value(); }

  private static parseValue(value: number | string, locale: string): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new RangeError('NumberLabel requires a finite number.');
      return value;
    }
    const source = value.trim();
    const parsedDirectly = Number(source);
    if (Number.isFinite(parsedDirectly)) return parsedDirectly;
    const accountingNegative = source.startsWith('(') && source.endsWith(')');
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    const group = parts.find((part) => part.type === 'group')?.value ?? ',';
    const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
    const normalized = source
      .replace(/[\u00a0\u202f\s]/g, '')
      .replace(new RegExp(`[${NumberLabel.escapeRegExp(group)}]`, 'g'), '')
      .replace(new RegExp(NumberLabel.escapeRegExp(decimal), 'g'), '.')
      .replace(/[^\d.+-]/g, '');
    const parsed = Number(normalized);
    const result = accountingNegative ? -Math.abs(parsed) : parsed;
    if (!Number.isFinite(result)) throw new TypeError(`Cannot parse numeric label value "${value}".`);
    return result;
  }

  private static formatValue(value: number, options: Required<NumberLabelOptions>): string {
    const style: Intl.NumberFormatOptions = options.mode === 'currency'
      ? { style: 'currency', currency: options.currency }
      : { style: 'decimal' };
    return new Intl.NumberFormat(options.locale, {
      ...style,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      useGrouping: options.useGrouping
    }).format(value);
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
