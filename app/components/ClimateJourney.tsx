'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Snowflake, Flame, Wind, X, Pause, Play } from 'lucide-react';
import { gsap } from 'gsap';
import FlipChapter from './FlipChapter';
import './climate.css';

const worlds = [
  {
    name: 'Cooling', title: 'COOLING', image: '/climates/cooling.jpg', color: '#ccdddf',
    eyebrow: 'A LITTLE ESCAPE FROM THE HEAT',
    description: 'The world outside can turn up the heat. Inside, find your own kind of cool.',
    facts: [['YOUR SYSTEM', 'Air conditioning'], ['THE FEELING', 'Cool & consistent'], ['OUR APPROACH', 'Sized for your home'], ['FIRST STEP', 'An on-site assessment']],
    icon: Snowflake,
  },
  {
    name: 'Heating', title: 'HEATING', image: '/climates/spring.jpg', color: '#e6e9cf',
    eyebrow: 'A WARMER WAY TO FEEL AT HOME',
    description: 'Soft sunlight. Balanced warmth. Quiet comfort that feels completely natural.',
    facts: [['YOUR SYSTEM', 'Heat-pump heating'], ['THE FEELING', 'Warm & welcoming'], ['OUR APPROACH', 'Property-led design'], ['FIRST STEP', 'A clear service plan']],
    icon: Flame,
  },
  {
    name: 'Clean air', title: 'CLEAN AIR', image: '/climates/air.jpg', color: '#e5ece1',
    eyebrow: 'MAKE ROOM FOR A FRESHER FEELING',
    description: 'A quieter moment. A fresher space. Airflow considered as carefully as everything else.',
    facts: [['YOUR SYSTEM', 'Indoor air quality'], ['THE FEELING', 'Fresh & balanced'], ['OUR APPROACH', 'Airflow & filtration'], ['FIRST STEP', 'A home evaluation']],
    icon: Wind,
  },
];

function Brand({ className = '' }: { className?: string }) {
  return <span className={`climate-brand ${className}`}><span className="climate-monogram" aria-hidden="true">V</span><span>PRINCE<small>HVAC</small></span></span>;
}

/* A procedural cloud passage: no tracking, video service, or external runtime. */
function CloudFlight({ active, color }: { active: boolean; color: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext('2d');
    if (!ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    node.width = width * ratio;
    node.height = height * ratio;
    ctx.scale(ratio, ratio);
    const start = performance.now();
    const clouds = Array.from({ length: 26 }, (_, i) => ({
      angle: i * 2.39996,
      distance: .12 + (i % 7) * .07,
      radius: 70 + (i % 5) * 34,
      speed: .5 + (i % 4) * .18,
    }));
    let frame = 0;
    const draw = (now: number) => {
      const t = Math.min((now - start) / 2200, 1);
      ctx.clearRect(0, 0, width, height);
      const strength = Math.sin(t * Math.PI) * .52;
      for (const cloud of clouds) {
        const expansion = 1 + t * t * 8 * cloud.speed;
        const x = width * .54 + Math.cos(cloud.angle) * width * cloud.distance * expansion;
        const y = height * .45 + Math.sin(cloud.angle) * height * cloud.distance * expansion;
        const radius = cloud.radius * expansion;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(.45, color + '88');
        gradient.addColorStop(1, color + '00');
        ctx.globalAlpha = strength;
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;
      if (t < 1) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); };
  }, [active, color]);
  return <canvas ref={canvas} className="climate-clouds" aria-hidden="true" />;
}

