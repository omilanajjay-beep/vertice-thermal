'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AirVent,
  ArrowUpRight,
  ClipboardCheck,
  Fan,
  FileSearch,
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  Wrench,
} from 'lucide-react';

type RoutePage = 'diagnostics' | 'repair' | 'comfort';

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type RouteContent = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  action: string;
  note: string;
  features: Feature[];
};

const routeContent: Record<RoutePage, RouteContent> = {
  diagnostics: {
    eyebrow: '01 / THE READ',
    title: 'Every reading has',
    accent: 'a reason.',
    description:
      'A careful diagnostic turns an unfamiliar noise, warm room or uneven airflow into a clearer next step. We look at the system as a whole before recommending anything.',
    action: 'Talk through a concern',
    note: 'Recommendations are confirmed after the property and equipment have been properly assessed.',
    features: [
      {
        icon: Gauge,
        title: 'Read the system',
        description: 'Start with the symptoms, controls and conditions around the equipment—not a guess from a single signal.',
      },
      {
        icon: AirVent,
        title: 'Trace the airflow',
        description: 'Consider filters, registers, duct paths and room balance to understand where comfort is being lost.',
      },
      {
        icon: FileSearch,
        title: 'Explain the options',
        description: 'Separate an immediate adjustment from a repair or longer-term recommendation, with the reasoning made clear.',
      },
    ],
  },
  repair: {
    eyebrow: '02 / THE RESPONSE',
    title: 'Find the fault,',
    accent: 'then make a plan.',
    description:
      'When comfort slips, a prepared technician takes the time to understand what changed, check the affected system and outline the work that is actually needed.',
    action: 'Describe the issue',
    note: 'Visit timing, parts and repair scope depend on the equipment, access and findings on site.',
    features: [
      {
        icon: ClipboardCheck,
        title: 'Start with symptoms',
        description: 'Capture what you notice, when it began and which rooms or controls are affected before the visit.',
      },
      {
        icon: Wrench,
        title: 'Check before changing',
        description: 'Inspect the likely causes and the surrounding system so the response is based on evidence, not assumption.',
      },
      {
        icon: SlidersHorizontal,
        title: 'Set out the repair plan',
        description: 'Explain the available path, expected work and any follow-up needed once the diagnosis is complete.',
      },
    ],
  },
  comfort: {
    eyebrow: '03 / THE RETURN',
    title: 'Let the room settle,',
    accent: 'one detail at a time.',
    description:
      'Comfort is a whole-home feeling. Balanced airflow, steady temperature and equipment that is easier to live with all begin with work matched to the property.',
    action: 'Ask about your home',
    note: 'The right follow-up depends on the installed system, the property and how the home is used.',
    features: [
      {
        icon: Fan,
        title: 'Balance the air',
        description: 'Look beyond a single room to understand how supply, return paths and controls shape the home’s feel.',
      },
      {
        icon: Volume2,
        title: 'Make space for quiet',
        description: 'Consider equipment condition, placement and operating patterns when reducing unnecessary disruption.',
      },
      {
        icon: Wrench,
        title: 'Leave an aftercare path',
        description: 'Keep the system understandable with practical handover notes and a clear way to discuss future needs.',
      },
    ],
  },
};

export default function RouteEditorial({ page, openChat }: { page: RoutePage; openChat: () => void }) {
  const content = routeContent[page];

  return (
    <section className="section system-section route-editorial" aria-labelledby={`route-editorial-${page}`}>
      <div className="section-heading">
        <span className="eyebrow">{content.eyebrow}</span>
        <h2 id={`route-editorial-${page}`}>
          {content.title}
          <br />
          <i>{content.accent}</i>
        </h2>
        <p>{content.description}</p>
        <button type="button" className="story-text-link" onClick={openChat}>
          {content.action} <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="feature-stack">
        {content.features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <article className="feature-row" key={feature.title}>
              <span className="feature-index">0{index + 1}</span>
              <div className="feature-icon"><Icon size={19} /></div>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          );
        })}
        <div className="system-note">
          <ShieldCheck size={15} />
          <span>{content.note}</span>
        </div>
      </div>
    </section>
  );
}
