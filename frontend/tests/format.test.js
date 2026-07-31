import { describe, expect, test } from 'vitest';
import { formatXlm, toStroops, truncateAddress, truncateHash } from '../src/utils/format.js';

describe('formatXlm', () => {
  test('converts stroops to XLM with default 2 decimal places', () => {
    expect(formatXlm('25000000')).toBe('2.5');
  });

  test('handles whole numbers without trailing decimals', () => {
    expect(formatXlm('100000000')).toBe('10');
  });

  test('returns "0" for invalid input rather than NaN', () => {
    expect(formatXlm('not-a-number')).toBe('0');
  });

  test('respects a custom maximumFractionDigits', () => {
    expect(formatXlm('12345678', { maximumFractionDigits: 4 })).toBe('1.2346');
  });
});

describe('toStroops', () => {
  test('converts XLM to an integer stroop count', () => {
    expect(toStroops('2.5')).toBe(25000000);
  });

  test('rounds fractional stroops rather than truncating', () => {
    expect(toStroops('0.00000015')).toBe(2); // 1.5 stroops rounds to 2
  });

  test('returns 0 for negative or invalid input', () => {
    expect(toStroops('-5')).toBe(0);
    expect(toStroops('abc')).toBe(0);
  });
});

describe('truncateAddress', () => {
  const address = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';

  test('shortens a long address to head…tail', () => {
    expect(truncateAddress(address)).toBe('GABC…TUVW');
  });

  test('returns an empty string for a falsy address', () => {
    expect(truncateAddress(null)).toBe('');
    expect(truncateAddress(undefined)).toBe('');
  });

  test('returns short strings unchanged', () => {
    expect(truncateAddress('short')).toBe('short');
  });
});

describe('truncateHash', () => {
  test('shortens a hash and appends an ellipsis', () => {
    expect(truncateHash('a1b2c3d4e5f6')).toBe('a1b2c3d4…');
  });

  test('returns an empty string for a falsy hash', () => {
    expect(truncateHash('')).toBe('');
  });
});
