/** Define a unique key for local storage **/
const LOCAL_STORAGE_KEY = 'architectureVisualization_systems';

const Modes = {
    NAVIGATION: 'navigation',
    BROWSING: 'browsing',
    EDITING: 'editing',
    CREATING: 'creating',
    PLANNING: 'planning' 
};

/** Sample Data for StreamView **/

/** Define Senior Managers for StreamView **/
const sampleSeniorManagersDataStreamView = [
    { seniorManagerId: 'srMgr1', seniorManagerName: 'Director Dave' },
    { seniorManagerId: 'srMgr2', seniorManagerName: 'VP Victoria' }
];

/** Updated SDMs Data for StreamView (with seniorManagerId) **/
const sampleSDMsDataStreamView = [
    { sdmId: 'sdm1', sdmName: 'Alice Johnson', seniorManagerId: 'srMgr1' },
    { sdmId: 'sdm2', sdmName: 'Emily Clark', seniorManagerId: 'srMgr1' },
    { sdmId: 'sdm3', sdmName: 'Carol Davis', seniorManagerId: 'srMgr1' },
    { sdmId: 'sdm4', sdmName: 'Grace Lee', seniorManagerId: 'srMgr2' },
    { sdmId: 'sdm5', sdmName: 'Ian Turner', seniorManagerId: 'srMgr2' },
    { sdmId: 'sdm6', sdmName: 'Karen Adams', seniorManagerId: 'srMgr2' },
    { sdmId: 'sdm7', sdmName: 'Natalie Green', seniorManagerId: 'srMgr1' },
    { sdmId: 'sdm8', sdmName: 'Zoe King', seniorManagerId: 'srMgr2' }
];

