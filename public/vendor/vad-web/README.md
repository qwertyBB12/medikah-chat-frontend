# Vendored VAD / onnxruntime-web assets

Committed copies (NOT a postinstall hook) for Netlify build reproducibility.

onnxruntime-web loads, from this path at runtime, BOTH the `.wasm` binary AND its
`.mjs` JS-glue loader (the loader instantiates the wasm and, when threads are
available, is also the pthread worker source via `import.meta.url`). Vendor BOTH —
shipping only the `.wasm` 404s on `ort-wasm-simd-threaded.mjs` and VAD fails to init.

Refresh after a dep upgrade by re-copying from node_modules:

    cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/vendor/vad-web/
    cp node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx     public/vendor/vad-web/
    cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.wasm  public/vendor/vad-web/
    cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.mjs   public/vendor/vad-web/

Consumed by lib/cue/voice/vadListener.ts (baseAssetPath / onnxWASMBasePath /
workletURL / modelURL → /vendor/vad-web/).

NOTE (cleanup TODO): 4 wasm variants are vendored (~76 MB). onnxruntime-web loads
ONE per browser (the console showed `ort-wasm-simd-threaded.wasm` standard). After
HUMAN-UAT confirms the served variant(s) with no 404s, prune the rest (and their
matching `.mjs`).
