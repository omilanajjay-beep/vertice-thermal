'use client';

import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Check, MessageCircle, ShieldCheck } from 'lucide-react';
import { useOpenChat } from './SiteShell';
import StoryScene, { type StoryStep } from './StoryScene';
import ChatGuide from './ChatGuide';
import { homeownerReviews } from '../lib/reviews';
import RouteEditorial from './RouteEditorial';

export type StoryRoute = 'diagnostics' | 'repair' | 'comfort' | 'reviews' | 'booking';

type StoryData = {
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  context: string;
  nextPath: string;
  nextLabel: string;
  scene: StoryStep;
};

const story: Record<StoryRoute, StoryData> = {
  diagnostics: {
    path: '/equipment/diagnostics.html',
    label: 'The system',
    eyebrow: '01 / THE SYSTEM',
    title: 'A clearer read.',
    accent: 'A calmer home.',
    description: 'Good repair starts with good information. A careful diagnostic turns an unfamiliar noise or warm room into a considered next step.',
    context: 'Digital diagnostics, handled with care.',
    nextPath: '/service/emergency-repair.html',
    nextLabel: 'When comfort slips',
    scene: 'diagnostics',
  },
  repair: {
    path: '/service/emergency-repair.html',
    label: 'The problem',
    eyebrow: '02 / THE PROBLEM',
    title: 'When the air',
    accent: 'stops moving.',
    description: 'An uncomfortable room can make a home feel smaller. A prepared technician takes the time to find the fault and work through it properly.',
    context: 'A difficult day, met with focused service.',
    nextPath: '/case-studies/comfort-restored.html',
    nextLabel: 'See comfort return',
    scene: 'repair',
  },
  comfort: {
    path: '/case-studies/comfort-restored.html',
    label: 'The solution',
    eyebrow: '03 / THE SOLUTION',
    title: 'The room settles.',
    accent: 'Home feels like home.',
    description: 'Cool, even airflow returns. The family can get back to their evening, with the reassurance that the work was handled with care.',
    context: 'The same room, now easy to be in.',
    nextPath: '/company/verified-reviews.html',
    nextLabel: 'Hear from homeowners',
    scene: 'comfort',
  },
  reviews: {
    path: '/company/verified-reviews.html',
    label: 'The reviews',
    eyebrow: '04 / REVIEWS',
    title: 'Thoughtful work.',
    accent: 'In their own words.',
    description: 'A good service experience is personal. Read five homeowner accounts, each paired with its service date and visit type.',
    context: 'Five service visits. Five homeowner perspectives.',
    nextPath: '/booking/secure-dispatch.html',
    nextLabel: 'Arrange a visit',
    scene: 'reviews',
  },
  booking: {
    path: '/booking/secure-dispatch.html',
    label: 'Your next step',
    eyebrow: '05 / TRUST',
    title: 'Comfort,',
    accent: 'one conversation away.',
    description: 'Tell Elena, our live dispatch concierge, what is happening at home. Review available visit times and your details before you confirm.',
    context: 'The real booking concierge is always within reach.',
    nextPath: '/equipment/diagnostics.html',
    nextLabel: 'Back to the system',
    scene: 'booking',
  },
};

const orderedRoutes: StoryRoute[] = ['diagnostics', 'repair', 'comfort', 'reviews', 'booking'];

const pageNotes: Record<StoryRoute, string[]> = {
  diagnostics: ['Measured system readings', 'Clear recommendations', 'Care for the whole home'],
  repair: ['Listen to the symptoms', 'Find the underlying issue', 'Agree the next step'],
  comfort: ['Balanced airflow', 'A calmer everyday', 'Considered aftercare'],
  reviews: ['Five homeowner accounts', 'Service dates included', 'Their own words'],
  booking: ['Live appointment times', 'Your details reviewed', 'Two confirmations'],
};

function reviewerInitials(name: string) {
  const words = name.replace(/^Chief Engineering Officer /, '').split(/\s+/).filter((word) => word !== '&');
  return `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`;
}

function ReviewsList() {
  return <section className="review-library" aria-labelledby="review-library-title">
    <div className="review-library-heading">
      <div><span className="story-kicker">HOMEOWNER EXPERIENCES / 2026</span><h2 id="review-library-title">Five visits.<br /><i>Five perspectives.</i></h2></div>
      <p>Each review below is presented with the service date, service type and homeowner location supplied with the review record.</p>
    </div>
    <div className="review-grid">
      {homeownerReviews.map((review, index) => <article key={review.id} className="review-card">
        <div className="review-card-top"><span className="review-number">0{index + 1} / 05</span><span className="review-date"><BadgeCheck size={13} /> <time dateTime={review.serviceDate}>{review.displayDate}</time></span></div>
        <div className="review-stars" aria-label="5 out of 5 stars">★★★★★<small>{review.rating.toFixed(1)} / 5.0</small></div>
        <span className="review-category">{review.category}</span>
        <h3>{review.headline}</h3>
        <p className="review-body">“{review.body}”</p>
        <footer className="review-attribution"><span className="review-initials" aria-hidden="true">{reviewerInitials(review.name)}</span><span><strong>{review.name}</strong><small>{review.location}</small></span><span className="review-verified"><Check size={12} /> SERVICE DATE</span></footer>
      </article>)}
    </div>
    <p className="review-source-note"><ShieldCheck size={14} /> Service dates and visit types are shown alongside each homeowner review.</p>
  </section>;
}

