'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';

const scenes = [
  { id: 'hot-home', title: 'The hot home', description: 'A family rests in a warm home with an air conditioner that has stopped cooling.' },
  { id: 'arrival', title: 'The expert arrives', description: 'A prepared HVAC technician arrives to understand the problem and help the family.' },
  { id: 'repair', title: 'A careful repair', description: 'The technician works carefully on the air conditioner, using the proper tools and access platform.' },
  { id: 'comfort', title: 'Comfort restored', description: 'Cool airflow returns and the family relaxes together in a comfortable home.' },
  { id: 'chat-invitation', title: 'Your next step', description: 'The technician points toward the real glowing Elena chat launcher at the bottom right of the website.' },
];

export default function PhotorealScene({ stageIndex }: { stageIndex: number }) {
  const stage = Math.max(0, Math.min(4, stageIndex));
  const scene = scenes[stage];
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => {
      setReducedMotion(preference.matches);
      if (visible && document.visibilityState !== 'hidden' && playing && !preference.matches) {
        setEnabled(true);
        void video.play().catch(() => {});
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.05 });
    observer.observe(video);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); preference.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, [playing, enabled]);
  useEffect(() => {
    if (stage !== 4) return;
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;
    const positionHand = () => {
      const bounds = root.getBoundingClientRect();
      const frame = video.getBoundingClientRect();
      // The rendered invitation deliberately holds its pointing hand here.
      root.style.setProperty('--hand-x', `${(frame.left - bounds.left + frame.width * 0.80) / bounds.width * 100}%`);
      root.style.setProperty('--hand-y', `${(frame.top - bounds.top + frame.height * 0.48) / bounds.height * 100}%`);
    };
    const observer = new ResizeObserver(positionHand);
    observer.observe(root);
    positionHand();
    return () => observer.disconnect();
  }, [stage]);
  return <div ref={rootRef} className={`comfort-story-scene photoreal-scene ${stage === 4 ? 'booking-chapter' : ''}`} style={{ '--hand-x': '80%', '--hand-y': '48%' } as CSSProperties}>
    <div className="photoreal-topline"><span>VERTICE / A HOME COMFORT STORY</span><span>0{stage + 1} — 05</span></div>
    <video ref={videoRef} className="photoreal-video" src={enabled ? `/media/${scene.id}.mp4` : undefined} poster={`/media/${scene.id}.jpg`} muted loop={stage !== 1 && stage !== 2} playsInline preload="none" onEnded={() => setPlaying(false)} aria-label={`${scene.title}. ${scene.description}`} />
    <div className="photoreal-bottomline"><span>{scene.title}</span>{!reducedMotion && <button type="button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? 'Pause scene animation' : 'Resume scene animation'}>{playing ? <Pause size={13} /> : <Play size={13} />}<span>{playing ? 'Pause motion' : 'Play motion'}</span></button>}</div>
    <span className="scene-screen-reader">{scene.description}</span>
  </div>;
}
