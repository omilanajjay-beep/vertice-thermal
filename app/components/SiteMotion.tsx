'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';

/** DOM-only accents: the hero remains the site's only WebGL scene. */
export default function SiteMotion() {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.hero-copy > *', { opacity: 0, y: 18 }, {
        opacity: 1, y: 0, duration: 0.75, stagger: 0.075, ease: 'power3.out', clearProps: 'all',
      });
      gsap.fromTo('.hero-visual', { opacity: 0 }, {
        opacity: 1, duration: 1, ease: 'power2.out', clearProps: 'opacity',
      });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.add('is-visible');
          observer.unobserve(target);
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
      return () => {
        observer.disconnect();
        document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.remove('is-visible'));
      };
    });

    media.add('(hover: hover) and (pointer: fine) and (min-width: 821px) and (prefers-reduced-motion: no-preference)', () => {
      const cleanups: (() => void)[] = [];
      document.querySelectorAll<HTMLElement>('[data-depth]').forEach((panel) => {
        let frame = 0;
        let x = 0;
        let y = 0;
        const update = () => {
          frame = 0;
          panel.style.setProperty('--depth-x', `${(-y * 2.2).toFixed(2)}deg`);
          panel.style.setProperty('--depth-y', `${(x * 2.2).toFixed(2)}deg`);
          panel.style.setProperty('--light-x', `${50 + x * 35}%`);
          panel.style.setProperty('--light-y', `${50 + y * 35}%`);
        };
        const move = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse' || (event.target instanceof Element && event.target.closest('input, button, a'))) {
            reset();
            return;
          }
          const bounds = panel.getBoundingClientRect();
          x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
          y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
          if (!frame) frame = requestAnimationFrame(update);
        };
        const reset = () => {
          cancelAnimationFrame(frame);
          frame = 0;
          ['--depth-x', '--depth-y', '--light-x', '--light-y'].forEach((name) => panel.style.removeProperty(name));
        };
        panel.addEventListener('pointermove', move, { passive: true });
        panel.addEventListener('pointerleave', reset);
        panel.addEventListener('focusin', reset);
        cleanups.push(() => {
          reset();
          panel.removeEventListener('pointermove', move);
          panel.removeEventListener('pointerleave', reset);
          panel.removeEventListener('focusin', reset);
        });
      });
      return () => cleanups.forEach((cleanup) => cleanup());
    });

    // Section navigation is the page transition model for this single-page site.
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-links a'));
    const sections = links.map((link) => document.querySelector(link.hash)).filter((section): section is Element => Boolean(section));
    const visible = new Set<string>();
    const navigation = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      const current = sections.find((section) => visible.has(section.id))?.id;
      links.forEach((link) => {
        if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-20% 0px -35% 0px' });
    sections.forEach((section) => navigation.observe(section));
    return () => {
      media.revert();
      navigation.disconnect();
      links.forEach((link) => link.removeAttribute('aria-current'));
    };
  }, []);
  return null;
}
