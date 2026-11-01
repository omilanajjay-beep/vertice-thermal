'use client';
import { useState } from 'react';
import { ArrowUpRight, BadgeCheck, Check, ChevronRight, Clock3, Fan, MapPin, ShieldCheck, Snowflake, Wrench } from 'lucide-react';
import { useOpenChat } from './SiteShell';

export function SystemDetails() {
  const requestSurvey = useOpenChat();
  return (<section className="section system-section" id="system">
      <div className="section-heading" data-reveal><span className="eyebrow">01 / THE SYSTEM</span><h2>Engineering you<br /><i>feel, not hear.</i></h2><p>Every component has a role in the whole: steady output, clean airflow and a system that can be understood and serviced over time.</p></div>
      <div className="feature-stack">
        <article className="feature-row" data-reveal><span className="feature-index">01</span><div className="feature-icon"><Fan size={19} /></div><div><h3>AeroBlade fan</h3><p>Airflow shaped to move efficiently and keep the outdoor unit visually composed.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <article className="feature-row" data-reveal><span className="feature-index">02</span><div className="feature-icon"><Snowflake size={19} /></div><div><h3>Inverter compressor</h3><p>Output modulates with demand instead of cycling at a single fixed rate.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <article className="feature-row" data-reveal><span className="feature-index">03</span><div className="feature-icon"><Wrench size={19} /></div><div><h3>Copper core exchanger</h3><p>A considered thermal pathway, designed for dependable service access.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <div className="system-note"><ShieldCheck size={15} /><span>Performance and equipment selection depend on the property, climate and a proper site assessment.</span></div>
      </div>
    </section>);
}

export function ApproachDetails() {
  const requestSurvey = useOpenChat();
  return (<section className="team-section" id="team">
      <div className="team-intro" data-reveal><div><span className="eyebrow">02 / THE PEOPLE</span><h2>Good work begins<br /><i>with good questions.</i></h2></div><p>A responsible visit starts with listening, checking the property and matching the work to the right local specialist.</p></div>
      <div className="service-cards">
        <article className="service-card" data-reveal data-depth><span className="card-number">01 / ASSESS</span><div className="service-glyph"><MapPin size={21} /></div><h3>Survey &amp; sizing</h3><p>Understand the home, existing equipment and the comfort you want to achieve.</p><span className="card-rule" /></article>
        <article className="service-card" data-reveal data-depth><span className="card-number">02 / INSTALL</span><div className="service-glyph"><Wrench size={21} /></div><h3>Installation &amp; commissioning</h3><p>Plan the system around access, airflow, controls and the character of the property.</p><span className="card-rule" /></article>
        <article className="service-card" data-reveal data-depth><span className="card-number">03 / CARE</span><div className="service-glyph"><Clock3 size={21} /></div><h3>Service &amp; aftercare</h3><p>Keep the system understandable, maintainable and supported after handover.</p><span className="card-rule" /></article>
      </div>
      <div className="directory-note" data-reveal><BadgeCheck size={16} /><p><strong>Technician directory</strong><br />Individual profiles are published only when licensing and service-area details have been verified. No technician credentials are represented here without supporting records.</p><button onClick={requestSurvey}>Ask about a visit <ArrowUpRight size={14} /></button></div>
    </section>);
}

export function ContractorDetails() {
  const requestSurvey = useOpenChat();
  const [partnerCount, setPartnerCount] = useState(3);
  const setupTotal = partnerCount * 2500;
  const monthlyTotal = partnerCount * 1000;
  const firstYearTotal = setupTotal + monthlyTotal * 12;

  return (<section className="partner-section" id="partners">
      <div className="partner-copy" data-reveal><span className="eyebrow">03 / FOR CONTRACTORS</span><h2>Build a better<br /><i>service model.</i></h2><p>A clear setup and predictable recurring support model for contractors who want a considered customer experience from first survey through aftercare.</p><ul><li><Check size={15} /> A defined setup engagement</li><li><Check size={15} /> A consistent monthly retainer</li><li><Check size={15} /> A service-led homeowner journey</li></ul><button className="partner-link" onClick={requestSurvey}>Discuss partnership <ArrowUpRight size={15} /></button></div>
      <div className="calculator glass-panel" data-reveal data-depth>
        <div className="calc-top"><span>PARTNER REVENUE MODEL</span><span className="calc-mark">V / 01</span></div>
        <h3>Estimate contracted revenue</h3>
        <label className="range-label" htmlFor="partner-count">Contractor accounts <strong>{partnerCount}</strong></label>
        <input id="partner-count" type="range" min="1" max="12" step="1" value={partnerCount} onChange={(event) => setPartnerCount(Number(event.target.value))} />
        <div className="range-ends"><span>1 account</span><span>12 accounts</span></div>
        <div className="calc-primary"><span>Estimated first-year gross</span><strong>${firstYearTotal.toLocaleString('en-US')}</strong></div>
        <div className="calc-breakdown"><div><span>One-time setup</span><b>${setupTotal.toLocaleString('en-US')}</b></div><div><span>Monthly retainer</span><b>${monthlyTotal.toLocaleString('en-US')} / mo</b></div></div>
        <p className="calc-disclaimer">Illustrative contracted revenue before delivery costs. Assumes each account pays $2,500 setup and $1,000 per month for 12 months.</p>
        <button className="button button-light" onClick={requestSurvey}>Request partnership details <ArrowUpRight size={15} /></button>
      </div>
    </section>);
}

export function ServiceDetails() {
  const requestSurvey = useOpenChat();
  return (<section className="reviews-section" id="reviews">
      <div className="reviews-intro" data-reveal><span className="eyebrow">04 / SERVICE LOG</span><h2>Proof should<br /><i>be verifiable.</i></h2><p>Every published review should belong to a real visit and a real homeowner.</p></div>
      <div className="review-empty glass-panel" data-reveal data-depth><span className="review-seal"><ShieldCheck size={23} /></span><span className="eyebrow">VERIFIED SERVICE NOTES</span><h3>Only the real thing.</h3><p>Reviews will appear here once completed service records and homeowner permission are confirmed. No testimonial or rating is invented for this page.</p><button onClick={requestSurvey}>Start a service request <ArrowUpRight size={15} /></button></div>
    </section>);
}

