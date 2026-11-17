# Softshell v5

## What this is
A browser-based iteration of the Softshell system: a soft, responsive "shell" whose internal state (entropy **S** and tempo **T**) is driven by how a person types, rather than by what they type.

## Input
- Live keystrokes in a text field
- Typing rhythm (rate **R**) and the Shannon entropy of the typed text (uncertainty **U**)
- Recorded sessions can be replayed as input

## Processing
- `core/input.js` samples typing rate and normalised text entropy
- `core/state.js` evolves entropy S and tempo T with inflow, outflow and relaxation terms, plus an idle "inner rhythm" when nobody is typing
- Values are logged continuously for later analysis

## Output
- Real-time canvas visuals (`vis/waves.js`, `vis/folds.js`) whose motion and folding follow S and T
- Downloadable logs and one-click 30-second screen recordings
- Analysis plots in `web/analysis/`

## Findings so far
- High R + high U → S increases (chaotic phase)
- Increasing R + decreasing U → S stabilises
- Mid R/U → S steady, T converges

![System dynamics](web/analysis/System%20Dynamics-%20Entropy%20(S)%20%26%20Tempo%20(T).png)

## Run it
```bash
cd web
npm install
npm run dev
```

## Related
- [softshell-device](https://github.com/lileinsteinbrain/softshell-device): physical FSR + haptic version
