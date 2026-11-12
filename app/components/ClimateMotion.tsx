'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Visual choreography only; intake and booking are deliberately outside this layer. */
export default function ClimateMotion({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!ready) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = document.querySelector<HTMLElement>('.vertice-site');
    if (!root) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo('.hero-kicker, .hero-copy h1, .hero-description, .hero-explore',
          { y: 38, rotationX: -16, opacity: 0 },
          { y: 0, rotationX: 0, opacity: 1, stagger: 0.13, duration: 1.25, ease: 'power3.out', clearProps: 'transform,opacity' });
        gsap.fromTo('.sheet-meta, .sheet-spec, .drag-cue', { opacity: 0 },
          { opacity: 1, duration: 1.5, delay: 0.5, clearProps: 'opacity' });
        gsap.fromTo('.model-bay', { scale: 0.91, x: 35, opacity: 0 },
          { scale: 1, x: 0, opacity: 1, duration: 1.9, ease: 'power3.out', clearProps: 'transform,opacity' });
        root.querySelectorAll<HTMLElement>('.approach-section, .services-section, .contact-section').forEach((section) => {
          const elements = section.querySelectorAll('.section-heading, .approach-grid h2, .approach-copy, .services-heading, .contact-section > .section-index, .contact-section > h2, .contact-section > p, .contact-primary, .approach-foot, .site-footer');
          gsap.fromTo(elements, { y: 58, rotationX: -9, opacity: 0 }, {
            y: 0, rotationX: 0, opacity: 1, duration: 1.1, stagger: 0.11, ease: 'power3.out',
            scrollTrigger: { trigger: section, start: 'top 85%', once: true }, clearProps: 'transform,opacity',
          });
          const line = section.querySelector('.section-rule');
          if (line) gsap.fromTo(line, { scaleX: 0, transformOrigin: 'left center' }, {
            scaleX: 1, duration: 1.5, ease: 'power3.inOut',
            scrollTrigger: { trigger: section, start: 'top 84%', once: true }, clearProps: 'transform,transformOrigin',
          });
        });
        gsap.fromTo('.service-card', { y: 70, rotationX: 11, opacity: 0 }, {
          y: 0, rotationX: 0, opacity: 1, stagger: 0.15, duration: 1.15, ease: 'power3.out',
          scrollTrigger: { trigger: '.service-cards', start: 'top 90%', once: true }, clearProps: 'transform,opacity',
        });
        gsap.to('.contact-asterisk', { y: -46, ease: 'none', scrollTrigger: { trigger: '.contact-section', start: 'top bottom', end: 'bottom top', scrub: 1.2 } });
        gsap.to('.underlay-orbit', { rotation: 36, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.thermal-track', start: 'top top', end: 'bottom top', scrub: 1.2 } });
      }, root);
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => { cancelAnimationFrame(refresh); context.revert(); };
    });
    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const disposers: (() => void)[] = [];
      root.querySelectorAll<HTMLElement>('.service-card').forEach((card) => {
        let frame = 0;
        const move = (event: PointerEvent) => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const bounds = card.getBoundingClientRect();
            const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
            const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
            card.style.setProperty('--card-rx', `${-y * 4}deg`);
            card.style.setProperty('--card-ry', `${x * 5}deg`);
            card.style.setProperty('--card-light-x', `${50 + x * 40}%`);
            card.style.setProperty('--card-light-y', `${50 + y * 40}%`);
          });
        };
        const reset = () => {
          cancelAnimationFrame(frame);
          ['--card-rx', '--card-ry', '--card-light-x', '--card-light-y'].forEach((key) => card.style.removeProperty(key));
        };
        card.addEventListener('pointermove', move, { passive: true });
        card.addEventListener('pointerleave', reset);
        disposers.push(() => { reset(); card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', reset); });
      });
      return () => disposers.forEach((dispose) => dispose());
    });
    return () => media.revert();
  }, [ready]);
  return null;
}
