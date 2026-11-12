'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, ArrowUpRight } from 'lucide-react';
import './flip-chapter.css';

type FlipSlide = {
  label: string;
  title: string;
  description: string;
  image: string;
  details: string[];
};

type FlipChapterProps = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  intro: string;
  slides: FlipSlide[];
  onRequestSurvey: () => void;
  blocked?: boolean;
};

const AUTOPLAY_MS = 7000;

export default function FlipChapter({
  id,
  number,
  eyebrow,
  title,
  intro,
  slides,
  onRequestSurvey,
  blocked = false,
}: FlipChapterProps) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const slideCount = slides.length;
  const activeSlide = slides[current];
  const canNavigate = slideCount > 1;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const navigate = useCallback((nextIndex: number) => {
    if (!slideCount) return;
    setCurrent((nextIndex + slideCount) % slideCount);
    clearTimer();
  }, [clearTimer, slideCount]);

  const next = useCallback(() => navigate(current + 1), [current, navigate]);
  const previous = useCallback(() => navigate(current - 1), [current, navigate]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35);
    }, { threshold: [0, 0.35, 0.5, 1] });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsDocumentVisible(document.visibilityState === 'visible');
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    clearTimer();
    const shouldAutoplay = canNavigate && isPlaying && isVisible && isDocumentVisible && !isInteracting && !blocked && !reducedMotion;
    if (!shouldAutoplay) return;
    timerRef.current = window.setTimeout(() => {
      setCurrent((value) => (value + 1) % slideCount);
    }, AUTOPLAY_MS);
    return clearTimer;
  }, [blocked, canNavigate, clearTimer, current, isDocumentVisible, isInteracting, isPlaying, isVisible, reducedMotion, slideCount]);

  useEffect(() => clearTimer, [clearTimer]);

  if (!slides.length) return null;

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`flip-chapter${blocked ? ' flip-chapter--blocked' : ''}`}
      aria-labelledby={`${id}-title`}
      style={{ '--flip-chapter-total': slideCount } as React.CSSProperties}
    >
      <div className="flip-chapter__inner">
        <header className="flip-chapter__header">
          <span className="flip-chapter__number" aria-hidden="true">{number}</span>
          <div>
            <p className="flip-chapter__eyebrow"><span className="flip-chapter__mark" aria-hidden="true">✳</span>{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}<span aria-hidden="true">.</span></h2>
          </div>
        </header>

        <div className="flip-chapter__intro-row">
          <p className="flip-chapter__intro">{intro}</p>
          <button className="flip-chapter__survey" type="button" onClick={onRequestSurvey}>
            Request a visit <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>

        <div
          ref={carouselRef}
          className="flip-chapter__carousel"
          tabIndex={-1}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onFocus={() => setIsInteracting(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsInteracting(false);
          }}
        >
          <div className="flip-chapter__stage" aria-label={`${title} service slides`}>
            <article key={`${id}-${current}`} className="flip-chapter__card" aria-label={`${activeSlide.title}, slide ${current + 1} of ${slideCount}`}>
              <div className="flip-chapter__image-wrap">
                <img src={activeSlide.image} alt={activeSlide.title} className="flip-chapter__image" />
                <span className="flip-chapter__image-index">0{current + 1} / 0{slideCount}</span>
              </div>
              <div className="flip-chapter__card-copy">
                <p className="flip-chapter__slide-label">{activeSlide.label}</p>
                <h3>{activeSlide.title}</h3>
                <p className="flip-chapter__description">{activeSlide.description}</p>
                <ul className="flip-chapter__details">
                  {activeSlide.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
            </article>
          </div>

          <div className="flip-chapter__controls" aria-label="Slide controls">
            <div className="flip-chapter__indicators" role="group" aria-label="Choose a slide">
              {slides.map((slide, index) => (
                <button
                  key={`${slide.title}-${index}`}
                  type="button"
                  aria-pressed={index === current}
                  aria-label={`Show slide ${index + 1}: ${slide.title}`}
                  className={index === current ? 'is-active' : ''}
                  onClick={() => navigate(index)}
                ><span /></button>
              ))}
            </div>
            <div className="flip-chapter__buttons">
              <button type="button" onClick={previous} disabled={!canNavigate} aria-label="Previous slide"><ArrowLeft size={16} aria-hidden="true" /></button>
              <button type="button" onClick={next} disabled={!canNavigate} aria-label="Next slide"><ArrowRight size={16} aria-hidden="true" /></button>
              <button type="button" disabled={reducedMotion} onClick={() => { setIsPlaying((value) => !value); clearTimer(); }} aria-label={reducedMotion ? 'Automatic rotation disabled for reduced motion' : isPlaying ? 'Pause automatic slide rotation' : 'Play automatic slide rotation'} aria-pressed={!isPlaying}>
                {isPlaying && !reducedMotion ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
