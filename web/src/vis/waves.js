// web/src/vis/waves.js
// 多频干涉场（Canvas 版，低分辨率缓冲再放大，性能稳）

export class WavesRenderer {
  constructor(canvas){
    this.off = document.createElement('canvas');
    this.offCtx = this.off.getContext('2d', { willReadFrequently: true });
    this.setSize(canvas.width, canvas.height);
  }

  setSize(W, H){
    // 低分辨率采样，再拉伸（提速）
    const w = Math.max(160, Math.floor(W / 6));
    const h = Math.max( 90, Math.floor(H / 6));
    this.off.width  = w;
    this.off.height = h;
    this.w = w; this.h = h;
  }

  // 简单相位噪声（代替 Perlin，足够演示）
  jitter(nx, ny, t){
    return Math.sin(2*Math.PI*(nx*3.13 + ny*2.17 + t*0.31));
  }

  draw(ctx, canvas, state, aux){
    const { T, S } = state;          // 节奏/系统熵（0..1）
    const U = aux?.U || 0;           // 不确定度（0..1）
    const r = aux?.rNorm || 0;       // 输入速率（0..1）
    const t = performance.now() / 1000;

    const w = this.w, h = this.h;
    const img = this.offCtx.createImageData(w, h);
    const data = img.data;

    // 两条主波参数：频差由 r 控制，相位噪声由 U 控制
    const f1 = T;
    const f2 = T + 0.10 * r + 0.02;
    const th1 = 0.0, th2 = Math.PI/3;

    // 对比度/亮度：S 越稳（小），图样越清晰
    const contrast = 0.75 + 0.80 * (1 - S); // 0.75..1.55
    const gain     = 0.60 + 0.30 * (1 - S); // 提一点整体亮度
    const jAmp     = 0.8 * U;               // 相位抖动幅度

    let i = 0;
    for (let y = 0; y < h; y++){
      const ny = (y / h - 0.5) * 2; // -1..1
      for (let x = 0; x < w; x++){
        const nx = (x / w - 0.5) * 2; // -1..1

        // 两个方向的相位投影
        const proj1 = nx*Math.cos(th1) + ny*Math.sin(th1);
        const proj2 = nx*Math.cos(th2) + ny*Math.sin(th2);

        // 相位噪声（随 U 放大）
        const j = jAmp * this.jitter(nx, ny, t);

        // 干涉：两正弦相加
        const v1 = Math.sin(2*Math.PI*(f1*t + proj1) + j);
        const v2 = Math.sin(2*Math.PI*(f2*t + proj2) - j);
        let v = (v1 + v2) * 0.5; // -1..1

        // 对比度/亮度
        v = Math.tanh(v * contrast);         // 压一下过曝
        const g = Math.min(1, Math.max(0, 0.5 + 0.5*v)) * gain;

        // 简单蓝白映射（稳→偏金白也可自己调）
        const R = 180 + 60 * g;              // 180..240
        const G = 190 + 65 * g;              // 190..255
        const B = 220 + 35 * (1 - g);        // 185..220

        data[i++] = R|0;
        data[i++] = G|0;
        data[i++] = B|0;
        data[i++] = 235;                     // alpha
      }
    }

    this.offCtx.putImageData(img, 0, 0);

    // 叠加到主画布：screen 更“发光”
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.85;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.off, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}