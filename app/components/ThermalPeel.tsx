'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

type Props = { sheetRef: RefObject<HTMLDivElement>; trackRef: RefObject<HTMLElement> };

/** Live hero graphics and hardware, painted onto one reversible GPU-bent sheet. */
export default function ThermalPeel({ sheetRef, trackRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const output = canvasRef.current, sheet = sheetRef.current, track = trackRef.current;
    if (!output || !sheet || !track || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = output.parentElement;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: output, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch { return; }
    const mobile = matchMedia('(max-width: 720px)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.15 : 1.5));
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20);
    camera.position.z = 5;
    const geometry = new THREE.PlaneGeometry(2, 2, 80, 56);
    const paint = document.createElement('canvas');
    const lettering = document.createElement('canvas');
    const context = paint.getContext('2d');
    const letters = lettering.getContext('2d');
    if (!context || !letters) { renderer.dispose(); geometry.dispose(); return; }
    const texture = new THREE.CanvasTexture(paint);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const empty = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType);
    empty.needsUpdate = true;
    let baked: THREE.DataTexture | undefined;
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
      uniforms: { uHero: { value: texture }, uBake: { value: empty }, uBaked: { value: 0 }, uProgress: { value: 0 } },
      vertexShader: `
        uniform sampler2D uBake; uniform float uBaked; uniform float uProgress;
        varying vec2 vUv; varying float vBend; varying float vDepth;
        void main(){
          vUv=uv; float p=clamp(uProgress,0.,1.); float wave=sin(p*3.14159265);
          float diagonal=sin((uv.x*.85+(1.-uv.y)*1.15)*3.14159265+p*1.727875);
          vec3 offset=vec3(
            -.12*p+(uv.x-.5)*wave*.08+diagonal*wave*.055*(.35+.65*(1.-uv.y)),
            p*2.72+pow(1.-uv.y,2.)*wave*.38+diagonal*wave*.06,
            sin((1.-uv.y)*3.14159265)*wave*.8+pow(1.-uv.y,3.)*wave*.33+diagonal*wave*.18+sin(uv.x*3.14159265)*wave*.08);
          if(uBaked>.5){
            float f=p*63.; float f0=floor(f); float f1=min(63.,f0+1.);
            float row=(1.-uv.y)*56.;
            vec2 a=vec2((uv.x*80.+.5)/81.,(f0*57.+row+.5)/3648.);
            vec2 b=vec2(a.x,(f1*57.+row+.5)/3648.);
            offset=mix(texture2D(uBake,a).xyz,texture2D(uBake,b).xyz,fract(f));
          }
          vec3 q=position+offset;
          q.x+=sin(uv.y*3.14)*wave*.045;
          vBend=cos((1.-uv.y)*3.14159265)*wave+diagonal*wave*.12;
          vDepth=offset.z;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);
        }`,
      fragmentShader: `
        uniform sampler2D uHero; uniform float uProgress;
        varying vec2 vUv; varying float vBend; varying float vDepth;
        void main(){
          vec4 c=texture2D(uHero,vUv);
          float p=clamp(uProgress,0.,1.); float wave=sin(p*3.14159265);
          float light=1.-vDepth*.22+vBend*.14;
          vec2 g=abs(fract(vUv*vec2(28.,22.))-.5);
          float grid=1.-smoothstep(.475,.495,max(g.x,g.y));
          float blueprint=smoothstep(.10,.52,p)*.24;
          vec3 schematic=mix(vec3(.10,.18,.14),c.rgb*.72+vec3(.10,.20,.13),.7);
          c.rgb=mix(c.rgb,schematic,blueprint)*light;
          c.rgb+=vec3(.65,.78,.40)*(1.-grid)*blueprint*.19;
          float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
          float rim=(1.-smoothstep(0.,.095,edge))*(0.16+wave*.28);
          float corner=(1.-smoothstep(0.,.22,length(vUv-vec2(.04,.96))))*wave*.13;
          float fold=sin((vUv.x*.85+(1.-vUv.y)*1.15)*3.14159265+p*1.727875);
          c.rgb+=vec3(.70,.82,.48)*(rim+corner+max(fold,0.)*wave*.055);
          c.rgb*=1.-(1.-smoothstep(0.,.18,edge))*.16;
          gl_FragColor=vec4(c.rgb,c.a);
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    let width = 1, height = 1, ratio = 1;
    let modelRect = { x: 0, y: 0, width: 0, height: 0 };
    let source: HTMLCanvasElement | null = null;
    let frame = 0, lastFrame = 0, active = false, disposed = false;
    let worker: Worker | undefined, workerUrl: string | undefined;
    const capture = () => {
      const transform = sheet.style.transform;
      sheet.style.transform = 'none';
      try {
        const origin = sheet.getBoundingClientRect();
        width = origin.width; height = origin.height;
        ratio = Math.min(1.25, 1600 / Math.max(1, width));
        paint.width = lettering.width = Math.max(1, Math.round(width * ratio));
        paint.height = lettering.height = Math.max(1, Math.round(height * ratio));
        letters.clearRect(0, 0, lettering.width, lettering.height);
        const model = sheet.querySelector<HTMLElement>('.model-bay');
        source = sheet.querySelector<HTMLCanvasElement>('.scene-canvas canvas');
        if (model) {
          const rect = model.getBoundingClientRect();
          modelRect = { x: (rect.left-origin.left)*ratio, y: (rect.top-origin.top)*ratio, width: rect.width*ratio, height: rect.height*ratio };
        }
        const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        const range = document.createRange();
        while ((node = walker.nextNode())) {
          const element = node.parentElement;
          if (!element || element.closest('.scene-wrap,.blueprint-drawing')) continue;
          const css = getComputedStyle(element);
          if (css.display === 'none' || css.visibility === 'hidden') continue;
          const value = node.textContent || '';
          const fontSize = parseFloat(css.fontSize);
          if (!fontSize) continue;
          letters.font = `${css.fontStyle} ${css.fontWeight} ${fontSize*ratio}px ${css.fontFamily}`;
          letters.fillStyle = css.color;
          letters.textBaseline = 'alphabetic';
          for (let i=0;i<value.length;i++) {
            if (!value[i].trim()) continue;
            range.setStart(node,i); range.setEnd(node,i+1);
            const rect = range.getBoundingClientRect();
            if (rect.width===0 || rect.height===0) continue;
            letters.fillText(value[i], (rect.left-origin.left)*ratio, (rect.top-origin.top+rect.height*.8)*ratio);
          }
        }
        texture.needsUpdate = true;
      } finally {
        sheet.style.transform = transform;
      }
    };
    const progress = () => {
      const attribute = track.getAttribute('data-motion-progress');
      const synced = attribute == null ? NaN : Number(attribute);
      if (Number.isFinite(synced)) return Math.min(1, Math.max(0, synced));
      const rect = track.getBoundingClientRect();
      return Math.min(1, Math.max(0,-rect.top/Math.max(1,track.offsetHeight-innerHeight)));
    };
    const restore = () => { sheet.style.visibility = ''; output.style.opacity = '0'; active=false; };
    const render = (now: number) => {
      frame = 0;
      if (disposed) return;
      const p = progress();
      if (p<.008 || p>.985) { restore(); return; }
      if (!active) { capture(); active=true; sheet.style.visibility='hidden'; output.style.opacity='1'; }
      if (now-lastFrame>1000/30) {
        lastFrame=now;
        const gradient=context.createLinearGradient(0,0,paint.width,paint.height);
        gradient.addColorStop(0,'#171a13'); gradient.addColorStop(.6,'#11140f'); gradient.addColorStop(1,'#181a13');
        context.fillStyle=gradient; context.fillRect(0,0,paint.width,paint.height);
        context.strokeStyle='rgba(190,209,151,.055)'; context.lineWidth=.6;
        for(let x=0;x<paint.width;x+=84*ratio){context.beginPath();context.moveTo(x,0);context.lineTo(x,paint.height);context.stroke();}
        for(let y=0;y<paint.height;y+=84*ratio){context.beginPath();context.moveTo(0,y);context.lineTo(paint.width,y);context.stroke();}
        if (source) {
          try { context.drawImage(source,modelRect.x,modelRect.y,modelRect.width,modelRect.height); } catch { /* Canvas failure leaves text and schematic intact. */ }
        }
        context.drawImage(lettering,0,0);
        texture.needsUpdate=true;
        material.uniforms.uProgress.value=p;
        renderer.render(scene,camera);
      }
      frame=requestAnimationFrame(render);
    };
    const request = () => { if(!frame) frame=requestAnimationFrame(render); };
    const resize = () => {
      if(active) restore();
      renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);
      request();
    };
    try {
      const code=`self.onmessage=()=>{const cols=81,rows=57,frames=64,data=new Float32Array(cols*rows*frames*4);for(let f=0;f<frames;f++){const p=f/(frames-1),wave=Math.sin(p*Math.PI);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const u=x/80,v=1-y/56,diagonal=Math.sin((u*.85+(1-v)*1.15)*Math.PI+p*1.727875),i=((f*rows+y)*cols+x)*4;data[i]=-.12*p+(u-.5)*wave*.08+diagonal*wave*.055*(.35+.65*(1-v));data[i+1]=p*2.72+Math.pow(1-v,2)*wave*.38+diagonal*wave*.06;data[i+2]=Math.sin((1-v)*Math.PI)*wave*.8+Math.pow(1-v,3)*wave*.33+diagonal*wave*.18+Math.sin(u*Math.PI)*wave*.08;data[i+3]=1;}}self.postMessage(data.buffer,[data.buffer]);};`;
      workerUrl=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      worker=new Worker(workerUrl);
      worker.onmessage=(event:MessageEvent<ArrayBuffer>)=>{
        if(disposed)return;
        baked=new THREE.DataTexture(new Float32Array(event.data),81,3648,THREE.RGBAFormat,THREE.FloatType);
        baked.minFilter=THREE.NearestFilter; baked.magFilter=THREE.NearestFilter; baked.needsUpdate=true;
        material.uniforms.uBake.value=baked; material.uniforms.uBaked.value=1;
      };
      worker.postMessage({bake:true});
    } catch { /* Analytic GPU deformation is the worker-free fallback. */ }
    resize();
    window.addEventListener('scroll',request,{passive:true});
    window.addEventListener('resize',resize,{passive:true});
    const onContextLost=(event: Event)=>{ event.preventDefault(); restore(); disposed=true; cancelAnimationFrame(frame); };
    output.addEventListener('webglcontextlost',onContextLost);
    return()=>{
      disposed=true;cancelAnimationFrame(frame);restore();
      window.removeEventListener('scroll',request);window.removeEventListener('resize',resize);
      output.removeEventListener('webglcontextlost',onContextLost);
      worker?.terminate();if(workerUrl)URL.revokeObjectURL(workerUrl);
      baked?.dispose();empty.dispose();texture.dispose();material.dispose();geometry.dispose();renderer.dispose();
    };
  },[sheetRef,trackRef]);
  return <canvas ref={canvasRef} className="thermal-peel-canvas" aria-hidden="true" style={{position:'absolute',inset:0,zIndex:9,width:'100%',height:'100%',pointerEvents:'none',opacity:0}} />;
}
