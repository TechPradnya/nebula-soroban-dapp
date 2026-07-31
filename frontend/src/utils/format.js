const STROOPS_PER_XLM = 10_000_000;

/** Converts a stringified i128 stroop amount (as stored/transmitted) to a display XLM string. */
export function formatXlm(stroops, { maximumFractionDigits = 2 } = {}) {
  const value = Number(stroops) / STROOPS_PER_XLM;
  if (Number.isNaN(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

/** Converts a human-entered XLM amount into an integer stroop count safe for i128 args. */
export function toStroops(xlmAmount) {
  const value = Number(xlmAmount);
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.round(value * STROOPS_PER_XLM);
}

/** Shortens a Stellar public key/contract id for compact display, e.g. `GABC…WXYZ`. */
export function truncateAddress(address, { head = 4, tail = 4 } = {}) {
  if (!address) return '';
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Shortens a transaction hash for compact display, e.g. `a1b2c3d4…`. */
export function truncateHash(hash, length = 8) {
  if (!hash) return '';
  return `${hash.slice(0, length)}…`;
}

/** Formats an ISO date string as a relative-feeling, locale-aware timestamp. */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export { STROOPS_PER_XLM };
