#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadCatalog(repoRoot) {
  const payload = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, 'data/blueprints/catalog.json'), 'utf8')
  );
  return payload.blueprints || [];
}

function buildProfiles() {
  return {
    'bp-001-rideshare-platform-v1': {
      domain: 'Rideshare Mobility',
      teams: [
        'Rider Experience',
        'Driver Platform',
        'Dispatch and Matching',
        'Pricing and Incentives',
        'Trip Ledger',
        'Payments and Risk',
        'Maps and ETA',
        'Safety and Trust',
      ],
      services: [
        'Rider App Gateway',
        'Driver App Gateway',
        'Dispatch Engine',
        'Dynamic Pricing',
        'Trip Orchestration',
        'Payment Processing',
        'Geospatial ETA',
        'Safety Incident Response',
      ],
    },
    'bp-002-food-delivery-platform-v1': {
      domain: 'Food Delivery Marketplace',
      teams: [
        'Consumer Ordering',
        'Merchant Platform',
        'Courier Operations',
        'Dispatch and Routing',
        'Catalog and Search',
        'Checkout and Payments',
        'Growth and Promotions',
        'Delivery Reliability',
      ],
      services: [
        'Consumer Ordering Gateway',
        'Merchant Storefront Service',
        'Courier App Service',
        'Dispatch and ETA Service',
        'Menu Catalog Service',
        'Checkout Service',
        'Promotion Engine',
        'Delivery SLA Monitoring',
      ],
    },
    'bp-003-grocery-delivery-platform-v1': {
      domain: 'Grocery Commerce',
      teams: [
        'Customer Grocery App',
        'Inventory and Availability',
        'Picker Experience',
        'Substitution Intelligence',
        'Fulfillment Routing',
        'Checkout and Wallet',
        'Retailer Integrations',
        'Trust and Quality',
      ],
      services: [
        'Grocery Discovery Service',
        'Live Inventory Service',
        'Picker Task Service',
        'Substitution Recommendation Service',
        'Fulfillment Routing Service',
        'Checkout and Wallet Service',
        'Retail Partner Integration Service',
        'Order Quality Assurance Service',
      ],
    },
    'bp-004-last-mile-courier-network-v1': {
      domain: 'Last Mile Logistics',
      teams: [
        'Customer Booking',
        'Courier Partner Success',
        'Routing Intelligence',
        'Fleet Telemetry',
        'Delivery Proof and Compliance',
        'Billing and Settlement',
        'Operations Command',
        'Reliability Engineering',
      ],
      services: [
        'Pickup Booking Service',
        'Courier Assignment Service',
        'Route Optimization Service',
        'Fleet Telemetry Service',
        'Proof of Delivery Service',
        'Settlement and Billing Service',
        'Operations Control Service',
        'Delivery Reliability Service',
      ],
    },
    'bp-005-home-services-marketplace-v1': {
      domain: 'Home Services Marketplace',
      teams: [
        'Customer Booking',
        'Provider Onboarding',
        'Matching Marketplace',
        'Pricing and Quotes',
        'Scheduling and Availability',
        'Escrow and Payments',
        'Trust and Reviews',
        'Support Operations',
      ],
      services: [
        'Home Service Discovery Service',
        'Provider Profile Service',
        'Job Matching Service',
        'Quote and Pricing Service',
        'Scheduling Service',
        'Escrow Payment Service',
        'Review and Reputation Service',
        'Customer Support Case Service',
      ],
    },
    'bp-006-freelance-talent-marketplace-v1': {
      domain: 'Freelance Talent Marketplace',
      teams: [
        'Client Job Posting',
        'Talent Profiles',
        'Matching and Discovery',
        'Proposal and Contracting',
        'Work Delivery and Milestones',
        'Payments and Escrow',
        'Trust and Compliance',
        'Growth and Retention',
      ],
      services: [
        'Job Posting Service',
        'Freelancer Profile Service',
        'Talent Match Service',
        'Proposal Workflow Service',
        'Milestone Tracking Service',
        'Escrow and Payout Service',
        'Identity and Compliance Service',
        'Retention Analytics Service',
      ],
    },
    'bp-007-accommodation-marketplace-v1': {
      domain: 'Accommodation Marketplace',
      teams: [
        'Guest Experience',
        'Host Experience',
        'Listing Quality',
        'Search and Discovery',
        'Booking and Calendar',
        'Pricing and Revenue',
        'Payments and Fraud',
        'Trust and Safety',
      ],
      services: [
        'Guest Booking Gateway',
        'Host Listing Service',
        'Listing Moderation Service',
        'Search Ranking Service',
        'Calendar and Availability Service',
        'Dynamic Pricing Service',
        'Payment and Chargeback Service',
        'Safety Incident Service',
      ],
    },
    'bp-008-travel-booking-aggregator-v1': {
      domain: 'Travel Booking Aggregation',
      teams: [
        'Search Aggregation',
        'Supplier Connectivity',
        'Booking Checkout',
        'Pricing Intelligence',
        'Itinerary Management',
        'Notifications and Messaging',
        'Customer Service',
        'Risk and Compliance',
      ],
      services: [
        'Travel Search Aggregator Service',
        'Supplier API Integration Service',
        'Booking Checkout Service',
        'Fare Pricing Service',
        'Itinerary Service',
        'Travel Notification Service',
        'Customer Support Service',
        'Travel Risk Service',
      ],
    },
    'bp-009-car-rental-marketplace-v1': {
      domain: 'Car Rental Marketplace',
      teams: [
        'Renter Experience',
        'Host Vehicle Supply',
        'Vehicle Discovery',
        'Reservation and Scheduling',
        'Pricing and Insurance',
        'Identity and Verification',
        'Claims and Disputes',
        'Operations and Support',
      ],
      services: [
        'Vehicle Listing Service',
        'Host Fleet Service',
        'Availability Search Service',
        'Reservation Service',
        'Insurance Pricing Service',
        'Identity Verification Service',
        'Claims Processing Service',
        'Support Operations Service',
      ],
    },
    'bp-010-used-goods-marketplace-v1': {
      domain: 'Used Goods Marketplace',
      teams: [
        'Buyer Experience',
        'Seller Experience',
        'Listing and Catalog',
        'Search and Ranking',
        'Bidding and Offers',
        'Checkout and Logistics',
        'Fraud Prevention',
        'Customer Trust',
      ],
      services: [
        'Listing Service',
        'Seller Inventory Service',
        'Marketplace Search Service',
        'Ranking and Relevance Service',
        'Auction and Offer Service',
        'Checkout and Shipping Service',
        'Fraud Detection Service',
        'Reputation and Trust Service',
      ],
    },
    'bp-011-ticket-resale-marketplace-v1': {
      domain: 'Ticket Resale Marketplace',
      teams: [
        'Buyer Checkout',
        'Seller Listing',
        'Inventory Ingestion',
        'Pricing and Marketplace',
        'Fraud and Authenticity',
        'Fulfillment and Delivery',
        'Event Integrations',
        'Support and Disputes',
      ],
      services: [
        'Ticket Listing Service',
        'Seller Payout Service',
        'Inventory Sync Service',
        'Marketplace Pricing Service',
        'Ticket Authenticity Service',
        'Digital Ticket Delivery Service',
        'Event Partner Integration Service',
        'Dispute Resolution Service',
      ],
    },
    'bp-012-b2b-procurement-marketplace-v1': {
      domain: 'B2B Procurement Marketplace',
      teams: [
        'Buyer Workflows',
        'Supplier Onboarding',
        'Catalog and Contracts',
        'Purchase Approval',
        'Spend and Budget Controls',
        'Invoice and Payments',
        'Compliance and Audit',
        'Enterprise Integrations',
      ],
      services: [
        'Supplier Directory Service',
        'Procurement Catalog Service',
        'Purchase Requisition Service',
        'Approval Workflow Service',
        'Spend Control Service',
        'Invoice Matching Service',
        'Audit Compliance Service',
        'ERP Integration Service',
      ],
    },
    'bp-013-short-video-social-network-v1': {
      domain: 'Short Video Social',
      teams: [
        'Creator Capture',
        'Feed Ranking',
        'Content Moderation',
        'Social Graph',
        'Comments and Interaction',
        'Live Ops and Campaigns',
        'Monetization and Ads',
        'Core Platform',
      ],
      services: [
        'Video Upload Service',
        'Personalized Feed Service',
        'Moderation Pipeline Service',
        'Follow Graph Service',
        'Engagement Interaction Service',
        'Campaign Orchestration Service',
        'Ads Delivery Service',
        'Creator Analytics Service',
      ],
    },
    'bp-014-photo-sharing-social-app-v1': {
      domain: 'Photo Social Platform',
      teams: [
        'Capture and Editing',
        'Timeline Experience',
        'Stories and Reels',
        'Discovery and Hashtags',
        'Messaging and Sharing',
        'Safety and Moderation',
        'Ads and Commerce',
        'Core Platform',
      ],
      services: [
        'Photo Upload Service',
        'Timeline Service',
        'Stories Service',
        'Explore Search Service',
        'Direct Messaging Service',
        'Moderation Service',
        'Ads Targeting Service',
        'Creator Commerce Service',
      ],
    },
    'bp-015-professional-network-v1': {
      domain: 'Professional Network',
      teams: [
        'Identity and Profiles',
        'Connections and Graph',
        'Content and Feed',
        'Jobs and Hiring',
        'Messaging and Collaboration',
        'Trust and Safety',
        'Ads and Premium',
        'Enterprise Integrations',
      ],
      services: [
        'Professional Profile Service',
        'Connection Graph Service',
        'Feed Ranking Service',
        'Job Marketplace Service',
        'Professional Messaging Service',
        'Abuse Detection Service',
        'Premium Subscription Service',
        'Enterprise Talent API Service',
      ],
    },
    'bp-016-community-forum-platform-v1': {
      domain: 'Community Discussion Platform',
      teams: [
        'Community and Moderation',
        'Thread and Commenting',
        'Ranking and Discovery',
        'Identity and Reputation',
        'Messaging and Notifications',
        'Trust and Safety',
        'Ads and Monetization',
        'Core Platform',
      ],
      services: [
        'Community Management Service',
        'Thread Service',
        'Comment Service',
        'Ranking and Hotness Service',
        'Reputation Service',
        'Notification Service',
        'Moderation Enforcement Service',
        'Ads Marketplace Service',
      ],
    },
    'bp-017-creator-subscription-platform-v1': {
      domain: 'Creator Subscription Platform',
      teams: [
        'Creator Studio',
        'Membership and Billing',
        'Content Publishing',
        'Fan Engagement',
        'Discovery and Growth',
        'Payouts and Finance',
        'Trust and Compliance',
        'Analytics and Insights',
      ],
      services: [
        'Creator Account Service',
        'Membership Billing Service',
        'Content Delivery Service',
        'Fan Interaction Service',
        'Growth Discovery Service',
        'Creator Payout Service',
        'Policy Compliance Service',
        'Creator Analytics Service',
      ],
    },
    'bp-018-live-streaming-platform-v1': {
      domain: 'Live Streaming Platform',
      teams: [
        'Broadcaster Tools',
        'Streaming Ingest',
        'Playback Delivery',
        'Chat and Community',
        'Moderation and Safety',
        'Monetization and Subs',
        'Recommendations and Discovery',
        'Platform Reliability',
      ],
      services: [
        'Stream Ingest Service',
        'Transcoding Service',
        'Playback Delivery Service',
        'Live Chat Service',
        'Moderation Control Service',
        'Subscription Revenue Service',
        'Discovery Feed Service',
        'Stream Health Service',
      ],
    },
    'bp-019-podcast-distribution-platform-v1': {
      domain: 'Podcast Distribution Platform',
      teams: [
        'Creator Publishing',
        'Catalog and Discovery',
        'Playback Experience',
        'Recommendations',
        'Ads and Sponsorship',
        'Subscription and Billing',
        'Analytics and Reporting',
        'Rights and Compliance',
      ],
      services: [
        'Podcast Publishing Service',
        'Podcast Catalog Service',
        'Playback Session Service',
        'Recommendation Service',
        'Dynamic Ad Insertion Service',
        'Subscription Billing Service',
        'Podcast Analytics Service',
        'Rights Management Service',
      ],
    },
    'bp-020-newsletter-publishing-platform-v1': {
      domain: 'Newsletter Publishing Platform',
      teams: [
        'Author Workspace',
        'Subscriber Growth',
        'Delivery Infrastructure',
        'Payments and Subscriptions',
        'Analytics and Insights',
        'Anti-abuse and Compliance',
        'Recommendations and Discovery',
        'Support and Operations',
      ],
      services: [
        'Newsletter Editor Service',
        'Subscriber List Service',
        'Campaign Delivery Service',
        'Subscription Checkout Service',
        'Engagement Analytics Service',
        'Compliance and Suppression Service',
        'Recommendation Service',
        'Support Case Service',
      ],
    },
    'bp-021-music-streaming-platform-v1': {
      domain: 'Music Streaming Platform',
      teams: [
        'Catalog and Rights',
        'Playback and Streaming',
        'Recommendations',
        'Search and Discovery',
        'Social and Sharing',
        'Subscriptions and Billing',
        'Ads and Monetization',
        'Artist and Label Tools',
      ],
      services: [
        'Music Catalog Service',
        'Playback Session Service',
        'Recommendation Engine Service',
        'Search and Discovery Service',
        'Social Sharing Service',
        'Subscription Billing Service',
        'Ads Delivery Service',
        'Artist Analytics Service',
      ],
    },
    'bp-022-ott-video-streaming-platform-v1': {
      domain: 'OTT Video Streaming',
      teams: [
        'Content Ingestion',
        'Transcoding and Packaging',
        'Playback Platform',
        'Personalization and Discovery',
        'Subscriptions and Entitlements',
        'Ads and Monetization',
        'Trust and Compliance',
        'Reliability Engineering',
      ],
      services: [
        'Content Ingestion Service',
        'Transcode Orchestration Service',
        'Playback API Service',
        'Discovery and Recommendations Service',
        'Entitlements Service',
        'Ads Decision Service',
        'Parental Controls Service',
        'Streaming Reliability Service',
      ],
    },
    'bp-023-personalized-news-platform-v1': {
      domain: 'Personalized News Platform',
      teams: [
        'Content Ingestion',
        'Editorial Curation',
        'Ranking and Personalization',
        'Search and Discovery',
        'Notifications and Digests',
        'Subscription and Revenue',
        'Safety and Policy',
        'Analytics and Experimentation',
      ],
      services: [
        'News Ingestion Service',
        'Editorial Workflow Service',
        'Personalization Ranking Service',
        'Search Service',
        'Digest and Notification Service',
        'Subscription Paywall Service',
        'Policy Enforcement Service',
        'Experimentation Analytics Service',
      ],
    },
    'bp-024-social-messaging-platform-v1': {
      domain: 'Messaging Platform',
      teams: [
        'Identity and Contacts',
        'Messaging Core',
        'Media and Attachments',
        'Voice and Video Calls',
        'Groups and Communities',
        'Encryption and Security',
        'Anti-abuse and Safety',
        'Platform Reliability',
      ],
      services: [
        'Identity and Contact Service',
        'Message Delivery Service',
        'Media Storage Service',
        'Calling Session Service',
        'Group Membership Service',
        'Key Management Service',
        'Abuse Prevention Service',
        'Messaging Reliability Service',
      ],
    },
    'bp-025-digital-wallet-platform-v1': {
      domain: 'Digital Wallet',
      teams: [
        'Wallet Accounts',
        'Funding and Top-ups',
        'Payments and Transfers',
        'Merchant Integrations',
        'Risk and Fraud',
        'Compliance and KYC',
        'Disputes and Chargebacks',
        'Ledger and Reconciliation',
      ],
      services: [
        'Wallet Account Service',
        'Balance Ledger Service',
        'Funding Source Service',
        'P2P Transfer Service',
        'Merchant Payment Service',
        'Fraud Scoring Service',
        'KYC and Compliance Service',
        'Dispute Case Service',
        'Settlement and Reconciliation Service',
        'Notification Service',
        'Reporting and Audit Service',
      ],
    },
  };
}

