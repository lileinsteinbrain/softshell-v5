{\rtf1\ansi\ansicpg1252\cocoartf2865
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red155\green162\blue177;}
{\*\expandedcolortbl;;\cssrgb\c67059\c69804\c74902;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f0\fs26 \cf2 import \{ ema, clamp01 \} from '../utils/math.js';\
\
export class InputSampler \{\
  constructor() \{\
    this.events = [];\
    this.emaR = null;\
    this.alpha = 0.3;\
    this.windowMs = 30000;\
    this.textBuffer = [];\
    this.textWindow = 30;\
  \}\
  attach(dom) \{\
    window.addEventListener('keydown', () => this._pushEvent());\
    window.addEventListener('click',   () => this._pushEvent());\
    dom.addEventListener('input', (e) => \{\
      const v = (e.target.value || '');\
      if (!v.length) return;\
      const ch = v.at(-1);\
      this._pushEvent();\
      this._pushChar(ch);\
    \});\
  \}\
  _pushEvent()\{ this.events.push(performance.now()); \}\
  _pushChar(ch)\{\
    this.textBuffer.push(ch);\
    if (this.textBuffer.length > this.textWindow) this.textBuffer.shift();\
  \}\
  sampleRate()\{\
    const now = performance.now();\
    while (this.events.length && (now - this.events[0] > this.windowMs)) this.events.shift();\
    const Rraw = this.events.length * (30000 / this.windowMs);\
    this.emaR = ema(this.emaR, Rraw, this.alpha);\
    const rNorm = clamp01((this.emaR || 0) / 10);\
    return \{ Rraw, rNorm \};\
  \}\
  sampleUncertainty()\{\
    const N = this.textBuffer.length;\
    if (N <= 1) return 0;\
    const freq = \{\};\
    for (const c of this.textBuffer) freq[c] = (freq[c] || 0) + 1;\
    const uniq = Object.keys(freq).length;\
    let H = 0;\
    for (const k in freq) \{ const p = freq[k]/N; H += -p*Math.log2(p); \}\
    const Hmax = Math.log2(uniq);\
    return clamp01(Hmax > 0 ? (H/Hmax) : 0);\
  \}\
\}}