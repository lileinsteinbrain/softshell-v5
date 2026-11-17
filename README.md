# Softshell v5

**A screen-based "living surface" that reacts to *how* you type, not *what* you type. Calm, steady typing smooths it out; fast, chaotic typing makes it ripple and fold.**

Part of the **Softshell** series → see also [softshell-device](https://github.com/lileinsteinbrain/softshell-device) (physical, pressure-based version).

![System dynamics](web/analysis/System%20Dynamics-%20Entropy%20(S)%20%26%20Tempo%20(T).png)

## The idea
Softshell explores interfaces that respond to the *quality* of an interaction over time. Here the input is ordinary typing. The system reads two things, how fast you type and how random the characters are, and folds them into an internal state with its own inertia and resting rhythm. The visuals show that state: a folding surface, an interference pattern and a breathing ring.

## How it works
```
 Typing ──► R  input rate          (keystrokes in the last 6 s)
        └─► U  uncertainty         (Shannon entropy of recent characters)
                    │
   S  system entropy:  dS/dt = k_in·U − k_out·R − k_relax·(S − S0)
   T  tempo: more order → slower and calmer
   + a faint inner rhythm when nobody is typing
                    │
 Visuals: folding height field (folds.js) · wave interference (waves.js) · breathing ring
```
A built-in **replay** mode runs a scripted session (chaotic → steady → balanced), and every run can be logged to CSV and screen-recorded for analysis.

## What I found
- High typing rate + high randomness → entropy rises (chaotic phase)
- Increasing rate with decreasing randomness → entropy stabilises
- Medium on both → entropy steady, tempo converges

## What's in this repo
| Path | What it is |
|---|---|
| `web/` | The app (Vite + Canvas) |
| `web/src/core/` | Input sampling, state model, logging, replay |
| `web/src/vis/` | Visual renderers |
| `web/analysis/` | Logged runs, plots and a recorded demo |
| `src/` | Earlier copy of the core code |

## Run it
```bash
cd web
npm install
npm run dev
```
