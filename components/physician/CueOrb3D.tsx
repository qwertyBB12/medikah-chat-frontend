'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as BGU from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { OrbState } from '../../lib/cue/stateMachine';
import { orbVisualState, type OrbVisual } from '../../lib/cue/voice/orbVisualState';

const STATES: Record<OrbVisual, { sp: number; amp: number; wid: number; bloom: number; rot: number }> = {
  ready:        { sp: 0.11, amp: 1.0,  wid: 0.040, bloom: 1.0,  rot: 0.18 },
  listening:    { sp: 0.17, amp: 1.2,  wid: 0.045, bloom: 1.12, rot: 0.26 },
  thinking:     { sp: 0.30, amp: 1.45, wid: 0.050, bloom: 1.15, rot: 0.40 },
  speaking:     { sp: 0.22, amp: 1.30, wid: 0.047, bloom: 1.20, rot: 0.30 },
  intercepting: { sp: 0.30, amp: 1.50, wid: 0.052, bloom: 1.25, rot: 0.40 },
};

export interface CueOrb3DProps {
  state: OrbState;
  /** Pause motion (e.g. while the text box is focused). */
  paused?: boolean;
}

export default function CueOrb3D({ state, paused = false }: CueOrb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const applyRef = useRef<(v: OrbVisual) => void>(() => {});
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // One-time WebGL setup (mount → unmount).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 3.55);

    // Dark medallion field (canvas texture) so the white stone reads + teal can bloom.
    (function paintBackground() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d')!;
      const lg = g.createLinearGradient(0, 0, 0, 256);
      lg.addColorStop(0, '#22344e'); lg.addColorStop(0.42, '#1b2a41'); lg.addColorStop(1, '#0e1726');
      g.fillStyle = lg; g.fillRect(0, 0, 256, 256);
      const rg = g.createRadialGradient(128, 72, 8, 128, 82, 116);
      rg.addColorStop(0, 'rgba(6,11,20,.82)'); rg.addColorStop(0.55, 'rgba(6,11,20,.30)'); rg.addColorStop(1, 'rgba(6,11,20,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
    })();

    scene.add(new THREE.AmbientLight(0x33414f, 0.30));
    const key = new THREE.DirectionalLight(0xdfe7ec, 1.5); key.position.set(5, 3, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0x33495c, 0.28); fill.position.set(-6, -2, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x6fb3c0, 0.8); rim.position.set(-5, 4, -4); scene.add(rim);

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x3c4c66, metalness: 0.0, roughness: 0.95,
      emissive: 0x0a2230, emissiveIntensity: 0.15, flatShading: true, side: THREE.DoubleSide,
    });

    const tU = {
      uTime: { value: 0 }, uSpeed: { value: 0.12 }, uWidth: { value: 0.04 }, uAmp: { value: 1.0 },
      uBaseLine: { value: 0.15 }, uBootT: { value: -1.0 },
      uColA: { value: new THREE.Color('#1f95ab') }, uColB: { value: new THREE.Color('#56cfe6') },
    };
    const traceMat = new THREE.ShaderMaterial({
      uniforms: tU, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeq; varying float vT; varying float vSeq;
        void main(){ vT=uv.x; vSeq=aSeq; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime,uSpeed,uWidth,uAmp,uBaseLine,uBootT; uniform vec3 uColA,uColB;
        varying float vT; varying float vSeq;
        void main(){
          float phase=fract(vT - uTime*uSpeed + vSeq*0.55);
          float head=pow(smoothstep(uWidth,0.0,phase),0.6);
          float tail=0.5*smoothstep(uWidth*12.0,0.0,phase);
          float boot=0.0;
          if(uBootT>=0.0){ float f=uBootT - vSeq; boot=0.9*smoothstep(0.0,0.05,f)*smoothstep(0.16,0.03,f); }
          float b=uBaseLine + (head+tail)*uAmp + boot;
          vec3 col=mix(uColA,uColB,clamp(b,0.0,1.0));
          gl_FragColor=vec4(col*clamp(b,0.0,1.1), 1.0);
        }`,
    });

    const group = new THREE.Group(); scene.add(group);
    const DEPTH = 90, FRONT_EPS = 7, TUBE_R = 2.7;

    const loadFlow = () => new Promise<{ d: Uint8ClampedArray; w: number; h: number }>((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
        res({ d: g.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height });
      };
      img.src = '/cue/orb/flow-field.png';
    });
    const loadSVG = () => new Promise<any>((res) => new SVGLoader().load('/cue/orb/codex-paths.svg', res));

    let disposed = false;
    Promise.all([loadFlow(), loadSVG(), fetch('/cue/orb/trace-data.json').then((r) => r.json())])
      .then(([flow, svg, td]: [any, any, any]) => {
        if (disposed) return;
        const sample = (x: number, y: number) => {
          const xi = Math.min(flow.w - 1, Math.max(0, Math.round(x)));
          const yi = Math.min(flow.h - 1, Math.max(0, Math.round(y)));
          return flow.d[(yi * flow.w + xi) * 4] / 255;
        };
        const geos: THREE.ExtrudeGeometry[] = [];
        svg.paths.forEach((p: any) => SVGLoader.createShapes(p).forEach((sh: any) => geos.push(
          new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: true, bevelThickness: 5, bevelSize: 3.5, bevelSegments: 2, curveSegments: 6 }),
        )));
        const sg = BGU.mergeGeometries(geos, false)!;
        sg.computeBoundingBox(); const c = sg.boundingBox!.getCenter(new THREE.Vector3());
        sg.translate(-c.x, -c.y, -c.z); sg.computeBoundingBox(); sg.computeVertexNormals();
        const bb = sg.boundingBox!; const s = 0.62 / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
        const slab = new THREE.Mesh(sg, slabMat); slab.scale.set(s, -s, s); group.add(slab);

        const frontZ = DEPTH - c.z + FRONT_EPS; const tubeGeos: THREE.TubeGeometry[] = [];
        td.current.forEach((cw: any) => {
          let pts = cw.pts; if (pts.length < 2) return;
          if (sample(pts[0][0], pts[0][1]) > sample(pts[pts.length - 1][0], pts[pts.length - 1][1])) pts = pts.slice().reverse();
          const seq = sample(pts[Math.floor(pts.length / 2)][0], pts[Math.floor(pts.length / 2)][1]);
          const v = pts.map((p: number[]) => new THREE.Vector3(p[0] - c.x, p[1] - c.y, frontZ));
          const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), Math.max(6, pts.length * 2), TUBE_R, 5, false);
          tg.setAttribute('aSeq', new THREE.BufferAttribute(new Float32Array(tg.attributes.position.count).fill(seq), 1));
          tubeGeos.push(tg);
        });
        const traces = new THREE.Mesh(BGU.mergeGeometries(tubeGeos, false)!, traceMat);
        traces.scale.set(s, -s, s); group.add(traces);
      });

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(760, 620), 0.95, 0.42, 0.74);
    composer.addPass(bloom);

    const sizeTo = () => {
      const w = cv.clientWidth || 760, h = cv.clientHeight || 620;
      renderer.setSize(w, h, false); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      group.position.y = halfH * (1 - (2 * 175) / h);
    };
    window.addEventListener('resize', sizeTo); sizeTo();

    let rotAmp = STATES.ready.rot, bootStart = -10, vt = 0;
    const applyState = (v: OrbVisual) => {
      const s = STATES[v] ?? STATES.ready;
      tU.uSpeed.value = s.sp; tU.uAmp.value = s.amp; tU.uWidth.value = s.wid; bloom.strength = s.bloom; rotAmp = s.rot;
    };
    applyRef.current = applyState;
    // Boot pulse on mount (mirrors cue-stage.html open()).
    bootStart = vt; applyState(STATES.thinking ? 'thinking' : 'ready');
    const bootTimer = window.setTimeout(() => applyState(orbVisualState(state)), 1700);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const dt = clock.getDelta(); if (!pausedRef.current) vt += dt;
      tU.uTime.value = vt;
      if (reduceMotion) {
        tU.uBootT.value = -1.0; tU.uSpeed.value = 0; group.rotation.set(0, 0.10, 0); group.scale.setScalar(1);
        composer.render(); return; // one calm lit frame; no rAF loop
      }
      const bt = vt - bootStart; tU.uBootT.value = bt >= 0 && bt < 1.7 ? (bt / 1.7) * 1.45 : -1.0;
      group.rotation.y = 0.16 + Math.sin(vt * 0.3) * rotAmp;
      group.rotation.x = Math.sin(vt * 0.22) * 0.09 - 0.02;
      group.scale.setScalar(1 + Math.sin(vt * 0.7) * 0.012);
      composer.render(); raf = requestAnimationFrame(tick);
    };
    applyState(orbVisualState(state)); raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.clearTimeout(bootTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sizeTo);
      composer.dispose(); renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // React to state changes without rebuilding the scene.
  useEffect(() => { applyRef.current(orbVisualState(state)); }, [state]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, display: 'block' }} />;
}
