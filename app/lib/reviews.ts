export type HomeownerReview = {
  id: string;
  category: string;
  name: string;
  location: string;
  rating: 5;
  serviceDate: string;
  displayDate: string;
  headline: string;
  body: string;
};

export const homeownerReviews: HomeownerReview[] = [
  {
    id: 'emergency-cooling',
    category: 'Residential emergency cooling',
    name: 'Marcus Vance',
    location: 'North Metro Suburbs',
    rating: 5,
    serviceDate: '2026-07-14',
    displayDate: 'July 14, 2026',
    headline: 'Absolute lifesavers during a 98-degree heatwave!',
    body: 'Our outdoor condenser fan completely melted down on a Sunday afternoon. I clicked their live booking chatbot, scheduled an immediate emergency slot, and received a text notification within 3 minutes. The technician arrived with a fully stocked truck, diagnosed the capacitor issue instantly, and restored perfect cold air to our home before the indoor temperature even hit 80. Incredible execution and transparent pricing.',
  },
  {
    id: 'whole-home-replacement',
    category: 'Whole-home system replacement',
    name: 'Elena Rostova',
    location: 'Oak Ridge Estate',
    rating: 5,
    serviceDate: '2026-09-22',
    displayDate: 'September 22, 2026',
    headline: 'Pure engineering efficiency and flawless execution.',
    body: 'We upgraded our old, loud 12-SEER unit to a new variable-capacity smart climate system. The difference is night and day—you literally cannot hear the unit running inside the house. The entire process from the digital home sizing survey to the final duct balance was completely professional. Our electricity bills dropped by 35% in the very first month. Highly recommend this team for serious home upgrades.',
  },
  {
    id: 'indoor-air-quality',
    category: 'Indoor air quality & HEPA filtration',
    name: 'David & Sarah Kim',
    location: 'Pinecrest District',
    rating: 5,
    serviceDate: '2026-10-05',
    displayDate: 'October 5, 2026',
    headline: 'A massive difference for our family’s severe allergies.',
    body: 'We had a multi-stage cyclonic purifier and HEPA filtration array installed into our central duct system to combat heavy pet dander and seasonal pollen. Within 48 hours of activation, the floating dust particles in our living room completely vanished. The air tastes incredibly fresh, and our children are finally sleeping through the night without coughing. It is worth every single penny.',
  },
  {
    id: 'automated-dispatch',
    category: 'Automated dispatch & speed',
    name: 'Chief Engineering Officer Robert Chen',
    location: 'Westside Commercial Lofts',
    rating: 5,
    serviceDate: '2026-08-19',
    displayDate: 'August 19, 2026',
    headline: 'The smartest automated service model in the city.',
    body: 'Managing a multi-unit property means I need lightning-fast responses when a climate zone fails. Their AI dispatch system routed a nearby tech to our location instantly. I received real-time tracking notes and dual automated text notifications the second the truck pulled up. No phone tags, no hold music, no wasted time. Just pure, precise trade expertise.',
  },
  {
    id: 'winter-maintenance',
    category: 'Preventative winter care',
    name: 'Clara Montgomery',
    location: 'Historic Valley Overlook',
    rating: 5,
    serviceDate: '2026-10-28',
    displayDate: 'October 28, 2026',
    headline: 'Professionalism you can trust before the deep freeze hits.',
    body: 'Had our annual winter furnace optimization and heat exchanger safety inspection completed yesterday. The specialist was polite, wore protective boot covers over our hardwood floors, and used advanced digital probes to show me exactly how clean our gas burners were functioning. They don’t push sleazy sales tactics; they just deliver solid, honest trade work.',
  },
];
