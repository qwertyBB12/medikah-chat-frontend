# Vendored VAD / onnxruntime-web assets

Committed copies (NOT a postinstall hook) for Netlify build reproducibility.
Refresh after a dep upgrade by re-copying from node_modules:

    cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/vendor/vad-web/
    cp node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx     public/vendor/vad-web/
    cp node_modules/onnxruntime-web/dist/ort-*.wasm                    public/vendor/vad-web/

Consumed by lib/cue/voice/vadListener.ts (baseAssetPath / onnxWASMBasePath /
workletURL / modelURL → /vendor/vad-web/).
