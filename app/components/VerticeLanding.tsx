'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Hero3D from './Hero3D';
import { ChatPanel } from './HvacSlideDeck';
import ThermalPeel from './ThermalPeel';
import ClimateMotion from './ClimateMotion';

function TapeLetters({ text }: { text: string }) {
  return <span className="tape-letter-row" aria-label={text}>{Array.from(text).map((letter, index) => (
    <span className="tape-letter" aria-hidden="true" key={`${letter}-${index}`} style={{ transitionDelay: `${index * 34}ms` }}>{letter === ' ' ? '\u00a0' : letter}</span>
  ))}</span>;
}

function EfficiencyUnit() {
  return (
    <div className="efficiency-unit" aria-label="Illustration of a high-efficiency commercial HVAC unit">
      <Hero3D finish="white" />
      <span className="unit-airflow airflow-one" /><span className="unit-airflow airflow-two" /><span className="unit-airflow airflow-three" />
    </div>
  );
}

export default function VerticeLanding() {
  const [chatOpen, setChatOpen] = useState(false);
  const [autoFlip, setAutoFlip] = useState(true);
  const [showComfortUnit, setShowComfortUnit] = useState(false);
  const [unitReady, setUnitReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadPercent, setLoadPercent] = useState(0);
  const trackRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const thermalRef = useRef<HTMLCanvasElement>(null);
  const finishStarted = useRef(false);
  const animationFrame = useRef(0);

  useEffect(() => {
    const fallback = window.setTimeout(() => setUnitReady(true), 8000);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    let disposed = false;
    let progress = 0;
    let targetProgress = 0;
    let lastTime = 0;
    let comfortVisible = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let worker: Worker | undefined;
    let workerUrl: string | undefined;
    const canvas = thermalRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    const workerCode = `self.onmessage = (event) => { const p = Math.max(0, Math.min(1, event.data.progress || 0)); const width = 72, height = 50; const values = new Float32Array(width * height); for (let y = 0; y < height; y++) { for (let x = 0; x < width; x++) { const nx = x / (width - 1), ny = y / (height - 1); const coreX = 0.18 + p * 0.64, coreY = 0.53 + Math.sin(p * Math.PI * 2) * 0.08; const dx = nx - coreX, dy = ny - coreY; const core = Math.exp(-(dx * dx / 0.052 + dy * dy / 0.19)); const wave = Math.sin((nx * 7.4 + ny * 5.7 - p * 11.0) * Math.PI) * 0.12; const flow = Math.exp(-Math.pow((ny - (0.34 + nx * 0.23 + Math.sin((nx + p) * 8) * 0.04)) * 10, 2)) * 0.18; values[y * width + x] = Math.max(0, Math.min(1, 0.1 + core * 0.65 + flow + wave)); } } self.postMessage({ width, height, buffer: values.buffer }, [values.buffer]); };`;
    try {
      workerUrl = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
      worker.onmessage = (event: MessageEvent<{ width: number; height: number; buffer: ArrayBuffer }>) => {
        if (!context || !canvas || disposed) return;
        const { width, height, buffer } = event.data;
        const values = new Float32Array(buffer);
        const image = context.createImageData(width, height);
        for (let index = 0; index < values.length; index += 1) {
          const value = values[index];
          const blend = value < 0.52 ? value / 0.52 : (value - 0.52) / 0.48;
          const start = value < 0.52 ? [102, 179, 203] : [198, 235, 89];
          const end = value < 0.52 ? [198, 235, 89] : [247, 151, 108];
          const offset = index * 4;
          image.data[offset] = Math.round(start[0] + (end[0] - start[0]) * blend);
          image.data[offset + 1] = Math.round(start[1] + (end[1] - start[1]) * blend);
          image.data[offset + 2] = Math.round(start[2] + (end[2] - start[2]) * blend);
          image.data[offset + 3] = Math.round(18 + value * 56);
        }
        canvas.width = width;
        canvas.height = height;
        context.putImageData(image, 0, 0);
      };
    } catch {
      // The blueprint grid and hardware remain usable if workers are unavailable.
      worker = undefined;
    }

    const updateStage = (now: number) => {
      animationFrame.current = 0;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      targetProgress = Math.min(1, Math.max(0, -rect.top / travel));
      const delta = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      const next = motionQuery.matches ? targetProgress : progress + (targetProgress - progress) * (1 - Math.exp(-delta * 13));
      const settled = Math.abs(next - targetProgress) < 0.00015;
      progress = settled ? targetProgress : next;
      track.dataset.motionProgress = progress.toFixed(5);
      track.style.setProperty('--thermal-progress', String(progress));
      track.style.setProperty('--thermal-arc', `${progress * 28}deg`);
      const sheet = sheetRef.current;
      if (sheet) {
        const x = -7 * next;
        const y = -112 * next;
        const rotate = -10 * next;
        const scale = 1 - next * 0.07;
        sheet.style.transform = `translate3d(${x}vw, ${y}vh, 0) rotateX(${rotate}deg) scale(${scale})`;
        sheet.style.opacity = String(Math.max(0, 1 - Math.max(0, next - 0.72) * 3.6));
      }
      if (revealRef.current) {
        revealRef.current.style.opacity = String(Math.min(1, Math.max(0, (next - 0.12) / 0.78)));
        revealRef.current.style.transform = `translate3d(0, calc(-50% + ${(1 - next) * 52}px), 0)`;
      }
      if (unitRef.current) {
        const unitProgress = Math.min(1, Math.max(0, (next - 0.24) / 0.66));
        const easedUnit = 1 - Math.pow(1 - unitProgress, 3);
        unitRef.current.style.opacity = String(unitProgress);
        unitRef.current.style.transform = motionQuery.matches ? 'none' : `perspective(1100px) translate3d(${(1 - easedUnit) * 110}px, ${(1 - easedUnit) * 52}px, 0) rotateY(${(1 - easedUnit) * -22}deg) rotateZ(${(1 - easedUnit) * 5}deg) scale(${0.76 + easedUnit * 0.24})`;
      }
      if (worker && Math.abs(next - Number(track.dataset.workerProgress || '-2')) > 0.008) {
        track.dataset.workerProgress = String(next);
        worker.postMessage({ progress: next });
      }
      track.dataset.revealed = next > 0.18 ? 'true' : 'false';
      const shouldShowComfort = next > 0.18 && rect.bottom > 0;
      if (comfortVisible !== shouldShowComfort) {
        comfortVisible = shouldShowComfort;
        setShowComfortUnit(shouldShowComfort);
      }
      const underlay = track.querySelector('.thermal-underlay');
      if (underlay instanceof HTMLElement) {
        const hidden = next <= 0.18;
        underlay.inert = hidden;
        underlay.setAttribute('aria-hidden', String(hidden));
      }
      if (!settled && !disposed) animationFrame.current = window.requestAnimationFrame(updateStage);
    };
    const requestStageUpdate = () => {
      if (!animationFrame.current) animationFrame.current = window.requestAnimationFrame(updateStage);
    };
    window.addEventListener('scroll', requestStageUpdate, { passive: true });
    window.addEventListener('resize', requestStageUpdate, { passive: true });
    requestStageUpdate();

    return () => {
      disposed = true;
      window.removeEventListener('scroll', requestStageUpdate);
      window.removeEventListener('resize', requestStageUpdate);
      if (animationFrame.current) window.cancelAnimationFrame(animationFrame.current);
      worker?.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    };
  }, []);

  useEffect(() => {
    let timeout = 0;
    let observer: PerformanceObserver | undefined;
    let disposed = false;
    const measureLoad = () => {
      if (disposed || finishStarted.current) return;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const completedResources = resources.filter((entry) => entry.responseEnd > 0).length;
      const images = Array.from(document.images);
      const completedImages = images.filter((image) => image.complete).length;
      const tasks = Math.max(1, resources.length + images.length + 2);
      const finished = completedResources + completedImages + (document.readyState === 'complete' ? 1 : 0) + (unitReady ? 1 : 0);
      setLoadPercent(Math.min(99, Math.floor((finished / tasks) * 100)));
      const fontsReady = !('fonts' in document) || document.fonts.status === 'loaded';
      if (document.readyState === 'complete' && fontsReady && images.every((image) => image.complete) && unitReady && !finishStarted.current) {
        finishStarted.current = true;
        setLoadPercent(100);
        timeout = window.setTimeout(() => { if (!disposed) setLoading(false); }, 420);
      }
    };
    window.addEventListener('load', measureLoad);
    if ('fonts' in document) void document.fonts.ready.then(measureLoad).catch(() => undefined);
    try {
      observer = new PerformanceObserver(measureLoad);
      observer.observe({ type: 'resource', buffered: true });
    } catch { observer = undefined; }
    measureLoad();
    return () => {
      disposed = true;
      window.removeEventListener('load', measureLoad);
      observer?.disconnect();
      window.clearTimeout(timeout);
    };
  }, [unitReady]);

  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('demo') !== '1') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    let hold: number | undefined;
    let cancelled = false;
    const stopDemo = () => { cancelled = true; window.cancelAnimationFrame(frame); if (hold) window.clearTimeout(hold); };
    window.addEventListener('wheel', stopDemo, { passive: true });
    window.addEventListener('touchstart', stopDemo, { passive: true });
    window.addEventListener('pointerdown', stopDemo, { passive: true });
    window.addEventListener('keydown', stopDemo);
    const kickoff = window.setTimeout(() => {
      if (cancelled) return;
      const rect = track.getBoundingClientRect();
      const startY = window.scrollY + rect.top;
      const distance = Math.max(0, track.offsetHeight - window.innerHeight);
      const start = performance.now();
      const duration = 14500;
      const play = (now: number) => {
        if (cancelled) return;
        const raw = Math.min(1, (now - start) / duration);
        const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        window.scrollTo({ top: startY + distance * eased, behavior: 'auto' });
        if (raw < 1) frame = window.requestAnimationFrame(play);
        else hold = window.setTimeout(() => {
          const nextRect = track.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + nextRect.bottom - window.innerHeight + window.innerHeight * 0.62, behavior: 'smooth' });
        }, 1500);
      };
      frame = window.requestAnimationFrame(play);
    }, 900);
    return () => {
      stopDemo();
      window.removeEventListener('wheel', stopDemo);
      window.removeEventListener('touchstart', stopDemo);
      window.removeEventListener('pointerdown', stopDemo);
      window.removeEventListener('keydown', stopDemo);
      window.clearTimeout(kickoff);
      window.cancelAnimationFrame(frame);
      if (hold) window.clearTimeout(hold);
    };
  }, [loading]);

  useEffect(() => {
    if (loading || !autoFlip || new URLSearchParams(window.location.search).get('demo') === '1') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.hash || window.scrollY > 50) {
      setAutoFlip(false);
      return undefined;
    }
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    let kickoff = 0;
    let cancelled = false;
    const stopForInput = (event?: Event) => {
      cancelled = true;
      window.clearTimeout(kickoff);
      window.cancelAnimationFrame(frame);
      setAutoFlip(false);
    };
    const play = () => {
      if (cancelled) return;
      const rect = track.getBoundingClientRect();
      const startY = window.scrollY + rect.top;
      const distance = Math.max(0, track.offsetHeight - window.innerHeight) * 0.96;
      const start = performance.now();
      const duration = 7600;
      const animate = (now: number) => {
        if (cancelled) return;
        const raw = Math.min(1, (now - start) / duration);
        const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        window.scrollTo({ top: startY + distance * eased, behavior: 'auto' });
        if (raw < 1) frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    };
    window.addEventListener('wheel', stopForInput, { passive: true });
    window.addEventListener('touchstart', stopForInput, { passive: true });
    window.addEventListener('pointerdown', stopForInput, { passive: true });
    window.addEventListener('keydown', stopForInput);
    window.addEventListener('resize', stopForInput);
    kickoff = window.setTimeout(play, 3600);
    return () => {
      cancelled = true;
      window.clearTimeout(kickoff);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stopForInput);
      window.removeEventListener('touchstart', stopForInput);
      window.removeEventListener('pointerdown', stopForInput);
      window.removeEventListener('keydown', stopForInput);
      window.removeEventListener('resize', stopForInput);
    };
  }, [loading, autoFlip]);

  const openChat = () => setChatOpen(true);
  const explore = () => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top + track.offsetHeight - window.innerHeight, behavior: 'smooth' });
  };
  const unitStyle: CSSProperties = { '--load-progress': `${loadPercent}%` } as CSSProperties;

  return (
    <div className="vertice-site" id="top" style={unitStyle}>
      <ClimateMotion ready={!loading} />
      {loading && (
          <div className={`thermal-preloader ${loadPercent === 100 ? 'is-complete' : ''}`} role="status" aria-live="polite" aria-label={`Loading VERTICE THERMAL, ${loadPercent} percent`}>
          <div className="loader-brand">VERTICE <span>THERMAL</span></div>
          <div className="loader-star-stack" aria-hidden="true"><span className="loader-star-ink">✳</span><span className="loader-star-light">✳</span></div>
          <div className="loader-readout"><span>CALIBRATING CLIMATE SYSTEM</span><strong>{String(loadPercent).padStart(2, '0')}<i>%</i></strong></div>
          <div className="loader-track"><span /></div>
          <span className="loader-footnote">LIVE INITIALIZATION / WEBGL UNIT</span>
        </div>
      )}

      <a className="thermal-skip" href="#services">Skip to services</a>
      <main id="main-content">
        <section className="thermal-track" ref={trackRef} aria-label="Precision Climate product introduction">
          <div className="thermal-pin">
            <div className="thermal-underlay" aria-hidden="true">
              <div className="underlay-orbit orbit-a" /><div className="underlay-orbit orbit-b" />
              <div className="underlay-copy" ref={revealRef}>
                <p className="underlay-kicker"><span className="status-pulse" /> COMFORT, IN GOOD HANDS</p>
                <div className="tape-piece tape-piece-top"><TapeLetters text="We Cool" /></div>
                <div className="tape-piece tape-piece-bottom"><TapeLetters text="human comfort" /></div>
                <p className="underlay-note">Considered installation. Dependable seasonal care. Comfort that feels like it belongs.</p>
                <button className="maintenance-button" type="button" onClick={openChat} onPointerMove={(event) => { if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.transform = `translate(${(event.clientX-r.left-r.width/2)*.15}px, ${(event.clientY-r.top-r.height/2)*.2}px)`; }} onPointerLeave={(event) => { event.currentTarget.style.transform = ''; }}><span>Book maintenance</span><i aria-hidden="true">↗</i></button>
                <span className="underlay-star" aria-hidden="true">✳</span>
              </div>
              <div className="underlay-serial">VT / 01 — CLIMATE, CONSIDERED</div>
              <div className="underlay-unit" ref={unitRef}>{showComfortUnit && <EfficiencyUnit />}</div>
              <span className="underlay-side-note">HIGH-EFFICIENCY / INVERTER-LED</span>
            </div>

            <div className="thermal-sheet" ref={sheetRef}>
              <div className="sheet-grain" aria-hidden="true" />
              <div className="blueprint-grid" aria-hidden="true" />
              <canvas className="thermal-simulation" ref={thermalRef} aria-hidden="true" />
              <svg className="blueprint-drawing" viewBox="0 0 1200 780" fill="none" aria-hidden="true">
                <path d="M624 193h267v342H624zM666 225h183v234H666zM740 193v-62h78v62M891 252h97v228h-97M603 574h410M565 535v-45h57m269-73h84m-358 47h47m64-152h-45v-46" />
                <circle cx="759" cy="343" r="66" /><circle cx="759" cy="343" r="20" />
                <path d="M759 276v134m-67-67h134m-114-47 94 94m0-94-94 94M181 610h303M211 581v58m48-58v58m48-58v58m48-58v58m48-58v58m48-58v58" />
                <path className="blueprint-path" d="M455 602c48-7 73-27 92-71 17-39 27-96 77-129 31-20 70-26 112-37" />
              </svg>
              <div className="sheet-header">
                <a className="thermal-wordmark" href="#top" aria-label="VERTICE THERMAL home"><span className="wordmark-star">✳</span><b>VERTICE</b><span>THERMAL</span></a>
                <nav className="sheet-nav" aria-label="Main navigation"><a href="#approach">Our approach</a><a href="#services">Services</a><a href="#contact">Contact</a></nav>
                <button className="sheet-contact" type="button" onClick={openChat}>Talk with Elena <span aria-hidden="true">↗</span></button>
              </div>
              <div className="sheet-meta"><span>CLIMATE SYSTEMS <i> / </i> 2026</span><span>01 — ENGINEERED WITH INTENT</span></div>
              <div className="hero-copy">
                <p className="hero-kicker"><span className="kicker-line" /> HEATING · COOLING · CARE</p>
                <h1>Precision<br /><em>Climate.</em></h1>
                <p className="hero-description">Thoughtful heating and cooling, considered from the first site visit to the seasons ahead.</p>
                <button className="hero-explore" type="button" onClick={explore}><span>Explore the system</span><i aria-hidden="true">↓</i></button>
              </div>
              <div className="model-bay" aria-label="Interactive three-dimensional commercial HVAC condenser. Drag to turn the unit.">
                <div className="model-bay-glow" aria-hidden="true" />
                <Hero3D onReady={() => setUnitReady(true)} />
                <span className="drag-cue"><i aria-hidden="true">↔</i> DRAG TO ROTATE</span>
              </div>
              <div className="sheet-spec"><span><b>01</b> INVERTER-LED</span><span><b>02</b> QUIET AIRFLOW</span><span><b>03</b> SERVICEABLE BY DESIGN</span></div>
              <div className="sheet-scroll-cue"><span>SCROLL TO UNFOLD</span><i aria-hidden="true">↓</i><b /></div>
              <div className="sheet-side-code">THERMAL STUDY / 26—VT</div>
            </div>
            {!loading && <ThermalPeel sheetRef={sheetRef} trackRef={trackRef} />}
          </div>
        </section>

        <section className="approach-section" id="approach">
          <div className="section-heading"><span className="section-index">01 / OUR APPROACH</span><span className="section-rule" /></div>
          <div className="approach-grid"><h2>Engineering you<br /><em>feel, not hear.</em></h2><div className="approach-copy"><p>Every part of a comfortable home works together: steady output, clean airflow and equipment that stays understandable and serviceable over time.</p><a href="#services" className="text-link">A closer look <span aria-hidden="true">↗</span></a></div></div>
          <div className="approach-foot"><span>DESIGNED AROUND THE HOME</span><span>01 — 03</span><span>VERTICE THERMAL</span></div>
        </section>

        <section className="services-section" id="services">
          <div className="section-heading"><span className="section-index">02 / SERVICES</span><span className="section-rule" /><span className="section-caption">THE RIGHT CARE, AT EACH STEP</span></div>
          <div className="services-heading"><h2>Comfort, considered.</h2><p>Clear guidance and careful work—from understanding the space to looking after the system.</p></div>
          <div className="service-cards">
            <article className="service-card"><span className="service-number">01</span><div className="service-icon icon-survey" aria-hidden="true"><i /><i /><i /></div><h3>Survey & sizing</h3><p>Understand the home, the existing equipment and the comfort you want from a new system.</p><span className="service-tag">LISTEN · ASSESS · PLAN</span></article>
            <article className="service-card"><span className="service-number">02</span><div className="service-icon icon-install" aria-hidden="true"><i /><i /><i /></div><h3>Installation</h3><p>Plan around access, airflow, controls and the character of the property.</p><span className="service-tag">FIT · COMMISSION · EXPLAIN</span></article>
            <article className="service-card"><span className="service-number">03</span><div className="service-icon icon-care" aria-hidden="true"><i /><i /><i /></div><h3>Service & aftercare</h3><p>Keep the system understandable, maintainable and supported beyond handover.</p><span className="service-tag">CHECK · MAINTAIN · SUPPORT</span></article>
          </div>
          <p className="service-disclaimer">Equipment selection and performance depend on the property, the local climate and a proper site assessment.</p>
        </section>

        <section className="contact-section" id="contact"><div className="contact-asterisk" aria-hidden="true">✳</div><span className="section-index">03 / START A CONVERSATION</span><h2>Let’s start with<br /><em>your comfort.</em></h2><p>Tell Elena what you need and we’ll help coordinate the next step.</p><button className="contact-primary" type="button" onClick={openChat}>Talk with Elena <span aria-hidden="true">↗</span></button><footer className="site-footer"><a className="footer-brand" href="#top">VERTICE THERMAL<span> / CLIMATE SYSTEMS</span></a><span>ENGINEERED WITH INTENT</span><span>© 2026 VERTICE THERMAL</span></footer></section>
      </main>

      <button className="chat-launcher" type="button" onClick={() => setChatOpen((open) => !open)} aria-label={chatOpen ? 'Close chat with Elena' : 'Open chat with Elena'} aria-expanded={chatOpen} aria-controls="vertice-chat-panel">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.75L4 20l1.25-4.05A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 11.5h.01M12.25 11.5h.01M16.5 11.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
        <span>{chatOpen ? 'Close chat' : 'Chat with Elena'}</span><i aria-hidden="true" />
      </button>
      <div id="vertice-chat-panel"><ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} /></div>
    </div>
  );
}
