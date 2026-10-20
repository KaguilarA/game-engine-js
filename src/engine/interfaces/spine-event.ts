import type { SpineRecord } from './spine-record';

export interface SpineEvent {
  name: string;
  time: number;
  intValue?: number;
  floatValue?: number;
  stringValue?: string;
  volume?: number;
  balance?: number;
  data?: SpineRecord;
}