/** Updated Teams Data for StreamView (with fundedHeadcount, buildersInSeats, engineers array) **/
const sampleTeamsDataStreamView = [
    {
        teamId: 'team1',
        teamName: 'User Experience Team',
        teamIdentity: 'Avengers',
        fundedHeadcount: 7,
        buildersInSeats: 5,
        engineers: [
            { name: 'Alice Johnson', level: 4 },
            { name: 'Mark Evans', level: 3 },
            { name: 'Sophia Lee', level: 3 },
            { name: 'John Doe', level: 2 },
            { name: 'Emma Davis', level: 1 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm1',
        pmtId: 'pmt1',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            
        }
    },
    {
        teamId: 'team2',
        teamName: 'Streaming Team',
        teamIdentity: 'Spartans',
        fundedHeadcount: 5,
        buildersInSeats: 4,
        engineers: [
            { name: 'Emily Clark', level: 5 },
            { name: 'Daniel Thompson', level: 3 },
            { name: 'Olivia Brown', level: 2 },
            { name: 'Liam Wilson', level: 2 }
        ],
        awayTeamMembers: [
            { name: 'Borrowed Betty', level: 3, sourceTeam: 'External Partner X' }
        ], // Example away team member
        sdmId: 'sdm2',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team3',
        teamName: 'Content Team',
        teamIdentity: 'Crusaders',
        fundedHeadcount: 4,
        buildersInSeats: 3,
        engineers: [
            { name: 'Carol Davis', level: 4 },
            { name: 'Kevin Moore', level: 2 },
            { name: 'Isabella Martinez', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm3',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team4',
        teamName: 'Recommendation Team',
        teamIdentity: 'Olympus',
        fundedHeadcount: 6,
        buildersInSeats: 4,
        engineers: [
            { name: 'Grace Lee', level: 4 },
            { name: 'Ethan Harris', level: 3 },
            { name: 'Mia Turner', level: 2 },
            { name: 'Noah Walker', level: 1 }
        ],
        awayTeamMembers: [
            { name: 'Loaned Larry', level: 4, sourceTeam: 'Core Platform BU' },
            { name: 'Visiting Vinny', level: 2, sourceTeam: 'Data Science Org' }
        ], // Example away team members
        sdmId: 'sdm4',
        pmtId: 'pmt3',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team5',
        teamName: 'Finance Team',
        teamIdentity: 'Falcons',
        fundedHeadcount: 4,
        buildersInSeats: 3,
        engineers: [
            { name: 'Ian Turner', level: 5 },
            { name: 'Charlotte Adams', level: 3 },
            { name: 'Benjamin Scott', level: 3 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm5',
        pmtId: 'pmt3',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team6',
        teamName: 'Communication Team',
        teamIdentity: 'Ninjas',
        fundedHeadcount: 3,
        buildersInSeats: 2,
        engineers: [
            { name: 'Karen Adams', level: 3 },
            { name: 'Lucas Wright', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm6',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team7',
        teamName: 'Analytics Team',
        teamIdentity: 'Dragons',
        fundedHeadcount: 5,
        buildersInSeats: 3,
        engineers: [
            { name: 'Natalie Green', level: 4 },
            { name: 'Andrew Hall', level: 3 },
            { name: 'Ella Young', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm7',
        pmtId: 'pmt4',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    },
    {
        teamId: 'team8',
        teamName: 'Search Team',
        teamIdentity: 'Search',
        fundedHeadcount: 3,
        buildersInSeats: 2,
        engineers: [
            { name: 'Zoe King', level: 3 },
            { name: 'Michael Baker', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm8',
        pmtId: 'pmt1',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }

    }
];

const samplePMTsDataStreamView = [
    { pmtId: 'pmt1', pmtName: 'Bob Smith' },
    { pmtId: 'pmt2', pmtName: 'Frank Thompson' },
    { pmtId: 'pmt3', pmtName: 'Jane Parker' },
    { pmtId: 'pmt4', pmtName: 'Owen Clark' }
];

//Service Name
//Upstreams: List of services the current service depends on.
//Downstreams: List of services that depend on the current service.
//Platform Dependencies: List of platforms the current service depends on.
//Upstreams: For a given service, upstreams are the services listed in its serviceDependencies.
//Downstreams: For a given service, downstreams are the services that include its name in their serviceDependencies.	

const sampleServicesDataStreamView = [
    {
      serviceName: 'User Management Service',
      serviceDescription: 'Handles user registration, authentication, profiles, and account settings.',
      owningTeamId: 'team1',
      apis: [
          {
              apiName: 'Register API',
              apiDescription: 'Allows new users to sign up.',
              dependentApis: []
          },
          {
              apiName: 'Login API',
              apiDescription: 'Authenticates users and starts a session.',
              dependentApis: []
          },
          {
              apiName: 'Profile API',
              apiDescription: 'Manages user profiles and account settings.',
              dependentApis: []
          },
          {
              apiName: 'Logout API',
              apiDescription: 'Ends the user session.',
              dependentApis: []
          }
      ],
      serviceDependencies: [],
      platformDependencies: ['Auth0', 'AWS DynamoDB']
  },
  {
      serviceName: 'Content Delivery Service',
      serviceDescription: 'Manages content streaming and delivery to users.',
      owningTeamId: 'team2',
      apis: [
          {
              apiName: 'Stream Content API',
              apiDescription: 'Streams selected content to the user.',
              dependentApis: ['Subscription API', 'Profile API']
          },
          {
              apiName: 'Adaptive Bitrate API',
              apiDescription: 'Adjusts streaming quality based on network conditions.',
              dependentApis: []
          },
          {
              apiName: 'Content Caching API',
              apiDescription: 'Manages caching of frequently accessed content.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS CloudFront', 'AWS S3']
  },
  {
      serviceName: 'Content Management Service',
      serviceDescription: 'Handles content ingestion, metadata, and catalog management.',
      owningTeamId: 'team3',
      apis: [
          {
              apiName: 'Content Ingestion API',
              apiDescription: 'Ingests new content into the platform.',
              dependentApis: []
          },
          {
              apiName: 'Metadata API',
              apiDescription: 'Manages content metadata like titles, descriptions, genres.',
              dependentApis: []
          },
          {
              apiName: 'Catalog API',
              apiDescription: 'Provides the catalog of available content.',
              dependentApis: []
          }
      ],
      serviceDependencies: [],
      platformDependencies: ['AWS S3', 'AWS Lambda']
  },
  {
      serviceName: 'Recommendation Engine Service',
      serviceDescription: 'Provides personalized content recommendations to users based on viewing history and preferences.',
      owningTeamId: 'team4',
      apis: [
          {
              apiName: 'Recommendations API',
              apiDescription: 'Retrieves recommended content for a user.',
              dependentApis: ['User Behavior Tracking API', 'Metadata API']
          },
          {
              apiName: 'User Behavior Tracking API',
              apiDescription: 'Tracks user interactions and viewing history.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['User Management Service', 'Content Management Service', 'Analytics Service'],
      platformDependencies: ['AWS Machine Learning', 'Apache Spark']
  },
  {
      serviceName: 'Billing and Subscription Service',
      serviceDescription: 'Manages user subscriptions, billing, and payment processing.',
      owningTeamId: 'team5',
      apis: [
          {
              apiName: 'Subscription API',
              apiDescription: 'Manages user subscription plans.',
              dependentApis: []
          },
          {
              apiName: 'Payment Processing API',
              apiDescription: 'Processes payments securely.',
              dependentApis: ['Email Notification API']
          },
          {
              apiName: 'Invoice API',
              apiDescription: 'Generates invoices and billing statements.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['User Management Service', 'Notification Service'],
      platformDependencies: ['Stripe API', 'AWS RDS']
  },
  {
      serviceName: 'Notification Service',
      serviceDescription: 'Sends notifications, emails, and in-app messages to users.',
      owningTeamId: 'team6',
      apis: [
          {
              apiName: 'Email Notification API',
              apiDescription: 'Sends email notifications to users.',
              dependentApis: []
          },
          {
              apiName: 'Push Notification API',
              apiDescription: 'Sends push notifications to user devices.',
              dependentApis: ['Profile API']
          },
          {
              apiName: 'In-App Messaging API',
              apiDescription: 'Displays messages within the app.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS SNS', 'Firebase Cloud Messaging']
  },
  {
      serviceName: 'Analytics Service',
      serviceDescription: 'Collects and analyzes data on user engagement, content performance, and platform metrics.',
      owningTeamId: 'team7',
      apis: [
          {
              apiName: 'Data Collection API',
              apiDescription: 'Collects data from various services.',
              dependentApis: []
          },
          {
              apiName: 'Reporting API',
              apiDescription: 'Provides analytical reports and dashboards.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['User Management Service', 'Content Delivery Service', 'Recommendation Engine Service'],
      platformDependencies: ['AWS Redshift', 'Tableau']
  },
  {
      serviceName: 'Search Service',
      serviceDescription: 'Enables users to search for content across the platform.',
      owningTeamId: 'team8',
      apis: [
          {
              apiName: 'Search API',
              apiDescription: 'Allows users to search for content by title, genre, etc.',
              dependentApis: []
          },
          {
              apiName: 'Autocomplete API',
              apiDescription: 'Provides search suggestions as users type.',
              dependentApis: []
          }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service'],
      platformDependencies: ['Elasticsearch']
  }
];

/** Updated System Data for StreamView (including seniorManagers and yearlyInitiatives) **/
const sampleSystemDataStreamView = {
    systemName: 'StreamView',
    systemDescription: 'StreamView is a video streaming platform that provides personalized content to users worldwide.',
    seniorManagers: sampleSeniorManagersDataStreamView,
    teams: sampleTeamsDataStreamView,
    sdms: sampleSDMsDataStreamView,
    pmts: samplePMTsDataStreamView,
    services: sampleServicesDataStreamView,
    platformDependencies: [], // Will be built dynamically on load
    // Capacity constraints
    capacityConfiguration: {
        workingDaysPerYear: 261, // To be configured
        standardHoursPerDay: 8,  // Default
        globalConstraints: {
            publicHolidays: null, // To be configured
            orgEvents: [
                // User will add events via UI later
            ]
        },
        leaveTypes: [ // Define standard leave types globally
            { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0 },
            { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0 },
            { id: "study", name: "Study Leave", defaultEstimatedDays: 0 },
            { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0 }
            //{ id: "paternity", name: "Paternity Leave", defaultEstimatedDays: 0 },
            //{ id: "family", name: "Family Responsibility", defaultEstimatedDays: 0 }
        ]
    },
    yearlyInitiatives: [
        // --- Protected Initiatives ---
        {
            initiativeId: 'init-sv-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', relatedBusinessGoalId: 'eng-excellence', isProtected: true,
            assignments: [ // Assign estimate to all teams
                { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 1.25 },
                { teamId: 'team5', sdeYears: 0.75 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }
            ]
        },
        {
            initiativeId: 'init-sv-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', relatedBusinessGoalId: 'ops-stability', isProtected: true,
            assignments: [ // Assign 1 SDE Year to all teams
                 { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 },
                 { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 }
            ]
        },
        {
            initiativeId: 'init-sv-security', title: 'Mandatory Security Hardening (Compliance)', description: 'Address critical security vulnerabilities and ensure compliance (e.g., SOC2, GDPR).', relatedBusinessGoalId: 'compliance', isProtected: true,
            assignments: [
                { teamId: 'team1', sdeYears: 0.5 }, // User Management
                { teamId: 'team5', sdeYears: 0.75 }, // Billing/Finance
                // Add infra/platform team if one existed, assume team2 handles some platform aspects
                { teamId: 'team2', sdeYears: 0.5 } // Content Delivery/Platform
            ]
        },
        // --- Feature/Product Initiatives (Examples) ---
        { initiativeId: 'init-sv-001', title: 'AV1 Codec Support', description: 'Implement AV1 codec for improved streaming efficiency.', relatedBusinessGoalId: 'user-experience', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 2.5 }, { teamId: 'team3', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-002', title: 'Tiered Subscription Model', description: 'Launch new subscription tiers (Basic, Premium, Family).', relatedBusinessGoalId: 'revenue-growth', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 3.0 }, { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-003', title: 'Recommendation Algorithm V3', description: 'Develop and deploy next-gen recommendation engine.', relatedBusinessGoalId: 'engagement', isProtected: false, assignments: [{ teamId: 'team4', sdeYears: 4.0 }, { teamId: 'team7', sdeYears: 1.5 }] },
        { initiativeId: 'init-sv-004', title: 'Expand CDN to South America', description: 'Set up CDN infrastructure in SA region.', relatedBusinessGoalId: 'global-expansion', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }] },
        { initiativeId: 'init-sv-005', title: 'User Profile Enhancements', description: 'Add customizable avatars and viewing preferences.', relatedBusinessGoalId: 'user-experience', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.5 }] },
        { initiativeId: 'init-sv-006', title: 'Content Search Facets', description: 'Improve search with filters for genre, rating, year.', relatedBusinessGoalId: 'engagement', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-007', title: 'Offline Viewing Improvements', description: 'Enhance download stability and management.', relatedBusinessGoalId: 'user-experience', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-008', title: 'A/B Testing Framework', description: 'Build internal framework for feature A/B testing.', relatedBusinessGoalId: 'eng-excellence', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 2.0 }] },
        { initiativeId: 'init-sv-009', title: 'Parental Controls V2', description: 'Granular controls per profile and content rating.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-010', title: 'Interactive Content POC', description: 'Proof-of-concept for choose-your-own-adventure style content.', relatedBusinessGoalId: 'innovation', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team3', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-011', title: 'Payment Gateway Integration (New Region)', description: 'Add local payment options for APAC.', relatedBusinessGoalId: 'global-expansion', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.5 }] },
        { initiativeId: 'init-sv-012', title: 'Real-time Analytics Dashboard', description: 'Internal dashboard for viewing concurrency and errors.', relatedBusinessGoalId: 'ops-stability', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-013', title: 'Watch Party Feature', description: 'Allow users to watch content synchronously with friends.', relatedBusinessGoalId: 'engagement', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team6', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-014', title: 'Metadata Enrichment AI', description: 'Use AI to auto-tag content metadata.', relatedBusinessGoalId: 'eng-excellence', isProtected: false, assignments: [{ teamId: 'team3', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-015', title: 'GDPR Data Deletion Automation', description: 'Automate user data deletion requests for GDPR.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.75 }, { teamId: 'team7', sdeYears: 0.25 }] },
        { initiativeId: 'init-sv-016', title: 'Improved Subtitle Customization', description: 'Allow users to change subtitle font, size, color.', relatedBusinessGoalId: 'user-experience', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.5 }] },
        { initiativeId: 'init-sv-017', title: 'Search Performance Optimization', description: 'Reduce search latency by 50%.', relatedBusinessGoalId: 'eng-excellence', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-018', title: 'Gift Subscriptions', description: 'Allow users to purchase subscriptions for others.', relatedBusinessGoalId: 'revenue-growth', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.25 }] },
        { initiativeId: 'init-sv-019', title: 'Video Player Accessibility Audit & Fixes', description: 'Ensure player meets WCAG AA standards.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.75 }] },
        { initiativeId: 'init-sv-020', title: 'Reduce Streaming Startup Time', description: 'Optimize playback start time for users.', relatedBusinessGoalId: 'user-experience', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }] },
        { initiativeId: 'init-sv-021', title: 'Content Partner Reporting Portal', description: 'Allow content partners to view performance data.', relatedBusinessGoalId: 'partnerships', isProtected: false, assignments: [{ teamId: 'team3', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }] },
        { initiativeId: 'init-sv-022', title: 'Personalized Push Notifications', description: 'Send targeted notifications based on viewing habits.', relatedBusinessGoalId: 'engagement', isProtected: false, assignments: [{ teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 0.5 }] }
    ],
    // *** NEW: Add placeholder for calculated capacity metrics ***
    calculatedCapacityMetrics: null
    // **********************************************************
};

/** Sample Data for ConnectPro **/

/** Define Senior Managers for ConnectPro **/
const sampleSeniorManagersDataContactCenter = [
    { seniorManagerId: 'srMgrCC1', seniorManagerName: 'Senior Sam' }
    // Only one senior manager for this example
];

/** Updated SDMs Data for ConnectPro (with seniorManagerId) **/
const contactCenterSDMsData = [
    { sdmId: 'sdm1', sdmName: 'Alex Johnson', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm2', sdmName: 'Matthew Jackson', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm3', sdmName: 'Ryan King', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm4', sdmName: 'Laura Turner', seniorManagerId: 'srMgrCC1' }
];

const contactCenterPMTsData = [
    { pmtId: 'pmt1', pmtName: 'Karen Davis' },          // Shared between team1 and team8
    { pmtId: 'pmt2', pmtName: 'Patricia Thompson' },    // Shared among team2, team3, team6
    { pmtId: 'pmt3', pmtName: 'Angela Green' },         // Shared between team4 and team5
    { pmtId: 'pmt4', pmtName: 'Stephanie Roberts' }     // PMT for team7
];

/** Updated Teams Data for ConnectPro (with fundedHeadcount, buildersInSeats, engineers array) **/
const contactCenterTeamsData = [
    {
        teamId: 'team1',
        teamName: 'Customer Experience Team',
        teamIdentity: 'CX Warriors',
        fundedHeadcount: 6,
        buildersInSeats: 5,
        engineers: [
            { name: 'Alex Johnson', level: 4 }, // Assuming SDM might be L4+
            { name: 'Emily Smith', level: 3 },
            { name: 'David Lee', level: 3 },
            { name: 'Sarah Brown', level: 2 },
            { name: 'Michael Wilson', level: 1 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm1',
        pmtId: 'pmt1',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team2',
        teamName: 'Case Management Team',
        teamIdentity: 'Case Titans',
        fundedHeadcount: 5,
        buildersInSeats: 4,
        engineers: [
            { name: 'Jessica Taylor', level: 4 },
            { name: 'Daniel Moore', level: 3 },
            { name: 'Amy Anderson', level: 2 },
            { name: 'James Thomas', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm1',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team3',
        teamName: 'Routing and Agent Tools Team', // Note: Original had 7 names, split into team3/4
        teamIdentity: 'Routing Rangers',
        fundedHeadcount: 5, // Adjusted
        buildersInSeats: 4, // Adjusted
        engineers: [
            { name: 'Matthew Jackson', level: 5 }, // Assuming SDM L5
            { name: 'Ashley White', level: 3 },
            { name: 'Joshua Harris', level: 2 },
            { name: 'Andrew Garcia', level: 2 } // Moved Andrew here
        ],
        awayTeamMembers: [
            { name: 'Helping Hannah', level: 2, sourceTeam: 'AI Research Division' }
        ], // Example away team member
        sdmId: 'sdm2',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team4',
        teamName: 'Agent Tools Team', // Note: Original had 7 names, split into team3/4
        teamIdentity: 'Agent Aces',
        fundedHeadcount: 4, // Adjusted
        buildersInSeats: 3, // Adjusted
        engineers: [
             // Andrew Garcia moved to team3
            { name: 'Megan Clark', level: 3 },
            { name: 'Steven Lewis', level: 2 },
            { name: 'Nicole Young', level: 1 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm2', // Still under Matthew Jackson
        pmtId: 'pmt3',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team5',
        teamName: 'Communication Channels Team',
        teamIdentity: 'Comm Mandalorians',
        fundedHeadcount: 6,
        buildersInSeats: 5,
        engineers: [
            { name: 'Ryan King', level: 4 }, // Assuming SDM L4
            { name: 'Samantha Wright', level: 3 },
            { name: 'Brandon Lopez', level: 3 },
            { name: 'Rachel Hill', level: 2 },
            { name: 'Justin Scott', level: 2 }
        ],
        awayTeamMembers: [
            { name: 'Support Sam', level: 3, sourceTeam: 'Sister Company Ops' }
        ], // Example away team member
        sdmId: 'sdm3',
        pmtId: 'pmt3',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team6',
        teamName: 'Skills Management Team',
        teamIdentity: 'Skill Masters',
        fundedHeadcount: 3,
        buildersInSeats: 2,
        engineers: [
            { name: 'Kimberly Adams', level: 3 },
            { name: 'Jonathan Baker', level: 2 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm3',
        pmtId: 'pmt2',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team7',
        teamName: 'Analytics and Configuration Team', // Note: Original had 5 names, split into team7/8
        teamIdentity: 'Data Wizards',
        fundedHeadcount: 4, // Adjusted
        buildersInSeats: 3, // Adjusted
        engineers: [
            { name: 'Jason Carter', level: 4 },
            { name: 'Melissa Mitchell', level: 3 },
            { name: 'Kevin Perez', level: 2 }
            // Laura Turner and Eric Phillips moved to team8
        ],
        awayTeamMembers: [],
        sdmId: 'sdm4',
        pmtId: 'pmt4',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    },
    {
        teamId: 'team8',
        teamName: 'Configuration Team', // Note: Original had 5 names, split into team7/8
        teamIdentity: 'Config Ninjas',
        fundedHeadcount: 3, // Adjusted
        buildersInSeats: 2, // Adjusted
        engineers: [
            { name: 'Laura Turner', level: 4 }, // Assuming SDM L4
            { name: 'Eric Phillips', level: 3 }
        ],
        awayTeamMembers: [],
        sdmId: 'sdm4', // Still under Laura Turner
        pmtId: 'pmt1',
        teamCapacityAdjustments: {
            leaveUptakeEstimates: [], // Empty by default
            variableLeaveImpact: {   // New structure
                maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
            },
            teamActivities: [],
            recurringOverhead: [],
            avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI            

        }
        
    }
];


const sampleServicesDataConnectPro = [
    {
        serviceName: 'Customer Portal Service',
        serviceDescription: 'Allows customers to raise support tickets and track their status.',
        owningTeamId: 'team1',
        apis: [
            {
                apiName: 'Ticket Submission API',
                apiDescription: 'Enables customers to submit support tickets.',
                dependentApis: []
            },
            {
                apiName: 'Ticket Tracking API',
                apiDescription: 'Allows customers to check the status of their tickets.',
                dependentApis: []
            }
        ],
        serviceDependencies: [],
        platformDependencies: ['AWS Cognito', 'AWS S3']
    },
    {
        serviceName: 'Case Management Service',
        serviceDescription: 'Manages the lifecycle of support tickets within the system.',
        owningTeamId: 'team2',
        apis: [
            {
                apiName: 'Case Creation API',
                apiDescription: 'Creates a new case in the system.',
                dependentApis: []
            },
            {
                apiName: 'Case Update API',
                apiDescription: 'Updates case details and status.',
                dependentApis: []
            },
            {
                apiName: 'Case Assignment API',
                apiDescription: 'Assigns cases to agents based on skills and availability.',
                dependentApis: ['Skills Assignment API']
            }
        ],
        serviceDependencies: ['Customer Portal Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS DynamoDB']
    },
    {
        serviceName: 'Routing Service',
        serviceDescription: 'Routes incoming interactions to appropriate agents.',
        owningTeamId: 'team3', // Owned by team3
        apis: [
            {
                apiName: 'Interaction Routing API',
                apiDescription: 'Routes voice, email, and chat interactions.',
                dependentApis: ['Skill Matching API', 'Agent Login API']
            },
            {
                apiName: 'Skill Matching API',
                apiDescription: 'Matches interactions to agents based on skills.',
                dependentApis: ['Skills Evaluation API']
            }
        ],
        serviceDependencies: ['Communication Channels Service', 'Skills Management Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Lambda']
    },
    {
        serviceName: 'Agent Desktop Service',
        serviceDescription: 'Provides agents with tools to handle customer interactions.',
        owningTeamId: 'team4', 
        apis: [
            {
                apiName: 'Agent Login API',
                apiDescription: 'Authenticates agents and starts their session.',
                dependentApis: []
            },
            {
                apiName: 'Interaction Handling API',
                apiDescription: 'Manages ongoing interactions with customers.',
                dependentApis: ['Case Retrieval API']
            },
            {
                apiName: 'Case Retrieval API',
                apiDescription: 'Retrieves case details for agents.',
                dependentApis: []
            }
        ],
        serviceDependencies: ['Case Management Service', 'Routing Service'],
        platformDependencies: ['AWS AppSync']
    },
    {
        serviceName: 'Communication Channels Service',
        serviceDescription: 'Handles voice calls, emails, and chat messages.',
        owningTeamId: 'team5',
        apis: [
            {
                apiName: 'Voice Call API',
                apiDescription: 'Manages voice call connections.',
                dependentApis: []
            },
            {
                apiName: 'Email Processing API',
                apiDescription: 'Processes incoming and outgoing emails.',
                dependentApis: []
            },
            {
                apiName: 'Chat Messaging API',
                apiDescription: 'Manages live chat sessions.',
                dependentApis: []
            }
        ],
        serviceDependencies: ['Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['Amazon Connect', 'AWS SES', 'Amazon Lex']
    },
    {
        serviceName: 'Skills Management Service',
        serviceDescription: 'Manages agent skills and competencies.',
        owningTeamId: 'team6',
        apis: [
            {
                apiName: 'Skills Assignment API',
                apiDescription: 'Assigns skills to agents.',
                dependentApis: []
            },
            {
                apiName: 'Skills Evaluation API',
                apiDescription: 'Evaluates agent performance in skills.',
                dependentApis: []
            }
        ],
        serviceDependencies: [],
        platformDependencies: ['AWS Machine Learning']
    },
    {
        serviceName: 'Reporting and Analytics Service',
        serviceDescription: 'Provides reports on contact center performance.',
        owningTeamId: 'team7',
        apis: [
            {
                apiName: 'Performance Metrics API',
                apiDescription: 'Retrieves metrics on agent and center performance.',
                dependentApis: []
            },
            {
                apiName: 'Historical Data API',
                apiDescription: 'Accesses historical interaction data.',
                dependentApis: []
            }
        ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Redshift', 'Amazon QuickSight']
    },
    {
        serviceName: 'Business Configuration Service',
        serviceDescription: 'Allows administrators to configure business rules and settings.',
        owningTeamId: 'team8', 
        apis: [
            {
                apiName: 'Settings API',
                apiDescription: 'Manages system-wide settings.',
                dependentApis: []
            },
            {
                apiName: 'Rules Engine API',
                apiDescription: 'Defines routing and assignment rules.',
                dependentApis: []
            }
        ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service', 'Communication Channels Service', 'Skills Management Service'],
        platformDependencies: ['AWS CloudFormation']
    }
];

/** Updated System Data for ConnectPro (including seniorManagers and yearlyInitiatives) **/
const sampleSystemDataContactCenter = {
    systemName: 'ConnectPro',
    systemDescription: 'ConnectPro is a cloud-based contact center solution that streamlines customer interactions across multiple channels.',
    seniorManagers: sampleSeniorManagersDataContactCenter,
    teams: contactCenterTeamsData,
    sdms: contactCenterSDMsData,
    pmts: contactCenterPMTsData,
    services: sampleServicesDataConnectPro,
    platformDependencies: [], // Will be built dynamically on load
    // Capacity constraints
    capacityConfiguration: {
        workingDaysPerYear: 261, // To be configured
        standardHoursPerDay: 8,  // Default
        globalConstraints: {
            publicHolidays: null, // To be configured
            orgEvents: [
                // User will add events via UI later
            ]
        },
        leaveTypes: [ // Define standard leave types globally
            { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0 },
            { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0 },
            { id: "study", name: "Study Leave", defaultEstimatedDays: 0 },
            { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0 }
           // { id: "paternity", name: "Paternity Leave", defaultEstimatedDays: 0 },
           // { id: "family", name: "Family Responsibility", defaultEstimatedDays: 0 }
        ]
    },
    yearlyInitiatives: [
        // --- Protected Initiatives ---
        {
            initiativeId: 'init-cc-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', relatedBusinessGoalId: 'eng-excellence', isProtected: true,
            assignments: [ // Assign estimate to all teams
                { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.75 },
                { teamId: 'team5', sdeYears: 1.25 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }
            ]
        },
        {
            initiativeId: 'init-cc-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', relatedBusinessGoalId: 'ops-stability', isProtected: true,
            assignments: [ // Assign 1 SDE Year to all teams
                 { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 },
                 { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 }
            ]
        },
        {
            initiativeId: 'init-cc-security', title: 'Mandatory Security Audit & Remediation', description: 'Address findings from annual security audit and maintain compliance.', relatedBusinessGoalId: 'compliance', isProtected: true,
            assignments: [
                { teamId: 'team1', sdeYears: 0.5 }, // Customer Portal
                { teamId: 'team4', sdeYears: 0.75 }, // Agent Desktop
                { teamId: 'team5', sdeYears: 0.5 }, // Comm Channels (sensitive data)
                { teamId: 'team8', sdeYears: 0.5 }  // Config / Infra
            ]
        },
        // --- Feature/Product Initiatives (Examples) ---
        { initiativeId: 'init-cc-001', title: 'Omnichannel Support (Chat)', description: 'Integrate live chat channel support.', relatedBusinessGoalId: 'customer-sat', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-002', title: 'AI-Powered Agent Assist (KB Suggestions)', description: 'Suggest relevant knowledge base articles to agents in real-time.', relatedBusinessGoalId: 'agent-efficiency', isProtected: false, assignments: [{ teamId: 'team4', sdeYears: 2.5 }, { teamId: 'team7', sdeYears: 1.0 }] },
        { initiativeId: 'init-cc-003', title: 'Upgrade Reporting Engine', description: 'Migrate reporting to new platform for better performance.', relatedBusinessGoalId: 'eng-excellence', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 3.0 }] },
        { initiativeId: 'init-cc-004', title: 'Salesforce CRM Integration V1', description: 'Basic integration to sync contact data and case creation.', relatedBusinessGoalId: 'integration', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team8', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-005', title: 'Customer Portal Self-Service KB', description: 'Allow customers to search knowledge base via portal.', relatedBusinessGoalId: 'customer-sat', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.5 }] },
        { initiativeId: 'init-cc-006', title: 'Advanced Routing Rules (Time-based)', description: 'Allow configuration of time-of-day routing.', relatedBusinessGoalId: 'ops-efficiency', isProtected: false, assignments: [{ teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-007', title: 'Agent Performance Dashboard', description: 'New dashboard in agent desktop showing key metrics.', relatedBusinessGoalId: 'agent-efficiency', isProtected: false, assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-008', title: 'Skills-Based Routing Enhancements', description: 'Add proficiency levels to skill matching.', relatedBusinessGoalId: 'customer-sat', isProtected: false, assignments: [{ teamId: 'team6', sdeYears: 1.5 }, { teamId: 'team3', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-009', title: 'Email Channel Integration', description: 'Add support for email as an interaction channel.', relatedBusinessGoalId: 'customer-sat', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-010', title: 'Voice Call Recording & Playback', description: 'Implement secure call recording and retrieval.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team8', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-011', title: 'Case Prioritization Engine', description: 'Automatically prioritize cases based on SLA or sentiment.', relatedBusinessGoalId: 'ops-efficiency', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team7', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-012', title: 'Configuration Change History', description: 'Track who changed what configuration when.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 1.0 }] },
        { initiativeId: 'init-cc-013', title: 'CTI Screen Pop Improvements', description: 'Customize screen pop data based on call context.', relatedBusinessGoalId: 'agent-efficiency', isProtected: false, assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team5', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-014', title: 'Sentiment Analysis POC', description: 'Proof-of-concept for analyzing sentiment in chat/email.', relatedBusinessGoalId: 'innovation', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 1.0 }] },
        { initiativeId: 'init-cc-015', title: 'Supervisor Barge-In/Listen-In', description: 'Allow supervisors to monitor or join live calls.', relatedBusinessGoalId: 'quality-assurance', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-016', title: 'Customer Satisfaction Survey (CSAT)', description: 'Implement post-interaction CSAT surveys.', relatedBusinessGoalId: 'customer-sat', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-017', title: 'Agent Skill Self-Assessment', description: 'Allow agents to update their skill profiles.', relatedBusinessGoalId: 'agent-efficiency', isProtected: false, assignments: [{ teamId: 'team6', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.25 }] },
        { initiativeId: 'init-cc-018', title: 'Knowledge Base Article Versioning', description: 'Track changes and history for KB articles.', relatedBusinessGoalId: 'eng-excellence', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.5 }] }, // Assuming portal team owns KB UI
        { initiativeId: 'init-cc-019', title: 'Real-time Queue Dashboard', description: 'Dashboard showing queue lengths, wait times.', relatedBusinessGoalId: 'ops-efficiency', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.25 }] },
        { initiativeId: 'init-cc-020', title: 'Automated Case Closure Rules', description: 'Configure rules to auto-close inactive cases.', relatedBusinessGoalId: 'ops-efficiency', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team8', sdeYears: 0.25 }] },
        { initiativeId: 'init-cc-021', title: 'Bulk User Import/Update', description: 'Allow admins to manage agents in bulk.', relatedBusinessGoalId: 'ops-efficiency', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 0.5 }] },
        { initiativeId: 'init-cc-022', title: 'PCI Compliance for Call Recordings', description: 'Ensure call recording storage meets PCI standards.', relatedBusinessGoalId: 'compliance', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }] }
    ],
    // *** NEW: Add placeholder for calculated capacity metrics ***
    calculatedCapacityMetrics: null
    // **********************************************************
};