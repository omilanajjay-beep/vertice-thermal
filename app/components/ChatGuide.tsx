'use client';

import { useEffect, useRef } from 'react';

export default function ChatGuide() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const scene = document.querySelector<HTMLElement>('.comfort-story-scene');
      const launcher = document.querySelector<HTMLElement>('.chat-launcher');
      const svg = svgRef.current;
      const path = pathRef.current;
      if (svg && path && scene && launcher) {
        const bounds = scene.getBoundingClientRect();
        const target = launcher.getBoundingClientRect();
        const style = getComputedStyle(scene);
        const handX = parseFloat(style.getPropertyValue('--hand-x'));
        const handY = parseFloat(style.getPropertyValue('--hand-y'));
        const x = bounds.left + bounds.width * handX / 100;
        const y = bounds.top + bounds.height * handY / 100;
        const tx = target.left + target.width / 2 - 7;
        const ty = target.top - 13;
        const visible = Number.isFinite(x) && Number.isFinite(y) && y > 90 && y < window.innerHeight - 40 && x > 0 && x < window.innerWidth && bounds.bottom > 150;
        svg.style.opacity = visible ? '1' : '0';
        svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        const edge = window.innerWidth - 10;
        path.setAttribute('d', window.innerWidth <= 820
          ? `M ${x} ${y} C ${x + 40} ${y + 6}, ${edge} ${y + 20}, ${edge} ${y + 75} L ${edge} ${ty - 60} Q ${edge} ${ty - 15}, ${tx} ${ty}`
          : `M ${x} ${y} C ${x + 55} ${y + 15}, ${tx - 90} ${ty - 110}, ${tx} ${ty}`);
      } else if (svg) svg.style.opacity = '0';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <svg ref={svgRef} className="chat-direction-guide" aria-hidden="true"><defs><marker id="chat-arrow-tip" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto"><path d="M 2 2 L 10 6 L 2 10" fill="none" stroke="#bcecf2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></marker></defs><path ref={pathRef} fill="none" stroke="#bcecf2" strokeOpacity=".8" strokeWidth="1.5" strokeDasharray="5 7" markerEnd="url(#chat-arrow-tip)" /></svg>;
}
