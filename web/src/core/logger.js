// src/core/logger.js
export class Logger {
  constructor() {
    this.rows = [];
    // CSV 表头
    this.header = [
      't_ms','dt_ms','rNorm','U','S','T_hz','events_dt','tag'
    ];
    this.rows.push(this.header.join(','));
    this._t0 = performance.now();
  }

  /** 追加一行 */
  push({ t, dt, rNorm, U, S, T, events_dt = 0, tag = '' }) {
    const line = [
      Math.round(t),                       // t_ms
      Math.round(dt),                      // dt_ms
      rNorm.toFixed(4),
      U.toFixed(4),
      S.toFixed(4),
      T.toFixed(4),
      events_dt,                           // 本帧事件数
      tag
    ].join(',');
    this.rows.push(line);
  }

  /** 清空 */
  clear() {
    this.rows.length = 1; // 保留表头
    this._t0 = performance.now();
  }

  /** 触发浏览器下载 */
  download(filename = `run-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`) {
    const blob = new Blob([this.rows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}