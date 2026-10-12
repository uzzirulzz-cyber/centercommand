// Demo dataset for the prototype. Every record carries its source application
// and the ORIGINAL record id from that application — records are never merged
// by name; linking requires a verified identifier (email / phone / SSO subject).
// Replace these fixtures with connector reads (lib/connectors.js).

export const CUSTOMERS = [
  { id: 'c1', name: 'Ayesha Khan', email: 'ayesha.k@example.com', source: 'playbeat-digital', sourceId: 'PBD-C-10422', linked: true, spend: 84500, currency: 'PKR', since: '2025-11-02' },
  { id: 'c2', name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', source: 'playbeat-live', sourceId: 'PBL-U-8831', linked: true, spend: 31200, currency: 'PKR', since: '2026-01-18' },
  { id: 'c3', name: 'Chen Wei', email: 'chen.wei@example.com', source: 'makethisdeal', sourceId: 'MTD-B-5520', linked: false, spend: 1290, currency: 'USD', since: '2026-03-05' },
  { id: 'c4', name: 'Fatima Noor', email: 'fatima.noor@example.com', source: 'playbeat-digital', sourceId: 'PBD-C-11710', linked: true, spend: 152750, currency: 'PKR', since: '2025-08-21' },
  { id: 'c5', name: 'Omar Farooq', email: 'omar.f@example.com', source: 'pulse-crm', sourceId: 'CRM-L-2210', linked: false, spend: 0, currency: 'PKR', since: '2026-09-30' },
  { id: 'c6', name: 'Sara Malik', email: 'sara.malik@example.com', source: 'playbeat-live', sourceId: 'PBL-U-9204', linked: true, spend: 47800, currency: 'PKR', since: '2026-02-11' },
  { id: 'c7', name: 'David Osei', email: 'd.osei@example.com', source: 'makethisdeal', sourceId: 'MTD-B-6108', linked: false, spend: 860, currency: 'USD', since: '2026-06-14' },
  { id: 'c8', name: 'Hira Shah', email: 'hira.shah@example.com', source: 'playbeat-digital', sourceId: 'PBD-C-12045', linked: true, spend: 96900, currency: 'PKR', since: '2026-04-27' },
];

export const ORDERS = [
  { id: 'o1', orderNo: 'PBD-90214', app: 'playbeat-digital', customer: 'Fatima Noor', item: 'Beat Pack Vol. 9 (License: Extended)', amount: 24500, currency: 'PKR', status: 'paid', paymentProof: 'verified', date: '2026-10-10' },
  { id: 'o2', orderNo: 'PBD-90215', app: 'playbeat-digital', customer: 'Ayesha Khan', item: 'Subscription — Pro Monthly', amount: 4999, currency: 'PKR', status: 'paid', paymentProof: 'verified', date: '2026-10-10' },
  { id: 'o3', orderNo: 'PBL-33108', app: 'playbeat-live', customer: 'Sara Malik', item: 'Live Premium — 3 months', amount: 11900, currency: 'PKR', status: 'paid', paymentProof: 'verified', date: '2026-10-09' },
  { id: 'o4', orderNo: 'PBD-90216', app: 'playbeat-digital', customer: 'Hira Shah', item: 'Sample Kit: Neon Drums', amount: 8900, currency: 'PKR', status: 'pending', paymentProof: 'awaiting review', date: '2026-10-09' },
  { id: 'o5', orderNo: 'MTD-77120', app: 'makethisdeal', customer: 'Chen Wei', item: 'Escrow fee — Listing #5520', amount: 120, currency: 'USD', status: 'paid', paymentProof: 'verified', date: '2026-10-08' },
  { id: 'o6', orderNo: 'PBL-33112', app: 'playbeat-live', customer: 'Bilal Ahmed', item: 'Live Premium — Monthly', amount: 4200, currency: 'PKR', status: 'paid', paymentProof: 'verified', date: '2026-10-08' },
  { id: 'o7', orderNo: 'PBD-90220', app: 'playbeat-digital', customer: 'Walk-in (guest)', item: 'Beat Pack Vol. 4 (License: Basic)', amount: 6500, currency: 'PKR', status: 'pending', paymentProof: 'awaiting review', date: '2026-10-07' },
  { id: 'o8', orderNo: 'PBD-90221', app: 'playbeat-digital', customer: 'Ayesha Khan', item: 'MIDI Pack: Soul Keys', amount: 5400, currency: 'PKR', status: 'refunded', paymentProof: 'n/a', date: '2026-10-06' },
];

export const PRODUCTS = [
  { sku: 'PBD-P-104', name: 'Beat Pack Vol. 9', type: 'Digital license', price: 24500, currency: 'PKR', licenses: 512, status: 'active' },
  { sku: 'PBD-P-098', name: 'Sample Kit: Neon Drums', type: 'Digital license', price: 8900, currency: 'PKR', licenses: 1044, status: 'active' },
  { sku: 'PBD-P-091', name: 'MIDI Pack: Soul Keys', type: 'Digital license', price: 5400, currency: 'PKR', licenses: 380, status: 'active' },
  { sku: 'PBD-S-002', name: 'Subscription — Pro Monthly', type: 'Subscription', price: 4999, currency: 'PKR', licenses: 2912, status: 'active' },
  { sku: 'PBD-P-077', name: 'Beat Pack Vol. 4', type: 'Digital license', price: 6500, currency: 'PKR', licenses: 0, status: 'archived' },
];

export const CHANNELS = [
  { id: 'ch1', name: 'PlayBeat One', category: 'Music', status: 'live', viewers: 8210, health: 'healthy', playlist: 'Main Rotation' },
  { id: 'ch2', name: 'Pulse Radio', category: 'Radio', status: 'live', viewers: 4105, health: 'healthy', playlist: 'Night Drive' },
  { id: 'ch3', name: 'Desi Beats TV', category: 'Entertainment', status: 'live', viewers: 3922, health: 'degraded', playlist: 'Weekend Mix' },
  { id: 'ch4', name: 'LoFi Lounge', category: 'Chill', status: 'live', viewers: 2205, health: 'healthy', playlist: 'LoFi 24/7' },
  { id: 'ch5', name: 'Classics Vault', category: 'Archive', status: 'offline', viewers: 0, health: 'offline', playlist: '—' },
];

export const MATCHES = [
  { id: 'm1', league: 'PSL', home: 'Lahore Qalandars', away: 'Karachi Kings', time: '2026-10-11 19:00', status: 'scheduled', channel: 'MagXTV Sports 1', health: 'ready' },
  { id: 'm2', league: 'EPL', home: 'Arsenal', away: 'Chelsea', time: '2026-10-11 16:30', status: 'live', channel: 'MagXTV Sports 2', health: 'degraded' },
  { id: 'm3', league: 'EPL', home: 'Liverpool', away: 'Man United', time: '2026-10-11 14:00', status: 'live', channel: 'MagXTV Sports 1', health: 'healthy' },
  { id: 'm4', league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', time: '2026-10-10 21:00', status: 'finished', channel: 'MagXTV Sports 3', health: 'healthy' },
  { id: 'm5', league: 'T20 Intl', home: 'Pakistan', away: 'Australia', time: '2026-10-12 18:30', status: 'scheduled', channel: 'MagXTV Sports 1', health: 'ready' },
];

export const DEALS = [
  { id: 'd1', title: 'Restaurant franchise — Lahore DHA', category: 'Franchise', status: 'active', enquiries: 14, value: 18500000, currency: 'PKR' },
  { id: 'd2', title: 'E-commerce logistics stake (12%)', category: 'Equity', status: 'negotiation', enquiries: 6, value: 9200000, currency: 'PKR' },
  { id: 'd3', title: 'Used printing press — Heidelberg', category: 'Equipment', status: 'active', enquiries: 9, value: 4750, currency: 'USD' },
  { id: 'd4', title: 'Boutique hotel lease — Murree', category: 'Real estate', status: 'closed', enquiries: 21, value: 62000000, currency: 'PKR' },
  { id: 'd5', title: 'Mobile app portfolio acquisition', category: 'Digital', status: 'active', enquiries: 3, value: 11800, currency: 'USD' },
];

export const LEADS = [
  { id: 'l1', name: 'Omar Farooq', stage: 'New', owner: 'Unassigned', value: 150000, currency: 'PKR', channel: 'Website form', lastTouch: '2026-10-10' },
  { id: 'l2', name: 'Ayesha Khan', stage: 'Contacted', owner: 'S. Raza', value: 240000, currency: 'PKR', channel: 'WhatsApp', lastTouch: '2026-10-10' },
  { id: 'l3', name: 'Chen Wei', stage: 'Qualified', owner: 'M. Imran', value: 1290, currency: 'USD', channel: 'Facebook', lastTouch: '2026-10-09' },
  { id: 'l4', name: 'Hira Shah', stage: 'Proposal', owner: 'S. Raza', value: 420000, currency: 'PKR', channel: 'Instagram', lastTouch: '2026-10-08' },
  { id: 'l5', name: 'Fatima Noor', stage: 'Won', owner: 'A. Siddiqui', value: 610000, currency: 'PKR', channel: 'WhatsApp', lastTouch: '2026-10-05' },
  { id: 'l6', name: 'David Osei', stage: 'New', owner: 'Unassigned', value: 860, currency: 'USD', channel: 'Website form', lastTouch: '2026-10-11' },
];

export const STAFF = [
  { name: 'Uzzirul Z.', email: 'admin@playbeat.digital', role: 'Super Admin', apps: 'All applications', status: 'active', lastActive: '2026-10-11 09:44' },
  { name: 'Sana Raza', email: 'sana@playbeat.digital', role: 'Sales', apps: 'Pulse CRM, MakeThisDeal', status: 'active', lastActive: '2026-10-11 09:12' },
  { name: 'M. Imran', email: 'imran@playbeat.digital', role: 'App Admin', apps: 'PlayBeat.live, MagXTV', status: 'active', lastActive: '2026-10-11 08:57' },
  { name: 'A. Siddiqui', email: 'siddiqui@playbeat.digital', role: 'Support', apps: 'PlayBeat.digital', status: 'active', lastActive: '2026-10-10 22:31' },
  { name: 'K. Nadeem', email: 'nadeem@playbeat.digital', role: 'Read-only', apps: 'All applications', status: 'invited', lastActive: '—' },
];

export const AUDIT = [
  { time: '2026-10-11 09:42', actor: 'system', action: 'Sync completed', target: 'PlayBeat.digital (orders)', app: 'playbeat-digital', result: 'success' },
  { time: '2026-10-11 09:31', actor: 'system', action: 'Sync completed', target: 'MakeThisDeal.biz (enquiries)', app: 'makethisdeal', result: 'success' },
  { time: '2026-10-11 09:12', actor: 'sana@playbeat.digital', action: 'Lead reassigned', target: 'CRM-L-2210 → S. Raza', app: 'pulse-crm', result: 'success' },
  { time: '2026-10-11 08:57', actor: 'system', action: 'Sync degraded — timeout', target: 'MagXTV.click (ingest)', app: 'magxtv', result: 'warning' },
  { time: '2026-10-10 21:05', actor: 'imran@playbeat.digital', action: 'Channel restarted', target: 'Desi Beats TV', app: 'playbeat-live', result: 'success' },
  { time: '2026-10-10 18:22', actor: 'admin@playbeat.digital', action: 'Role changed', target: 'K. Nadeem → Read-only', app: 'playbeat-digital', result: 'success' },
];

export const NOTIFICATIONS = [
  { id: 'n1', tone: 'warning', text: 'MagXTV ingest degraded — last successful sync 08:57 UTC', time: '09:05' },
  { id: 'n2', tone: 'info', text: 'Pulse CRM requires configuration before it can connect', time: '08:40' },
  { id: 'n3', tone: 'warning', text: '7 payment proofs awaiting review on PlayBeat.digital', time: '08:15' },
  { id: 'n4', tone: 'success', text: 'Nightly deduplication completed — 0 duplicates', time: '03:00' },
];
