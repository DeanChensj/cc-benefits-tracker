export interface LogHistoryEntry {
  spent: number;
  timestamp: number;
}

export interface LogEntry {
  resolved: boolean;
  timestamp: number; // UNIX epoch milliseconds
  value: number;
  spentProgress?: number;
  progressHistory?: LogHistoryEntry[]; // Sub-array progress increments
  skipped?: boolean;
  [key: string]: unknown; // Extensible signature for future features
}

export const parseLogEntry = (logValue: LogEntry | string | boolean | number | undefined | null): LogEntry | null => {
  if (logValue === undefined || logValue === null || logValue === false) return null;

  // Dynamic Self-Healing Fallback for legacy types
  if (typeof logValue === 'boolean') {
    return {
      resolved: true,
      timestamp: Date.now(),
      value: 0
    };
  }

  if (typeof logValue === 'number') {
    return {
      resolved: true,
      timestamp: Date.now(),
      value: 0,
      spentProgress: logValue
    };
  }

  if (typeof logValue === 'string') {
    const parts = logValue.split('|');
    const timestampSecs = parseInt(parts[0], 10) || 0;
    const savedValue = parseFloat(parts[1] || '0');
    const spentProgress = parts[2] !== undefined ? parseFloat(parts[2]) : undefined;
    return {
      resolved: true,
      timestamp: timestampSecs * 1000,
      value: savedValue,
      spentProgress
    };
  }

  return logValue;
};