const FIRST_NAMES = [
  'Avery',
  'Jordan',
  'Morgan',
  'Sofia',
  'Darius',
  'Leila',
  'Noah',
  'Maya',
  'Ethan',
  'Priya',
  'Luca',
  'Zara',
  'Mateo',
  'Aisha',
  'Rohan',
  'Amelia',
  'Kai',
  'Nina',
  'Diego',
  'Elena',
  'Omar',
  'Hana',
  'Arjun',
  'Sienna',
  'Victor',
  'Layla',
  'Theo',
  'Naomi',
  'Jonah',
  'Rina',
  'Mila',
  'Dev',
  'Harper',
  'Ivy',
  'Jules',
  'Mina',
  'Reza',
  'Keiko',
];

const LAST_NAMES = [
  'Chen',
  'Patel',
  'Kim',
  'Rodriguez',
  'Singh',
  'Nguyen',
  'Garcia',
  'Williams',
  'Lopez',
  'Brown',
  'Davis',
  'Khan',
  'Martinez',
  'Anderson',
  'Wright',
  'Scott',
  'Hill',
  'Torres',
  'Carter',
  'Murphy',
  'Bennett',
  'Cooper',
  'Russell',
  'Hughes',
  'Foster',
  'Parker',
  'Evans',
  'Shah',
  'Ibrahim',
  'Morrison',
];

