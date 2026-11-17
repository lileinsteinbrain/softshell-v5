// src/core/logger.js
export class Logger {
  constructor() {
    this.rows = [];
    // CSV header
    this.header = [
      't_ms','dt_ms','rNorm','U','S','T_hz','events_dt','tag'
    ];
    this.rows.push(this.header.join(','));
    this._t0 = performance.now();
  }

  /** Append one row */
  push({ t, dt, rNorm, U, S, T, events_dt = 0, tag = '' }) {
    const line = [
      Math.round(t),                       // t_ms
      Math.round(dt),                      // dt_ms
      rNorm.toFixed(4),
      U.toFixed(4),
      S.toFixed(4),
      T.toFixed(4),
      events_dt,                           // number of events this frame
      tag
    ].join(',');
    this.rows.push(line);
  }

  /** Clear */
  clear() {
    this.rows.length = 1; // keep the header row
    this._t0 = performance.now();
  }

  /** Trigger a browser download */
  download(filename = `run-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`) {
    const blob = new Blob([this.rows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}