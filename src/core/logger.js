{\rtf1\ansi\ansicpg1252\cocoartf2865
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red155\green162\blue177;}
{\*\expandedcolortbl;;\cssrgb\c67059\c69804\c74902;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f0\fs26 \cf2 export class Logger \{\
  constructor()\{ this.rows=[['t_ms','Rnorm','U','S','T']]; this.t0=performance.now(); \}\
  push(\{Rnorm,U,S,T\})\{\
    const t = Math.round(performance.now()-this.t0);\
    this.rows.push([t, Rnorm.toFixed(4), U.toFixed(4), S.toFixed(4), T.toFixed(4)]);\
  \}\
  clear()\{ this.rows=[['t_ms','Rnorm','U','S','T']]; this.t0=performance.now(); \}\
  download(filename='softshell_v5_day1.csv')\{\
    const csv = this.rows.map(r=>r.join(',')).join('\\n');\
    const blob = new Blob([csv], \{type:'text/csv;charset=utf-8;'\});\
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);\
  \}\
\}}