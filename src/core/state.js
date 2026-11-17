{\rtf1\ansi\ansicpg1252\cocoartf2865
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red155\green162\blue177;}
{\*\expandedcolortbl;;\cssrgb\c67059\c69804\c74902;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f0\fs26 \cf2 import \{ clamp01, lerp \} from '../utils/math.js';\
\
export class SystemState \{\
  constructor()\{\
    this.S = 0.5; this.T = 1.0; this.S0 = 0.5;\
    this.k_in=0.8; this.k_out=0.7; this.k_relax=0.3;\
    this.Tmin=0.6; this.Tmax=2.0; this.gamma=0.15;\
    this.dt = 1/60;\
  \}\
  step(r, U)\{\
    const dS = this.k_in*U - this.k_out*r - this.k_relax*(this.S - this.S0);\
    this.S = clamp01(this.S + this.dt * dS);\
    const Tstar = lerp(this.Tmin, this.Tmax, 1 - this.S);\
    this.T = Math.max(this.Tmin, Math.min(this.Tmax, this.T + this.gamma*(Tstar - this.T)));\
    return \{ S:this.S, T:this.T \};\
  \}\
\}}