// web/src/vis/waves.js
// Multi-frequency interference field (Canvas; low-res buffer scaled up for stable performance)

export class WavesRenderer {
  constructor(canvas){
    this.off = document.createElement('canvas');
    this.offCtx = this.off.getContext('2d', { willReadFrequently: true });
    this.setSize(canvas.width, canvas.height);
  }

  setSize(W, H){
    // Sample at low resolution, then stretch (faster)
    const w = Math.max(160, Math.floor(W / 6));
    const h = Math.max( 90, Math.floor(H / 6));
    this.off.width  = w;
    this.off.height = h;
    this.w = w; this.h = h;
  }

  // Simple phase noise (instead of Perlin; enough for the demo)
  jitter(nx, ny, t){
    return Math.sin(2*Math.PI*(nx*3.13 + ny*2.17 + t*0.31));
  }

  draw(ctx, canvas, state, aux){
    const { T, S } = state;          // tempo / system entropy (0..1)
    const U = aux?.U || 0;           // uncertainty (0..1)
    const r = aux?.rNorm || 0;       // input rate (0..1)
    const t = performance.now() / 1000;

    const w = this.w, h = this.h;
    const img = this.offCtx.createImageData(w, h);
    const data = img.data;

    // Two main waves: frequency offset controlled by r, phase noise by U
    const f1 = T;
    const f2 = T + 0.10 * r + 0.02;
    const th1 = 0.0, th2 = Math.PI/3;

    // Contrast / brightness: the steadier S is (lower), the sharper the pattern
    const contrast = 0.75 + 0.80 * (1 - S); // 0.75..1.55
    const gain     = 0.60 + 0.30 * (1 - S); // lift overall brightness slightly
    const jAmp     = 0.8 * U;               // phase jitter amplitude

    let i = 0;
    for (let y = 0; y < h; y++){
      const ny = (y / h - 0.5) * 2; // -1..1
      for (let x = 0; x < w; x++){
        const nx = (x / w - 0.5) * 2; // -1..1

        // Phase projections in two directions
        const proj1 = nx*Math.cos(th1) + ny*Math.sin(th1);
        const proj2 = nx*Math.cos(th2) + ny*Math.sin(th2);

        // Phase noise (scaled by U)
        const j = jAmp * this.jitter(nx, ny, t);

        // Interference: sum of two sines
        const v1 = Math.sin(2*Math.PI*(f1*t + proj1) + j);
        const v2 = Math.sin(2*Math.PI*(f2*t + proj2) - j);
        let v = (v1 + v2) * 0.5; // -1..1

        // Contrast / brightness
        v = Math.tanh(v * contrast);         // soft-clip to avoid overexposure
        const g = Math.min(1, Math.max(0, 0.5 + 0.5*v)) * gain;

        // Simple blue-white mapping (can be shifted toward gold-white for stable states)
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

    // Composite onto the main canvas: "screen" blend for a glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.85;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.off, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}