export default function ClimateJourney({ onRequestSurvey, chatOpen = false }: { onRequestSurvey: () => void; chatOpen?: boolean }) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [traveling, setTraveling] = useState(false);
  const [guide, setGuide] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hero = useRef<HTMLDivElement>(null);
  const [flightColor, setFlightColor] = useState(worlds[0].color);
  const portal = useRef<HTMLButtonElement>(null);
  const portalTilt = useRef<HTMLSpanElement>(null);
  const flight = useRef<HTMLDivElement>(null);
  const flightImage = useRef<HTMLImageElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const introBrand = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const travelTimeline = useRef<gsap.core.Timeline | null>(null);
  const guideClose = useRef<HTMLButtonElement>(null);
  const guideTrigger = useRef<HTMLButtonElement>(null);
  const world = worlds[current];
  const next = (current + 1) % worlds.length;
  const NextIcon = worlds[next].icon;

  useEffect(() => {
    worlds.forEach(({ image }) => { const photo = new Image(); photo.src = image; });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLoading(false); setProgress(100); return;
    }
    const start = performance.now();
    let frame = 0;
    const counter = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.min(100, Math.floor(elapsed / 30)));
      if (elapsed < 3000) frame = requestAnimationFrame(counter);
      else setLoading(false);
    };
    frame = requestAnimationFrame(counter);
    const timer = window.setTimeout(() => {
      const target = brand.current?.getBoundingClientRect();
      if (!target || !introBrand.current) return;
      gsap.to(introBrand.current, { x: target.left + target.width / 2 - window.innerWidth / 2, y: target.top + target.height / 2 - window.innerHeight * .43, scale: .62, duration: .8, ease: 'power3.inOut' });
    }, 2150);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); gsap.killTweensOf(introBrand.current); };
  }, []);

  useEffect(() => () => { travelTimeline.current?.kill(); }, []);

  const go = useCallback((target: number) => {
    if (target === current || loading || lock.current || guide || chatOpen) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setCurrent(target); return; }
    const rect = portal.current?.getBoundingClientRect();
    if (!rect || !flight.current || !flightImage.current) return;
    lock.current = true;
    setTraveling(true);
    setFlightColor(worlds[target].color);
    flightImage.current.src = worlds[target].image;
    gsap.set(flight.current, { display: 'block', opacity: 1, x: rect.left, y: rect.top, width: rect.width, height: rect.height, borderRadius: '44%', visibility: 'visible' });
    gsap.set(flightImage.current, { scale: 1.12 });
    const tl = gsap.timeline({ onComplete: () => {
      gsap.set(flight.current, { display: 'none' });
      gsap.set(stage.current, { opacity: 1, y: 0 });
      setTraveling(false); lock.current = false;
    } });
    travelTimeline.current = tl;
    tl.to(stage.current, { opacity: 0, y: -14, duration: .35 }, 0)
      .to(flight.current, { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: '0%', duration: 1.15, ease: 'expo.inOut' }, 0)
      .to(flightImage.current, { scale: 1.55, duration: 1.2, ease: 'power2.in' }, 0)
      .call(() => setCurrent(target), [], 1.18)
      .to(flightImage.current, { scale: 1, duration: 1.1, ease: 'power3.out' }, 1.15)
      .to(flight.current, { opacity: 0, duration: .65 }, 1.6)
      .to(stage.current, { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, 1.6);
  }, [current, guide, loading, chatOpen]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion(); syncVisibility();
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting && entry.intersectionRatio >= .4), { threshold: [0, .4] });
    if (hero.current) observer.observe(hero.current);
    return () => { observer.disconnect(); media.removeEventListener('change', syncMotion); document.removeEventListener('visibilitychange', syncVisibility); };
  }, []);

  const autoPlaying = !autoPaused && !interacting && !reducedMotion && heroVisible && pageVisible && !loading && !traveling && !guide && !chatOpen;
  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setTimeout(() => go((current + 1) % worlds.length), 8000);
    return () => window.clearTimeout(timer);
  }, [autoPlaying, current, go]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!heroVisible || chatOpen || guide || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [role="dialog"], .chat-drawer')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); go((current + 1) % 3); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go((current + 2) % 3); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [current, go, heroVisible, chatOpen, guide]);

  useEffect(() => {
    if (!guide) return;
    const previous = document.activeElement as HTMLElement | null;
    guideClose.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuide(false);
      if (event.key === 'Tab') {
        const items = document.querySelectorAll<HTMLElement>('.climate-guide button');
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1]?.focus(); }
        if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [guide]);

  return <div className="climate-site">
  <div ref={hero} id="climate-home" className={`climate-experience ${loading ? 'is-loading' : 'is-ready'} ${traveling ? 'is-traveling' : ''}`} aria-busy={loading || traveling}>
    <div className="climate-landscape" aria-hidden="true">
      {worlds.map((item, index) => <img key={item.name} className={`climate-world ${index === current ? 'is-active' : ''}`} src={item.image} alt="" fetchPriority={index === 0 ? 'high' : 'auto'} />)}
      <div className="climate-shade" /><div className="climate-grain" />
    </div>

    <header className="climate-header">
      <a ref={brand} href="#" onClick={(event) => { event.preventDefault(); go(0); }} aria-label="Prince HVAC home"><Brand /></a>
      <span className="climate-header-note">A WORLD OF COMFORT.<br /><span>BUILT AROUND YOU.</span></span>
      <div className="climate-header-actions"><button ref={guideTrigger} className="climate-approach" onClick={() => setGuide(true)}>Our approach <ArrowUpRight size={13} /></button><button className="climate-book" onClick={onRequestSurvey}>Book a visit <ArrowUpRight size={16} /></button></div>
    </header>

    <div ref={stage} className="climate-stage">
      <section className="climate-copy" key={world.name}>
        <div className="climate-eyebrow"><span className="climate-mini-star">✳</span> {world.eyebrow}</div>
        <h1>{world.title}<span className="climate-title-dot">.</span></h1>
        <p>{world.description}</p>
        <button className="climate-copy-link" onClick={onRequestSurvey}>Make yourself comfortable <ArrowUpRight size={15} /></button>
      </section>

      <div className="climate-portal-area">
        <span className="climate-portal-overline">THERE’S MORE TO FEEL</span>
        <button ref={portal} className="climate-portal" aria-label={`Enter ${worlds[next].name.toLowerCase()} climate`} disabled={loading || traveling || guide}
          onClick={() => go(next)}
          onPointerEnter={(event) => { if (event.pointerType === 'mouse') setInteracting(true); }}
          onFocus={() => setInteracting(true)} onBlur={() => setInteracting(false)}
          onPointerMove={(event) => {
            if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            portalTilt.current?.style.setProperty('--portal-rx', `${-y * 14}deg`);
            portalTilt.current?.style.setProperty('--portal-ry', `${x * 18}deg`);
          }}
          onPointerLeave={() => { setInteracting(false); portalTilt.current?.style.setProperty('--portal-rx', '0deg'); portalTilt.current?.style.setProperty('--portal-ry', '0deg'); }}>
          <span ref={portalTilt} className="climate-portal-shell">
            <img src={worlds[next].image} alt={`A preview of the ${worlds[next].name.toLowerCase()} climate`} />
            <span className="climate-portal-glass" />
            <span className="climate-portal-enter"><NextIcon size={23} strokeWidth={1.2} /><span>ENTER</span><ArrowUpRight size={17} /></span>
            <span className="climate-portal-name">{worlds[next].name}<small>NEXT CLIMATE / 0{next + 1}</small></span>
          </span>
        </button>
        <span className="climate-portal-caption">STEP INTO YOUR NEXT COMFORT ZONE <ArrowDown size={12} /></span>
      </div>

      <nav className="climate-destinations" aria-label="Climate destinations">
        <span className="climate-nav-label">THE CLIMATES</span>
        {worlds.map((item, index) => <button key={item.name} onClick={() => go(index)} aria-current={index === current ? 'page' : undefined} disabled={loading || traveling}><span>0{index + 1}</span><b>{item.name}</b><i /></button>)}
      </nav>

      <div className="climate-facts" key={`${world.name}-facts`} aria-label={`${world.name} service facts`}>
        {world.facts.map(([label, value], index) => <div key={label}><span><small>0{index + 1}</small>{label}</span><p>{value}</p></div>)}
      </div>
    </div>

    <footer className="climate-footer">
      <span className="climate-footer-tag"><i /> ENGINEERED FOR YOUR EVERYDAY.</span>
      <button className="climate-scroll" onClick={() => document.getElementById('comfort-edit')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })}>SCROLL TO FEEL MORE <ArrowDown size={13} /></button>
      <div className="climate-controls"><span>0{current + 1}<small> / 03</small></span><button onClick={() => go((current + 2) % 3)} disabled={traveling || loading} aria-label="Previous climate"><ArrowLeft size={17} /></button><button onClick={() => go(next)} disabled={traveling || loading} aria-label="Next climate"><ArrowRight size={17} /></button></div>
    </footer>

    <div className="climate-autoflip">
      <button onClick={() => setAutoPaused((paused) => !paused)} disabled={reducedMotion} aria-label={autoPaused ? 'Resume automatic climate flips' : 'Pause automatic climate flips'} aria-pressed={autoPaused}>
        {autoPaused || reducedMotion ? <Play size={11} /> : <Pause size={11} />}<span>{reducedMotion ? 'MANUAL EXPLORATION' : autoPaused ? 'AUTO FLIP PAUSED' : 'AUTO FLIP / 8 SEC'}</span>
      </button>
      <span className="climate-auto-track" aria-hidden="true"><i key={`${current}-${autoPlaying}`} className={autoPlaying ? 'is-playing' : ''} /></span>
    </div>

    <div ref={flight} className="climate-flight" aria-hidden="true"><img ref={flightImage} alt="" /></div>
    <CloudFlight active={loading || traveling} color={flightColor} />

    {loading && <div className="climate-intro" role="status" aria-label="Preparing your climate experience">
      <div ref={introBrand} className="climate-intro-brand"><Brand /><span>COMFORT HAS NO BOUNDARIES.</span></div>
      <div className="climate-intro-bottom"><div className="climate-counter" aria-hidden="true">{String(progress).padStart(2, '0')}<small>%</small></div><span>ENTERING YOUR COMFORT ZONE<br /><b>PRINCE HVAC / CLIMATE 01</b></span></div>
      <div className="climate-load-track"><span style={{ width: `${progress}%` }} /></div>
    </div>}

    {guide && <div className="climate-guide-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setGuide(false); }}>
      <section className="climate-guide" role="dialog" aria-modal="true" aria-labelledby="climate-guide-title">
        <button ref={guideClose} className="climate-guide-close" onClick={() => setGuide(false)} aria-label="Close our approach"><X size={22} /></button>
        <span className="climate-eyebrow">THE PRINCE APPROACH</span><h2 id="climate-guide-title">Comfort is personal.<br />So is the solution.</h2>
        <p>Your home is more than a floor plan. We start with a conversation, then consider your equipment, airflow and priorities together.</p>
        <ol><li><b>01 / LISTEN</b><span>Tell us what you’ve noticed and what comfort means to you.</span></li><li><b>02 / ASSESS</b><span>A site assessment helps shape the right system and a plan you understand.</span></li><li><b>03 / CARE</b><span>Know what was done, what to watch for and how to follow up.</span></li></ol>
        <button className="climate-book" onClick={() => { setGuide(false); onRequestSurvey(); }}>Let’s start with your home <ArrowUpRight size={16} /></button>
        <small className="climate-guide-note">Equipment and performance depend on your property and a proper assessment. Landscape scenes are illustrative, not completed Prince projects.</small>
      </section>
    </div>}
  </div>
  <FlipChapter id="comfort-edit" number="02" eyebrow="THE COMFORT EDIT" title="FEEL THE DIFFERENCE" intro="Not just a temperature. A better way to feel at home." blocked={chatOpen} onRequestSurvey={onRequestSurvey} slides={[
    { label: 'COOL / 01', title: 'A cooler kind of calm.', description: 'Steady cooling, considered airflow and a system matched to the spaces you actually live in.', image: '/climates/cooling.jpg', details: ['Air conditioning', 'Room-by-room priorities', 'Property-led sizing'] },
    { label: 'FRESH / 02', title: 'Room to breathe.', description: 'Bring the fresh-start feeling indoors with thoughtful ventilation, filtration and balanced airflow.', image: '/climates/spring.jpg', details: ['Indoor air quality', 'Airflow & filtration', 'A home evaluation'] },
    { label: 'BALANCE / 03', title: 'Comfort, in balance.', description: 'Quiet warmth and responsive heat-pump systems, planned around your home rather than a one-size-fits-all answer.', image: '/climates/air.jpg', details: ['Heat-pump systems', 'Quiet operation', 'A considered service plan'] },
  ]} />
  <FlipChapter id="prince-care" number="03" eyebrow="THE PRINCE WAY" title="GOOD WORK. BETTER LIVING" intro="A clear journey from your first question to everyday comfort." blocked={chatOpen} onRequestSurvey={onRequestSurvey} slides={[
    { label: 'LISTEN / 01', title: 'Your home. Your priorities.', description: 'Tell Elena what you’ve noticed. The conversation starts with your needs, not a sales pitch.', image: '/climates/spring.jpg', details: ['Tell us what’s happening', 'Share your comfort goals', 'Start with a conversation'] },
    { label: 'ASSESS / 02', title: 'A plan that makes sense.', description: 'A proper site assessment considers existing equipment, access and airflow before the next step is recommended.', image: '/climates/cooling.jpg', details: ['Understand the property', 'Consider equipment & access', 'Discuss the right next step'] },
    { label: 'CARE / 03', title: 'Keep the good feeling.', description: 'Clear communication and considered maintenance help keep your system understandable and your home comfortable.', image: '/climates/air.jpg', details: ['Service & maintenance', 'Clear follow-up', 'Long-view comfort'] },
  ]} />
  <footer className="climate-site-footer"><Brand /><span>COMFORT HAS NO BOUNDARIES.</span><a href="#climate-home">BACK TO THE CLIMATES <ArrowUpRight size={14} /></a><small>Scenes are illustrative. Equipment and performance depend on a proper property assessment.</small></footer>
  </div>;
}