const TEAM_ACTIVITY_CATALOG = [
  { name: 'Incident Readiness Drill', value: 2, estimateType: 'perSDE' },
  { name: 'Domain Deep-Dive Training', value: 3, estimateType: 'perSDE' },
  { name: 'Cross-Team Architecture Reviews', value: 2, estimateType: 'flat' },
  { name: 'Quarterly Reliability GameDay', value: 1, estimateType: 'flat' },
  { name: 'Customer Discovery Sprint', value: 2, estimateType: 'perSDE' },
  { name: 'Security Controls Hardening', value: 2, estimateType: 'flat' },
];

const INITIATIVE_BLUEPRINTS = [
  {
    action: 'Scale',
    focus: 'core throughput and adoption',
    yearOffset: 0,
    status: 'Completed',
    goalIndex: 0,
    themeIndex: 0,
    serviceOffsets: [0, 1],
    isProtected: false,
  },
  {
    action: 'Harden reliability of',
    focus: 'availability and fault isolation',
    yearOffset: 0,
    status: 'Completed',
    goalIndex: 1,
    themeIndex: 1,
    serviceOffsets: [1, 2],
    isProtected: true,
  },
  {
    action: 'Launch MVP scope for',
    focus: 'market expansion readiness',
    yearOffset: 0,
    status: 'In Progress',
    goalIndex: 0,
    themeIndex: 0,
    serviceOffsets: [2, 3],
    isProtected: false,
  },
  {
    action: 'Automate operations in',
    focus: 'operational consistency',
    yearOffset: 0,
    status: 'In Progress',
    goalIndex: 5,
    themeIndex: 5,
    serviceOffsets: [3, 4],
    isProtected: true,
  },
  {
    action: 'Improve conversion journeys in',
    focus: 'funnel efficiency and activation',
    yearOffset: 0,
    status: 'Committed',
    goalIndex: 3,
    themeIndex: 3,
    serviceOffsets: [4, 5],
    isProtected: false,
  },
  {
    action: 'Strengthen trust controls in',
    focus: 'risk, abuse, and policy enforcement',
    yearOffset: 0,
    status: 'Committed',
    goalIndex: 2,
    themeIndex: 2,
    serviceOffsets: [5, 6],
    isProtected: true,
  },
  {
    action: 'Expand observability coverage across',
    focus: 'SLO and incident transparency',
    yearOffset: 0,
    status: 'Defined',
    goalIndex: 1,
    themeIndex: 1,
    serviceOffsets: [6, 7],
    isProtected: true,
  },
  {
    action: 'Optimize unit economics for',
    focus: 'cost-to-serve and margin protection',
    yearOffset: 0,
    status: 'Backlog',
    goalIndex: 5,
    themeIndex: 4,
    serviceOffsets: [7, 0],
    isProtected: false,
  },
  {
    action: 'Enable experimentation platform hooks in',
    focus: 'faster hypothesis validation',
    yearOffset: 0,
    status: 'Backlog',
    goalIndex: 3,
    themeIndex: 3,
    serviceOffsets: [0, 4],
    isProtected: false,
  },
  {
    action: 'Regionalize',
    focus: 'multi-market regulatory readiness',
    yearOffset: 1,
    status: 'Defined',
    goalIndex: 4,
    themeIndex: 4,
    serviceOffsets: [1, 5],
    isProtected: true,
  },
  {
    action: 'Open partner APIs for',
    focus: 'ecosystem integrations',
    yearOffset: 1,
    status: 'Committed',
    goalIndex: 0,
    themeIndex: 0,
    serviceOffsets: [2, 6],
    isProtected: false,
  },
  {
    action: 'Uplift compliance and audit trails in',
    focus: 'enterprise governance controls',
    yearOffset: 1,
    status: 'Defined',
    goalIndex: 2,
    themeIndex: 2,
    serviceOffsets: [3, 7],
    isProtected: true,
  },
  {
    action: 'Deliver personalization evolution on',
    focus: 'retention and lifecycle expansion',
    yearOffset: 1,
    status: 'Backlog',
    goalIndex: 3,
    themeIndex: 3,
    serviceOffsets: [4, 0],
    isProtected: false,
  },
  {
    action: 'Modernize architecture boundaries for',
    focus: 'sustainable platform scaling',
    yearOffset: 2,
    status: 'Backlog',
    goalIndex: 4,
    themeIndex: 4,
    serviceOffsets: [5, 1],
    isProtected: true,
  },
  {
    action: 'Enable new monetization surfaces in',
    focus: 'next-wave revenue streams',
    yearOffset: 2,
    status: 'Defined',
    goalIndex: 3,
    themeIndex: 3,
    serviceOffsets: [6, 2],
    isProtected: false,
  },
];