function RouteDetails({ page, openChat }: { page: StoryRoute; openChat: () => void }) {
  if (page === 'reviews') return <ReviewsList />;
  if (page === 'diagnostics' || page === 'repair' || page === 'comfort') return <RouteEditorial page={page} openChat={openChat} />;
  return <section className="booking-panel"><div><span className="story-kicker">SECURE DISPATCH / LIVE AVAILABILITY</span><h2>Review every detail<br /><i>before you book.</i></h2><p>Elena collects a few details, checks the live schedule, then shows the appointment name and available times. Nothing is reserved until you confirm.</p></div><div className="booking-checklist"><p><Check size={15} /> Live appointment availability</p><p><Check size={15} /> Appointment details reviewed first</p><p><Check size={15} /> Confirmations to homeowner and dispatch</p><button className="story-button" onClick={openChat}>Open Elena’s concierge <MessageCircle size={16} /></button></div></section>;
}

export default function StoryPage({ page }: { page: StoryRoute }) {
  const openChat = useOpenChat();
  const data = story[page];
  const currentIndex = orderedRoutes.indexOf(page);
  const previous = currentIndex > 0 ? story[orderedRoutes[currentIndex - 1]] : null;
  const next = currentIndex < orderedRoutes.length - 1 ? story[orderedRoutes[currentIndex + 1]] : null;
  return <main key={page} className={`deep-story deep-story-${page}`} data-story-page={page}>
    <header className="story-page-header">
      <div className="story-page-location"><span>THE COMFORT STORY</span><strong>PAGE {currentIndex + 1} OF 5 <span aria-hidden="true">/</span> {data.label}</strong></div>
      <nav className="deep-route-nav" aria-label="Choose a story page">
        {orderedRoutes.map((route, index) => <Link key={route} href={story[route].path} scroll={true} aria-label={`Page ${index + 1}: ${story[route].label}`} aria-current={route === page ? 'page' : undefined}>
          <span className="deep-route-count">0{index + 1}</span><span className="deep-route-title">{story[route].label}</span><ArrowUpRight size={13} />
        </Link>)}
      </nav>
    </header>
    <section className="deep-hero" aria-labelledby="deep-page-title">
      <div className="deep-hero-copy">
        <span className="story-kicker"><span className="story-live-dot" /> VERTICE THERMAL / {data.eyebrow}</span>
        <h1 id="deep-page-title">{data.title}<br /><i>{data.accent}</i></h1>
        <p className="deep-hero-description">{data.description}</p>
        <div className="deep-hero-actions">
          {page === 'booking' ? <button className="story-button" onClick={openChat}>Open Elena’s concierge <MessageCircle size={16} /></button> : <a className="story-button" href="#page-details">{page === 'reviews' ? 'Read the homeowner reviews' : 'Explore this page'} <ArrowDown size={15} /></a>}
          <button className="story-quiet-link" onClick={openChat}>Talk to Elena <ArrowRight size={15} /></button>
        </div>
        <div className="deep-context"><span />{data.context}</div>
        <div className="story-hero-facts">{pageNotes[page].map((note, index) => <div key={note}><span>0{index + 1}</span><small>{note}</small></div>)}</div>
        <a className="story-page-scroll" href="#page-details"><ArrowDown size={14} /> Scroll to explore {data.label.toLowerCase()}</a>
      </div>
      <div className="deep-scene-wrap">
        <StoryScene key={`${data.scene}-${page}`} step={data.scene} review={homeownerReviews[0]} />
        <div className="scene-corner-label"><span>FIELD NOTE / 0{currentIndex + 1}</span><span>VERTICE / COMFORT IN PRACTICE</span></div>
      </div>
    </section>
    <div className="story-manifesto"><span>FORM FOLLOWS COMFORT</span><i aria-hidden="true" /><span>THOUGHTFULLY CARED FOR</span><i aria-hidden="true" /><span>HOME, AS IT SHOULD FEEL</span></div>
    <div id="page-details" className="story-page-details"><RouteDetails page={page} openChat={openChat} /></div>
    <section className="story-closing-band"><div><span className="story-kicker">A MORE CONSIDERED KIND OF COMFORT</span><h2>Let’s start with<br /><i>your home.</i></h2></div><button className="story-button" onClick={openChat}>Talk to Elena <ArrowUpRight size={16} /></button></section>
    {page === 'booking' && <><ChatGuide /><div className="chat-beacon-note" aria-hidden="true">OPEN DISPATCH CHAT <span>↘</span></div></>}
    <nav className="story-page-pagination" aria-label="Previous and next story pages">
      <div className="story-page-end"><span>END OF PAGE {currentIndex + 1} OF 5</span><p>{next ? 'Continue the story on the next page.' : 'Your home. Your next step.'}</p></div>
      <div className="story-page-turns">
        {previous && <Link className="story-previous-page" href={previous.path} scroll={true}><ArrowLeft size={16} /><span><small>PREVIOUS PAGE / 0{currentIndex}</small>{previous.label}</span></Link>}
        {next ? <Link className="story-next-page" href={next.path} scroll={true}><span><small>NEXT PAGE / 0{currentIndex + 2}</small>{next.label}</span><ArrowRight size={20} /></Link> : <Link className="story-next-page" href={story.diagnostics.path} scroll={true}><span><small>BACK TO PAGE 01</small>Return to the system</span><ArrowRight size={20} /></Link>}
      </div>
    </nav>
  </main>;
}