function hashText(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function toIdToken(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toAcronym(text, fallback = 'TEAM') {
  const tokens = String(text || '')
    .split(/[^A-Za-z0-9]+/g)
    .filter(Boolean);
  if (tokens.length === 0) return fallback;
  return tokens
    .map((token) => token[0].toUpperCase())
    .join('')
    .slice(0, 6);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function splitDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);
  const midDate = formatDate(
    midpoint.getUTCFullYear(),
    midpoint.getUTCMonth() + 1,
    midpoint.getUTCDate()
  );
  return {
    startDate,
    midDate,
    endDate,
  };
}

function quarterWindow(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    startDate: formatDate(year, startMonth, 6),
    endDate: formatDate(year, endMonth, 24),
  };
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function pickUniqueName(seed, offset, usedNames) {
  let cursor = Number(offset || 0);
  for (let attempts = 0; attempts < 300; attempts += 1) {
    const first = FIRST_NAMES[(seed + cursor * 3) % FIRST_NAMES.length];
    const last = LAST_NAMES[(seed * 7 + cursor * 5) % LAST_NAMES.length];
    const candidate = `${first} ${last}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    cursor += 1;
  }
  const fallback = `User ${seed}-${offset}`;
  usedNames.add(fallback);
  return fallback;
}

function inferPlatformDependencies(serviceName, category) {
  const text = `${serviceName} ${category}`.toLowerCase();
  const dependencies = new Set(['PostgreSQL', 'Redis', 'Kafka']);

  if (/search|discovery|ranking|recommendation/.test(text)) {
    dependencies.add('OpenSearch');
    dependencies.add('Feature Store');
  }
  if (/video|stream|media|transcode|podcast/.test(text)) {
    dependencies.add('Object Storage');
    dependencies.add('CDN Edge Network');
  }
  if (/payment|wallet|billing|settlement|escrow|payout|chargeback/.test(text)) {
    dependencies.add('Payment Gateway');
    dependencies.add('PCI Token Vault');
  }
  if (/fraud|risk|trust|safety|policy|abuse|compliance|kyc/.test(text)) {
    dependencies.add('Rules Engine');
    dependencies.add('Audit Event Store');
  }
  if (/map|route|eta|dispatch|fleet|geospatial/.test(text)) {
    dependencies.add('Geospatial Index');
    dependencies.add('Routing Optimizer');
  }
  if (/notification|message|chat|email|voice|calling/.test(text)) {
    dependencies.add('Notification Gateway');
    dependencies.add('WebSocket Broker');
  }
  if (/identity|auth|profile|account/.test(text)) {
    dependencies.add('Identity Provider');
    dependencies.add('Secrets Manager');
  }
  if (/analytics|reporting|insight|experiment/.test(text)) {
    dependencies.add('Data Warehouse');
    dependencies.add('Metrics Store');
  }
  if (/ads|monetization|subscription/.test(text)) {
    dependencies.add('Billing Processor');
    dependencies.add('A/B Experiment Platform');
  }

  return Array.from(dependencies);
}

function buildSkillSet(teamName, serviceName, level) {
  const text = `${teamName} ${serviceName}`.toLowerCase();
  const skills = new Set();

  const maybeAdd = (pattern, values) => {
    if (pattern.test(text)) values.forEach((value) => skills.add(value));
  };

  maybeAdd(/search|discovery|ranking/, ['Search Relevance', 'OpenSearch', 'Experimentation']);
  maybeAdd(/payment|wallet|billing|settlement|payout|checkout/, [
    'Payment Integrations',
    'Ledger Consistency',
    'Risk Controls',
  ]);
  maybeAdd(/dispatch|route|fleet|eta|courier|delivery|trip/, [
    'Optimization Algorithms',
    'Geospatial Systems',
    'Real-time Eventing',
  ]);
  maybeAdd(/video|stream|media|podcast|content/, [
    'Media Pipelines',
    'CDN Optimization',
    'Storage',
  ]);
  maybeAdd(/safety|trust|fraud|policy|compliance|kyc/, [
    'Abuse Detection',
    'Policy Enforcement',
    'Audit Tooling',
  ]);
  maybeAdd(/profile|identity|account|member/, [
    'Identity Systems',
    'Authorization',
    'Data Privacy',
  ]);
  maybeAdd(/message|chat|notification|voice|calling/, [
    'Messaging Infrastructure',
    'WebSocket Systems',
    'Alerting',
  ]);
  maybeAdd(/analytics|reporting|insight|experiment/, [
    'Analytics Modeling',
    'Data Warehousing',
    'KPI Design',
  ]);

  skills.add('Distributed Systems');
  skills.add('Service Ownership');
  skills.add(level >= 4 ? 'System Design' : 'API Development');

  return Array.from(skills).slice(0, 6);
}

function buildSeniorManagers(profile, seed) {
  const usedNames = new Set();
  const sm1 = pickUniqueName(seed, 1, usedNames);
  const sm2 = pickUniqueName(seed, 2, usedNames);
  return {
    seniorManagers: [
      {
        seniorManagerId: 'srmgr-01',
        seniorManagerName: `${sm1} (VP Platform)`,
        attributes: { domain: profile.domain, focus: 'Core Platform and Reliability' },
      },
      {
        seniorManagerId: 'srmgr-02',
        seniorManagerName: `${sm2} (VP Product Engineering)`,
        attributes: { domain: profile.domain, focus: 'Product Growth and Monetization' },
      },
    ],
    usedNames,
  };
}

function buildPeopleAndTeams(entry, profile, seed) {
  const { seniorManagers, usedNames } = buildSeniorManagers(profile, seed);
  const sdms = [];
  const pmts = [];
  const projectManagers = [];
  const teams = [];
  const allKnownEngineers = [];

  for (let i = 0; i < 3; i += 1) {
    const pmName = pickUniqueName(seed, 20 + i, usedNames);
    projectManagers.push({
      pmId: `pm-${pad2(i + 1)}`,
      pmName: `${pmName} (Program Manager)`,
      attributes: {
        domain: profile.domain,
      },
    });
  }

  profile.teams.forEach((teamName, index) => {
    const teamId = `team-${pad2(index + 1)}`;
    const sdmId = `sdm-${pad2(index + 1)}`;
    const pmtId = `pmt-${pad2(index + 1)}`;
    const assignedSeniorManager = seniorManagers[index % seniorManagers.length];

    const sdmName = pickUniqueName(seed, 40 + index, usedNames);
    const pmtName = pickUniqueName(seed, 80 + index, usedNames);

    sdms.push({
      sdmId,
      sdmName: `${sdmName} (SDM)`,
      seniorManagerId: assignedSeniorManager.seniorManagerId,
      attributes: {
        domain: profile.domain,
        mission: teamName,
      },
    });
    pmts.push({
      pmtId,
      pmtName: `${pmtName} (PMT)`,
      attributes: {
        domain: profile.domain,
        mission: teamName,
      },
    });

    const engineerCount = 4 + ((seed + index) % 2) + (index % 3 === 0 ? 1 : 0);
    const engineerNames = [];
    const awayTeamMembers = [];
    const serviceName = profile.services[index % profile.services.length];

    for (let e = 0; e < engineerCount; e += 1) {
      const engName = pickUniqueName(seed, 200 + index * 11 + e, usedNames);
      const level = Math.max(1, 5 - Math.floor(e / 2) - (index % 2));
      const isAISWE = e === engineerCount - 1 && index % 3 === 0;
      engineerNames.push(engName);
      allKnownEngineers.push({
        engineerId: `eng-${pad2(index + 1)}-${pad2(e + 1)}`,
        name: engName,
        level,
        currentTeamId: teamId,
        attributes: {
          isAISWE,
          aiAgentType: isAISWE ? 'Code Generation and Quality Assistant' : null,
          skills: buildSkillSet(teamName, serviceName, level),
          yearsOfExperience: level + 1 + (e % 3),
        },
      });
    }

    if (index % 3 === 1) {
      const awayName = pickUniqueName(seed, 500 + index, usedNames);
      awayTeamMembers.push({
        awayMemberId: `away-${teamId}-01`,
        name: `${awayName} (Partner Contractor)`,
        level: 3,
        sourceTeam: 'Partner Network',
        attributes: {
          engagementMonths: 6 + (index % 4),
        },
      });
    }

    const directToSenior = index % 5 === 0;
    const fundedHeadcount = engineerCount + awayTeamMembers.length + 1 + (index % 2);

    teams.push({
      teamId,
      teamName,
      teamIdentity: toAcronym(teamName, `T${index + 1}`),
      fundedHeadcount,
      engineers: engineerNames,
      awayTeamMembers,
      sdmId: directToSenior ? null : sdmId,
      seniorManagerId: directToSenior ? assignedSeniorManager.seniorManagerId : null,
      pmtId,
      teamCapacityAdjustments: {
        leaveUptakeEstimates: [],
        variableLeaveImpact: {
          maternity: { affectedSDEs: index % 4 === 0 ? 1 : 0, avgDaysPerAffectedSDE: 30 },
          paternity: { affectedSDEs: index % 4 === 1 ? 1 : 0, avgDaysPerAffectedSDE: 10 },
          familyResp: { affectedSDEs: index % 4 === 2 ? 1 : 0, avgDaysPerAffectedSDE: 8 },
          medical: { affectedSDEs: index % 4 === 3 ? 1 : 0, avgDaysPerAffectedSDE: 6 },
        },
        teamActivities: [
          deepClone(TEAM_ACTIVITY_CATALOG[(seed + index) % TEAM_ACTIVITY_CATALOG.length]),
        ],
        avgOverheadHoursPerWeekPerSDE: 4 + (index % 4),
        aiProductivityGainPercent: 8 + ((seed + index) % 18),
        attributes: {
          cadence: 'bi-weekly',
        },
      },
      attributes: {
        domain: profile.domain,
        mission: `Own ${teamName.toLowerCase()} outcomes for ${entry.title}.`,
        costCenter: `CC-${pad2(index + 1)}`,
      },
    });
  });

  return {
    seniorManagers,
    sdms,
    pmts,
    projectManagers,
    teams,
    allKnownEngineers,
  };
}

function buildServiceApiName(serviceName, suffix) {
  const base = String(serviceName || '')
    .replace(/service$/i, '')
    .trim();
  return `${base} ${suffix} API`;
}

function buildServices(profile, teams, category) {
  const serviceNames = profile.services.slice();
  const publicApiMap = {};
  serviceNames.forEach((serviceName) => {
    publicApiMap[serviceName] = buildServiceApiName(serviceName, 'Public');
  });

  return serviceNames.map((serviceName, index) => {
    const total = serviceNames.length;
    const dependencyA = serviceNames[(index + total - 1) % total];
    const dependencyB = serviceNames[(index + 1) % total];
    const serviceDependencies = Array.from(
      new Set([dependencyA, dependencyB].filter((dep) => dep && dep !== serviceName))
    );

    const publicApiName = publicApiMap[serviceName];
    const internalApiName = buildServiceApiName(serviceName, 'Internal');
    const dependentApis = serviceDependencies.map((dep) => publicApiMap[dep]).filter(Boolean);

    return {
      serviceName,
      serviceDescription: `${serviceName} powers key ${profile.domain.toLowerCase()} workflows.`,
      owningTeamId: teams[index % teams.length].teamId,
      apis: [
        {
          apiName: publicApiName,
          apiDescription: `External API surface for ${serviceName.toLowerCase()}.`,
          dependentApis: dependentApis.slice(0, 2),
          attributes: { stability: 'ga', auth: 'service-token' },
        },
        {
          apiName: internalApiName,
          apiDescription: `Internal orchestration API for ${serviceName.toLowerCase()}.`,
          dependentApis: [publicApiName].concat(dependentApis.slice(0, 1)),
          attributes: { stability: 'internal', auth: 'mTLS' },
        },
      ],
      serviceDependencies,
      platformDependencies: inferPlatformDependencies(serviceName, category),
      attributes: {
        tier: index < 3 ? 'critical' : 'business',
        domain: profile.domain,
      },
    };
  });
}

function buildThemes(profile) {
  const labels = [
    'Growth and Adoption',
    'Reliability and Availability',
    'Trust, Risk, and Compliance',
    'Monetization and Unit Economics',
    'Platform Scalability',
    'Operational Excellence',
  ];
  return labels.map((label, index) => ({
    themeId: `theme-${pad2(index + 1)}`,
    name: `${profile.domain} ${label}`,
    description: `${label} execution for ${profile.domain.toLowerCase()}.`,
    relatedGoalIds: [],
    attributes: {
      domain: profile.domain,
    },
  }));
}

function buildGoals(profile, currentYear) {
  const goalDrafts = [
    {
      name: `${profile.domain} growth acceleration`,
      description: `Increase adoption and repeat usage across core ${profile.domain.toLowerCase()} journeys.`,
      yearOffset: 0,
    },
    {
      name: `${profile.domain} reliability uplift`,
      description: 'Drive lower incident volume and stronger operational resilience.',
      yearOffset: 0,
    },
    {
      name: `${profile.domain} trust and compliance maturity`,
      description: 'Strengthen risk controls, auditability, and policy enforcement.',
      yearOffset: 1,
    },
    {
      name: `${profile.domain} monetization performance`,
      description: 'Improve conversion, retention, and revenue quality.',
      yearOffset: 1,
    },
    {
      name: `${profile.domain} architecture scalability`,
      description: 'Prepare platform foundations for sustained multi-year demand growth.',
      yearOffset: 2,
    },
    {
      name: `${profile.domain} execution efficiency`,
      description: 'Reduce cycle time through better tooling, automation, and planning quality.',
      yearOffset: 2,
    },
  ];

  return goalDrafts.map((goal, index) => ({
    goalId: `goal-${pad2(index + 1)}`,
    name: goal.name,
    description: goal.description,
    dueDate: `${currentYear + goal.yearOffset}-12-31`,
    initiativeIds: [],
    attributes: {
      domain: profile.domain,
      kpi: index % 2 === 0 ? 'NPS and retention' : 'SLA and delivery predictability',
    },
  }));
}

function initiativeRoiFor(status, index) {
  const confidenceByStatus = {
    Completed: 'High',
    'In Progress': 'Medium',
    Committed: 'Medium',
    Defined: 'Low',
    Backlog: 'Low',
  };

  const category = ['Revenue Growth', 'Cost Reduction', 'Risk Mitigation', 'Strategic Enablement'][
    index % 4
  ];

  return {
    category,
    valueType: 'QualitativeScore',
    estimatedValue:
      status === 'Completed' ? 'High' : status === 'In Progress' ? 'Medium' : 'Emerging',
    currency: null,
    timeHorizonMonths: 12 + (index % 3) * 6,
    confidenceLevel: confidenceByStatus[status] || 'Low',
    calculationMethodology: 'Scenario-based product and engineering planning',
    businessCaseLink: null,
    overrideJustification: null,
    attributes: {},
  };
}

function buildInitiatives(systemContext, entry, profile, currentYear, seed) {
  const {
    teams,
    services,
    goals,
    definedThemes,
    sdms,
    seniorManagers,
    projectManagers,
    allKnownEngineers,
  } = systemContext;
  const initiatives = [];
  const teamById = new Map(teams.map((team) => [team.teamId, team]));
  const sdmById = new Map(sdms.map((sdm) => [sdm.sdmId, sdm]));
  const srMgrById = new Map(
    seniorManagers.map((seniorManager) => [seniorManager.seniorManagerId, seniorManager])
  );

  const engineersByTeam = new Map();
  allKnownEngineers.forEach((engineer) => {
    if (!engineersByTeam.has(engineer.currentTeamId)) {
      engineersByTeam.set(engineer.currentTeamId, []);
    }
    engineersByTeam.get(engineer.currentTeamId).push(engineer);
  });

  INITIATIVE_BLUEPRINTS.forEach((template, index) => {
    const planningYear = currentYear + template.yearOffset;
    const quarter = (index % 4) + 1;
    const schedule = quarterWindow(planningYear, quarter);
    const serviceA = services[template.serviceOffsets[0] % services.length].serviceName;
    const serviceB = services[template.serviceOffsets[1] % services.length].serviceName;
    const serviceC = services[(template.serviceOffsets[0] + 3) % services.length].serviceName;

    const leadTeam = teams[index % teams.length];
    const supportTeam = teams[(index + 2) % teams.length];
    const yearBase = template.yearOffset === 0 ? 2.1 : template.yearOffset === 1 ? 1.5 : 1.0;
    const statusAdjustment =
      template.status === 'Backlog' ? -0.35 : template.status === 'Completed' ? 0.3 : 0;
    const totalSdeYears = Math.max(
      0.6,
      roundTo(yearBase + statusAdjustment + (index % 3) * 0.2, 2)
    );
    const assignments = [
      { teamId: leadTeam.teamId, sdeYears: roundTo(totalSdeYears * 0.65, 2) },
      { teamId: supportTeam.teamId, sdeYears: roundTo(totalSdeYears * 0.35, 2) },
    ];

    const leadTeamEngineers = engineersByTeam.get(leadTeam.teamId) || [];
    const technicalPocEngineer = leadTeamEngineers[0];
    const projectManager = projectManagers[index % projectManagers.length];

    let owner = null;
    if (leadTeam.sdmId && sdmById.has(leadTeam.sdmId)) {
      const ownerSdm = sdmById.get(leadTeam.sdmId);
      owner = { type: 'sdm', id: ownerSdm.sdmId, name: ownerSdm.sdmName };
    } else if (leadTeam.seniorManagerId && srMgrById.has(leadTeam.seniorManagerId)) {
      const ownerSenior = srMgrById.get(leadTeam.seniorManagerId);
      owner = {
        type: 'seniorManager',
        id: ownerSenior.seniorManagerId,
        name: ownerSenior.seniorManagerName,
      };
    }

    const initiative = {
      initiativeId: `init-${pad2(index + 1)}`,
      title: `${template.action} ${serviceA}`,
      description: `${template.focus} for ${entry.title.toLowerCase()} by coordinating ${serviceA.toLowerCase()} and ${serviceB.toLowerCase()}.`,
      isProtected: !!template.isProtected,
      assignments,
      impactedServiceIds: Array.from(new Set([serviceA, serviceB, serviceC])),
      roi: initiativeRoiFor(template.status, index),
      targetDueDate: schedule.endDate,
      actualCompletionDate: template.status === 'Completed' ? addDays(schedule.endDate, -20) : null,
      status: template.status,
      themes: [definedThemes[template.themeIndex % definedThemes.length].themeId],
      primaryGoalId: goals[template.goalIndex % goals.length].goalId,
      projectManager: {
        type: 'pm',
        id: projectManager.pmId,
        name: projectManager.pmName,
      },
      owner,
      technicalPOC: technicalPocEngineer
        ? {
            type: 'engineer',
            id: technicalPocEngineer.engineerId,
            name: technicalPocEngineer.name,
          }
        : null,
      workPackageIds: [],
      attributes: {
        planningYear,
        startDate: schedule.startDate,
        milestoneQuarter: `Q${quarter}`,
        riskLevel:
          template.status === 'Backlog'
            ? 'medium'
            : template.status === 'Completed'
              ? 'low'
              : 'moderate',
        targetMetric: index % 2 === 0 ? 'Latency and conversion' : 'Reliability and trust',
        seed: seed + index,
      },
    };

    initiatives.push(initiative);
  });

  return initiatives;
}

function buildDeliveryPhases(startDate, endDate, status) {
  const split = splitDateRange(startDate, endDate);
  const phaseStatus =
    status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'In Progress' : 'Defined';

  return [
    {
      phaseName: 'Discovery and Design',
      status: status === 'Completed' ? 'Completed' : 'In Progress',
      startDate: split.startDate,
      endDate: addDays(split.startDate, 28),
      notes: 'Validated architecture boundaries and success metrics.',
    },
    {
      phaseName: 'Build and Integration',
      status: phaseStatus,
      startDate: addDays(split.startDate, 29),
      endDate: split.midDate,
      notes: 'Implemented core services and cross-team integration points.',
    },
    {
      phaseName: 'Rollout and Stabilization',
      status: phaseStatus,
      startDate: addDays(split.midDate, 1),
      endDate: split.endDate,
      notes: 'Executed rollout runbook and operational readiness checks.',
    },
  ];
}

function deriveWorkPackageStatus(initiativeStatus, packageIndex) {
  if (initiativeStatus === 'Completed') return 'Completed';
  if (initiativeStatus === 'In Progress') return packageIndex === 0 ? 'Completed' : 'In Progress';
  if (initiativeStatus === 'Committed') return 'Committed';
  if (initiativeStatus === 'Defined') return 'Defined';
  return 'Backlog';
}

function buildWorkPackages(initiatives) {
  const workPackages = [];
  const lastPackageByYear = {};

  initiatives.forEach((initiative, initiativeIndex) => {
    const planningYear = Number(initiative.attributes?.planningYear || new Date().getUTCFullYear());
    const packageCount = planningYear === new Date().getUTCFullYear() ? 2 : 1;
    const packageIds = [];

    for (let p = 0; p < packageCount; p += 1) {
      const wpId = `wp-${pad2(initiativeIndex + 1)}-${p + 1}`;
      const wpStatus = deriveWorkPackageStatus(initiative.status, p);
      const startDate =
        p === 0 ? initiative.attributes.startDate : addDays(initiative.attributes.startDate, 45);
      const endDate = p === 0 ? addDays(initiative.targetDueDate, -35) : initiative.targetDueDate;
      const dependencies = [];
      if (p > 0) {
        dependencies.push(packageIds[p - 1]);
      } else if (lastPackageByYear[planningYear]) {
        dependencies.push(lastPackageByYear[planningYear]);
      }

      const impactedTeamAssignments = (initiative.assignments || []).map((assignment) => ({
        teamId: assignment.teamId,
        sdeDaysEstimate: Math.max(
          20,
          Math.round(((Number(assignment.sdeYears) || 0.5) * 220) / packageCount)
        ),
      }));
      const totalCapacitySDEdays = impactedTeamAssignments.reduce(
        (sum, item) => sum + Number(item.sdeDaysEstimate || 0),
        0
      );

      workPackages.push({
        workPackageId: wpId,
        initiativeId: initiative.initiativeId,
        name:
          p === 0 ? `${initiative.title} - Foundation` : `${initiative.title} - Rollout and Scale`,
        description: `Execution package for ${initiative.title.toLowerCase()}.`,
        owner: initiative.owner,
        status: wpStatus,
        deliveryPhases: buildDeliveryPhases(startDate, endDate, wpStatus),
        plannedDeliveryDate: endDate,
        actualDeliveryDate: wpStatus === 'Completed' ? addDays(endDate, -5) : null,
        impactedTeamAssignments,
        totalCapacitySDEdays,
        impactedServiceIds: initiative.impactedServiceIds || [],
        dependencies,
        attributes: {
          releaseTrain: `R${String(planningYear).slice(-2)}.${(initiativeIndex % 4) + 1}`,
          criticalPath: p === packageCount - 1,
        },
      });

      packageIds.push(wpId);
      lastPackageByYear[planningYear] = wpId;
    }

    initiative.workPackageIds = packageIds;
  });

  return workPackages;
}

function buildCapacityConfiguration(seed) {
  return {
    workingDaysPerYear: 260,
    standardHoursPerDay: 8,
    globalConstraints: {
      publicHolidays: 10 + (seed % 3),
      orgEvents: [
        {
          id: 'org-event-1',
          name: 'Planning and Architecture Week',
          estimatedDaysPerSDE: 2,
          attributes: {},
        },
        {
          id: 'org-event-2',
          name: 'Security and Compliance Training',
          estimatedDaysPerSDE: 1,
          attributes: {},
        },
      ],
    },
    leaveTypes: [
      { id: 'annual', name: 'Annual Leave', defaultEstimatedDays: 18, attributes: {} },
      { id: 'sick', name: 'Sick Leave', defaultEstimatedDays: 7, attributes: {} },
      { id: 'study', name: 'Study Leave', defaultEstimatedDays: 4, attributes: {} },
      { id: 'inlieu', name: 'Time off In-lieu Leave', defaultEstimatedDays: 3, attributes: {} },
    ],
    attributes: {
      calendarModel: 'global-hybrid',
    },
  };
}

function buildSystemFromProfile(entry, profile) {
  const currentYear = new Date().getUTCFullYear();
  const seed = hashText(entry.blueprintId);
  const people = buildPeopleAndTeams(entry, profile, seed);
  const services = buildServices(profile, people.teams, entry.category);
  const definedThemes = buildThemes(profile);
  const goals = buildGoals(profile, currentYear);

  const systemContext = {
    ...people,
    services,
    goals,
    definedThemes,
  };
  const yearlyInitiatives = buildInitiatives(systemContext, entry, profile, currentYear, seed);
  const workPackages = buildWorkPackages(yearlyInitiatives);

  const initiativesByGoal = new Map();
  yearlyInitiatives.forEach((initiative) => {
    if (!initiative.primaryGoalId) return;
    if (!initiativesByGoal.has(initiative.primaryGoalId)) {
      initiativesByGoal.set(initiative.primaryGoalId, []);
    }
    initiativesByGoal.get(initiative.primaryGoalId).push(initiative.initiativeId);
  });
  goals.forEach((goal) => {
    goal.initiativeIds = initiativesByGoal.get(goal.goalId) || [];
  });

  definedThemes.forEach((theme, index) => {
    const relatedGoals = goals
      .filter(
        (goal, goalIndex) => goalIndex % definedThemes.length === index % definedThemes.length
      )
      .map((goal) => goal.goalId);
    theme.relatedGoalIds = relatedGoals;
  });

  const platformDependencies = Array.from(
    new Set(services.flatMap((service) => service.platformDependencies || []))
  );

  return {
    systemName: `${entry.title} Blueprint`,
    systemDescription: entry.summary,
    seniorManagers: people.seniorManagers,
    sdms: people.sdms,
    pmts: people.pmts,
    projectManagers: people.projectManagers,
    teams: people.teams,
    allKnownEngineers: people.allKnownEngineers,
    services,
    platformDependencies,
    capacityConfiguration: buildCapacityConfiguration(seed),
    yearlyInitiatives,
    goals,
    definedThemes,
    archivedYearlyPlans: [],
    workPackages,
    calculatedCapacityMetrics: null,
    attributes: {
      blueprintGeneration: {
        mode: 'launch25-domain-authored-v2',
        blueprintId: entry.blueprintId,
        generatedAt: new Date().toISOString(),
      },
      domain: profile.domain,
      provenance: 'Codex-authored curated launch dataset',
    },
  };
}

function validateSystemIntegrity(system) {
  const errors = [];
  const teams = Array.isArray(system.teams) ? system.teams : [];
  const engineers = Array.isArray(system.allKnownEngineers) ? system.allKnownEngineers : [];
  const services = Array.isArray(system.services) ? system.services : [];
  const goals = Array.isArray(system.goals) ? system.goals : [];
  const initiatives = Array.isArray(system.yearlyInitiatives) ? system.yearlyInitiatives : [];
  const workPackages = Array.isArray(system.workPackages) ? system.workPackages : [];

  if (!system.systemName) errors.push('Missing systemName');
  if (teams.length < 6) errors.push('Expected at least 6 teams');
  if (services.length < 8) errors.push('Expected at least 8 services');
  if (goals.length < 5) errors.push('Expected at least 5 goals');
  if (initiatives.length < 12) errors.push('Expected at least 12 initiatives');
  if (workPackages.length < initiatives.length) errors.push('Work package count too low');

  const teamIds = new Set(teams.map((team) => team.teamId).filter(Boolean));
  const engineerByName = new Map(engineers.map((engineer) => [engineer.name, engineer]));
  const initiativeIds = new Set(initiatives.map((initiative) => initiative.initiativeId));
  const goalIds = new Set(goals.map((goal) => goal.goalId));
  const wpIds = new Set(workPackages.map((wp) => wp.workPackageId));

  teams.forEach((team) => {
    (team.engineers || []).forEach((engineerName) => {
      const engineer = engineerByName.get(engineerName);
      if (!engineer) {
        errors.push(`Team references unknown engineer: ${engineerName}`);
      } else if (engineer.currentTeamId !== team.teamId) {
        errors.push(`Engineer/team mismatch for ${engineerName}`);
      }
    });
  });

  services.forEach((service) => {
    if (!teamIds.has(service.owningTeamId)) {
      errors.push(`Service has invalid owningTeamId: ${service.serviceName}`);
    }
  });

  initiatives.forEach((initiative) => {
    if (initiative.primaryGoalId && !goalIds.has(initiative.primaryGoalId)) {
      errors.push(`Initiative references missing goal: ${initiative.initiativeId}`);
    }
    (initiative.assignments || []).forEach((assignment) => {
      if (!teamIds.has(assignment.teamId)) {
        errors.push(`Initiative assignment references unknown team: ${initiative.initiativeId}`);
      }
    });
    if (!Array.isArray(initiative.workPackageIds) || initiative.workPackageIds.length === 0) {
      errors.push(`Initiative missing workPackageIds: ${initiative.initiativeId}`);
    } else {
      initiative.workPackageIds.forEach((wpId) => {
        if (!wpIds.has(wpId)) {
          errors.push(`Initiative references missing work package: ${initiative.initiativeId}`);
        }
      });
    }
  });

  workPackages.forEach((workPackage) => {
    if (!initiativeIds.has(workPackage.initiativeId)) {
      errors.push(`Work package references missing initiative: ${workPackage.workPackageId}`);
    }
  });

  goals.forEach((goal) => {
    (goal.initiativeIds || []).forEach((initiativeId) => {
      if (!initiativeIds.has(initiativeId)) {
        errors.push(`Goal references missing initiative: ${goal.goalId}`);
      }
    });
  });

  return errors;
}

function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const catalog = loadCatalog(repoRoot);
  const profiles = buildProfiles();

  const launchEntries = catalog
    .filter((entry) => {
      const match = entry.blueprintId.match(/^bp-(\d+)/);
      const index = Number(match ? match[1] : 0);
      return index >= 1 && index <= 25;
    })
    .sort((left, right) => {
      const leftIndex = Number(left.blueprintId.slice(3, 6));
      const rightIndex = Number(right.blueprintId.slice(3, 6));
      return leftIndex - rightIndex;
    });

  const packageMap = {};
  launchEntries.forEach((entry) => {
    const profile = profiles[entry.blueprintId];
    if (!profile) {
      throw new Error(`Missing launch profile for ${entry.blueprintId}`);
    }

    const system = buildSystemFromProfile(entry, profile);
    const validationErrors = validateSystemIntegrity(system);
    if (validationErrors.length > 0) {
      throw new Error(
        `Generated system failed integrity validation for ${entry.blueprintId}: ${validationErrors.slice(0, 6).join('; ')}`
      );
    }

    const manifest = deepClone(entry);
    manifest.availabilityStatus = 'Available';
    manifest.isInstallable = true;
    manifest.packageMode = 'prebuilt-launch25';
    manifest.curationModel = 'domain-authored-curated-v2';
    manifest.updatedAt = new Date().toISOString();

    packageMap[entry.blueprintId] = {
      format: 'smt-blueprint-package',
      packageSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      manifest,
      system,
    };
  });

  const outputPath = path.resolve(repoRoot, 'data/blueprints/launch25-packages.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    count: Object.keys(packageMap).length,
    generationModel: 'domain-authored-curated-v2',
    packages: packageMap,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(
    `Generated ${Object.keys(packageMap).length} launch packages at ${path.relative(repoRoot, outputPath)}`
  );
}

main();
