/** Define a unique key for local storage **/
const LOCAL_STORAGE_KEY = 'architectureVisualization_systems_v2';

const STANDARD_WORK_PACKAGE_PHASES = [
    "Requirements & Definition",
    "Design (Technical & UX)",
    "Implementation",
    "Integration & System Testing",
    "Security Testing",
    "User Acceptance Testing (UAT/E2E)",
    "Deployment",
    "Completed & Monitored"
];

const Modes = {
    NAVIGATION: 'navigation',
    Browse: 'Browse',
    EDITING: 'editing',
    CREATING: 'creating',
    PLANNING: 'planning'
};

/** Sample Data for StreamView **/

/** Sample Project Managers for StreamView **/
const sampleProjectManagersDataStreamView = [
    { pmId: 'pmSV001', pmName: 'Eleanor Planwell', attributes: {} },
    { pmId: 'pmSV002', pmName: 'Marcus Scope', attributes: {} }
];

const sampleSeniorManagersDataStreamView = [
    { seniorManagerId: 'srMgr1', seniorManagerName: 'Director Dave' },
    { seniorManagerId: 'srMgr2', seniorManagerName: 'VP Victoria' }
];

/** Sample Project Managers for ConnectPro **/
const sampleProjectManagersDataContactCenter = [
    { pmId: 'pmCC001', pmName: 'Valerie Timeline', attributes: {} },
    { pmId: 'pmCC002', pmName: 'Ricardo Deliver', attributes: {} }
];

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

const samplePMTsDataStreamView = [
    { pmtId: 'pmt1', pmtName: 'Bob Smith' },
    { pmtId: 'pmt2', pmtName: 'Frank Thompson' },
    { pmtId: 'pmt3', pmtName: 'Jane Parker' },
    { pmtId: 'pmt4', pmtName: 'Owen Clark' }
];

// Define all unique engineers for StreamView with their full attributes
const sampleAllKnownEngineersStreamView = [
    // Team 1: Avengers
    { name: 'Alice Johnson', level: 4, currentTeamId: 'team1', attributes: { isAISWE: false, aiAgentType: null, skills: ['UI/UX Design', 'JavaScript', 'CSS', 'Team Leadership'], yearsOfExperience: 7 } },
    { name: 'Mark Evans', level: 3, currentTeamId: 'team1', attributes: { isAISWE: false, aiAgentType: null, skills: ['React', 'State Management', 'Accessibility', 'Frontend Architecture'], yearsOfExperience: 5 } },
    { name: 'Sophia Lee', level: 3, currentTeamId: 'team1', attributes: { isAISWE: false, aiAgentType: null, skills: ['User Research', 'Prototyping', 'Usability Testing'], yearsOfExperience: 4 } },
    { name: 'John Doe', level: 2, currentTeamId: 'team1', attributes: { isAISWE: false, aiAgentType: null, skills: ['HTML', 'CSS', 'Basic JS', 'Component Development'], yearsOfExperience: 2 } },
    { name: 'Emma Davis', level: 1, currentTeamId: 'team1', attributes: { isAISWE: false, aiAgentType: null, skills: ['Wireframing', 'User Testing Support', 'Design Tools'], yearsOfExperience: 1 } },
    // Team 2: Spartans
    { name: 'Emily Clark', level: 5, currentTeamId: 'team2', attributes: { isAISWE: false, aiAgentType: null, skills: ['Video Streaming Protocols', 'CDN Management', 'Performance Optimization', 'System Architecture'], yearsOfExperience: 10 } },
    { name: 'Daniel Thompson', level: 3, currentTeamId: 'team2', attributes: { isAISWE: false, aiAgentType: null, skills: ['HLS', 'DASH', 'DRM Implementation', 'Network Analysis'], yearsOfExperience: 5 } },
    { name: 'Olivia Brown', level: 2, currentTeamId: 'team2', attributes: { isAISWE: false, aiAgentType: null, skills: ['Media Player Integration', 'Video Encoding', 'QA for Streaming'], yearsOfExperience: 3 } },
    { name: 'Liam Wilson', level: 2, currentTeamId: 'team2', attributes: { isAISWE: false, aiAgentType: null, skills: ['Network Protocols', 'Caching Strategies', 'Monitoring Tools'], yearsOfExperience: 2 } },
    // Team 3: Crusaders
    { name: 'Carol Davis', level: 4, currentTeamId: 'team3', attributes: { isAISWE: false, aiAgentType: null, skills: ['Content Management Systems', 'Metadata Standards', 'Digital Asset Management', 'Workflow Design'], yearsOfExperience: 8 } },
    { name: 'Kevin Moore', level: 2, currentTeamId: 'team3', attributes: { isAISWE: false, aiAgentType: null, skills: ['Workflow Automation', 'Scripting (Python)', 'CMS Administration'], yearsOfExperience: 3 } },
    { name: 'Isabella Martinez', level: 2, currentTeamId: 'team3', attributes: { isAISWE: false, aiAgentType: null, skills: ['Data Ingestion Pipelines', 'Content QC', 'Taxonomy Management'], yearsOfExperience: 2 } },
    // Team 4: Olympus
    { name: 'Grace Lee', level: 4, currentTeamId: 'team4', attributes: { isAISWE: false, aiAgentType: null, skills: ['Machine Learning Model Development', 'Recommendation Algorithms', 'Python (Scikit-learn, TensorFlow)', 'Big Data Processing'], yearsOfExperience: 7 } },
    { name: 'Ethan Harris', level: 3, currentTeamId: 'team4', attributes: { isAISWE: false, aiAgentType: null, skills: ['Data Analysis', 'Apache Spark', 'Scala', 'ML Ops Basics'], yearsOfExperience: 5 } },
    { name: 'Mia Turner', level: 2, currentTeamId: 'team4', attributes: { isAISWE: false, aiAgentType: null, skills: ['Feature Engineering', 'A/B Testing Frameworks', 'SQL'], yearsOfExperience: 3 } },
    { name: 'Noah Walker', level: 1, currentTeamId: 'team4', attributes: { isAISWE: false, aiAgentType: null, skills: ['SQL', 'Data Pipelines (Entry)', 'Reporting Tools'], yearsOfExperience: 1 } },
    // Team 5: Falcons
    { name: 'Ian Turner', level: 5, currentTeamId: 'team5', attributes: { isAISWE: false, aiAgentType: null, skills: ['Billing Systems Architecture', 'Payment Gateway Integration', 'Financial Compliance (PCI-DSS)', 'Secure Coding Practices'], yearsOfExperience: 12 } },
    { name: 'Charlotte Adams', level: 3, currentTeamId: 'team5', attributes: { isAISWE: false, aiAgentType: null, skills: ['Subscription Management Logic', 'Stripe API', 'Invoice Generation'], yearsOfExperience: 6 } },
    { name: 'Benjamin Scott', level: 3, currentTeamId: 'team5', attributes: { isAISWE: false, aiAgentType: null, skills: ['Fraud Detection Systems', 'Financial Data Security', 'API Security'], yearsOfExperience: 5 } },
    // Team 6: Ninjas
    { name: 'Karen Adams', level: 3, currentTeamId: 'team6', attributes: { isAISWE: false, aiAgentType: null, skills: ['Notification System Design', 'Email APIs (SendGrid/SES)', 'Push Notification Services (FCM/APNS)', 'Scalable Messaging'], yearsOfExperience: 5 } },
    { name: 'Lucas Wright', level: 2, currentTeamId: 'team6', attributes: { isAISWE: false, aiAgentType: null, skills: ['Message Queues (RabbitMQ/SQS)', 'System Monitoring', 'Templating Engines'], yearsOfExperience: 3 } },
    // Team 7: Dragons
    { name: 'Natalie Green', level: 4, currentTeamId: 'team7', attributes: { isAISWE: false, aiAgentType: null, skills: ['Data Warehousing (Redshift/Snowflake)', 'ETL Processes', 'Business Intelligence Tools', 'Data Governance'], yearsOfExperience: 8 } },
    { name: 'Andrew Hall', level: 3, currentTeamId: 'team7', attributes: { isAISWE: false, aiAgentType: null, skills: ['Advanced SQL', 'Tableau/PowerBI', 'Dashboard Design', 'Data Modeling'], yearsOfExperience: 4 } },
    { name: 'Ella Young', level: 2, currentTeamId: 'team7', attributes: { isAISWE: false, aiAgentType: null, skills: ['Data Visualization Libraries (D3.js basics)', 'Python (Pandas, NumPy)', 'Report Generation'], yearsOfExperience: 2 } },
    // Team 8: Search
    { name: 'Zoe King', level: 3, currentTeamId: 'team8', attributes: { isAISWE: false, aiAgentType: null, skills: ['Search Algorithms', 'Elasticsearch/Solr', 'NLP Fundamentals', 'Relevance Tuning'], yearsOfExperience: 6 } },
    { name: 'Michael Baker', level: 2, currentTeamId: 'team8', attributes: { isAISWE: false, aiAgentType: null, skills: ['Search Indexing Strategies', 'Query Optimization', 'Log Analysis for Search'], yearsOfExperience: 3 } },
    // Sample AI SWEs for StreamView
    { name: 'AI-Coder-001 (StreamView)', level: 3, currentTeamId: 'team2', attributes: { isAISWE: true, aiAgentType: "Video Codec Optimization", skills: ["AV1", "H.265", "FFmpeg", "Performance Tuning"], yearsOfExperience: null } },
    { name: 'AI-Analyst-007 (StreamView)', level: 4, currentTeamId: 'team7', attributes: { isAISWE: true, aiAgentType: "Predictive Analytics", skills: ["Python", "TensorFlow", "Scikit-learn", "BigQuery"], yearsOfExperience: null } }
];

// Updated sampleTeamsDataStreamView to only contain engineer names
const sampleTeamsDataStreamView = [
    { teamId: 'team1', teamName: 'User Experience Team', teamIdentity: 'Avengers', fundedHeadcount: 7, engineers: ['Alice Johnson', 'Mark Evans', 'Sophia Lee', 'John Doe', 'Emma Davis'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team2', teamName: 'Streaming Team', teamIdentity: 'Spartans', fundedHeadcount: 5, engineers: ['Emily Clark', 'Daniel Thompson', 'Olivia Brown', 'Liam Wilson', 'AI-Coder-001 (StreamView)'], awayTeamMembers: [ { name: 'Borrowed Betty', level: 3, sourceTeam: 'External Partner X' } ], sdmId: 'sdm2', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team3', teamName: 'Content Team', teamIdentity: 'Crusaders', fundedHeadcount: 4, engineers: ['Carol Davis', 'Kevin Moore', 'Isabella Martinez'], awayTeamMembers: [], sdmId: 'sdm3', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team4', teamName: 'Recommendation Team', teamIdentity: 'Olympus', fundedHeadcount: 6, engineers: ['Grace Lee', 'Ethan Harris', 'Mia Turner', 'Noah Walker'], awayTeamMembers: [ { name: 'Loaned Larry', level: 4, sourceTeam: 'Core Platform BU' }, { name: 'Visiting Vinny', level: 2, sourceTeam: 'Data Science Org' } ], sdmId: 'sdm4', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team5', teamName: 'Finance Team', teamIdentity: 'Falcons', fundedHeadcount: 4, engineers: ['Ian Turner', 'Charlotte Adams', 'Benjamin Scott'], awayTeamMembers: [], sdmId: 'sdm5', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team6', teamName: 'Communication Team', teamIdentity: 'Ninjas', fundedHeadcount: 3, engineers: ['Karen Adams', 'Lucas Wright'], awayTeamMembers: [], sdmId: 'sdm6', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team7', teamName: 'Analytics Team', teamIdentity: 'Dragons', fundedHeadcount: 5, engineers: ['Natalie Green', 'Andrew Hall', 'Ella Young', 'AI-Analyst-007 (StreamView)'], awayTeamMembers: [], sdmId: 'sdm7', pmtId: 'pmt4', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team8', teamName: 'Search Team', teamIdentity: 'Search', fundedHeadcount: 3, engineers: ['Zoe King', 'Michael Baker'], awayTeamMembers: [], sdmId: 'sdm8', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }}
];

const sampleServicesDataStreamView = [
    {
      serviceName: 'User Management Service',
      serviceDescription: 'Handles user registration, authentication, profiles, and account settings.',
      owningTeamId: 'team1',
      apis: [
          { apiName: 'Register API', apiDescription: 'Allows new users to sign up.', dependentApis: [] },
          { apiName: 'Login API', apiDescription: 'Authenticates users and starts a session.', dependentApis: [] },
          { apiName: 'Profile API', apiDescription: 'Manages user profiles and account settings.', dependentApis: [] },
          { apiName: 'Logout API', apiDescription: 'Ends the user session.', dependentApis: [] }
      ],
      serviceDependencies: [],
      platformDependencies: ['Auth0', 'AWS DynamoDB']
    },
    {
      serviceName: 'Content Delivery Service',
      serviceDescription: 'Manages content streaming and delivery to users.',
      owningTeamId: 'team2',
      apis: [
          { apiName: 'Stream Content API', apiDescription: 'Streams selected content to the user.', dependentApis: ['Subscription API', 'Profile API'] },
          { apiName: 'Adaptive Bitrate API', apiDescription: 'Adjusts streaming quality based on network conditions.', dependentApis: [] },
          { apiName: 'Content Caching API', apiDescription: 'Manages caching of frequently accessed content.', dependentApis: [] }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS CloudFront', 'AWS S3']
    },
    {
      serviceName: 'Content Management Service',
      serviceDescription: 'Handles content ingestion, metadata, and catalog management.',
      owningTeamId: 'team3',
      apis: [
          { apiName: 'Content Ingestion API', apiDescription: 'Ingests new content into the platform.', dependentApis: [] },
          { apiName: 'Metadata API', apiDescription: 'Manages content metadata like titles, descriptions, genres.', dependentApis: [] },
          { apiName: 'Catalog API', apiDescription: 'Provides the catalog of available content.', dependentApis: [] }
      ],
      serviceDependencies: [],
      platformDependencies: ['AWS S3', 'AWS Lambda']
    },
    {
      serviceName: 'Recommendation Engine Service',
      serviceDescription: 'Provides personalized content recommendations to users based on viewing history and preferences.',
      owningTeamId: 'team4',
      apis: [
          { apiName: 'Recommendations API', apiDescription: 'Retrieves recommended content for a user.', dependentApis: ['User Behavior Tracking API', 'Metadata API'] },
          { apiName: 'User Behavior Tracking API', apiDescription: 'Tracks user interactions and viewing history.', dependentApis: [] }
      ],
      serviceDependencies: ['User Management Service', 'Content Management Service', 'Analytics Service'],
      platformDependencies: ['AWS Machine Learning', 'Apache Spark']
    },
    {
      serviceName: 'Billing and Subscription Service',
      serviceDescription: 'Manages user subscriptions, billing, and payment processing.',
      owningTeamId: 'team5',
      apis: [
          { apiName: 'Subscription API', apiDescription: 'Manages user subscription plans.', dependentApis: [] },
          { apiName: 'Payment Processing API', apiDescription: 'Processes payments securely.', dependentApis: ['Email Notification API'] },
          { apiName: 'Invoice API', apiDescription: 'Generates invoices and billing statements.', dependentApis: [] }
      ],
      serviceDependencies: ['User Management Service', 'Notification Service'],
      platformDependencies: ['Stripe API', 'AWS RDS']
    },
    {
      serviceName: 'Notification Service',
      serviceDescription: 'Sends notifications, emails, and in-app messages to users.',
      owningTeamId: 'team6',
      apis: [
          { apiName: 'Email Notification API', apiDescription: 'Sends email notifications to users.', dependentApis: [] },
          { apiName: 'Push Notification API', apiDescription: 'Sends push notifications to user devices.', dependentApis: ['Profile API'] },
          { apiName: 'In-App Messaging API', apiDescription: 'Displays messages within the app.', dependentApis: [] }
      ],
      serviceDependencies: ['User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS SNS', 'Firebase Cloud Messaging']
    },
    {
      serviceName: 'Analytics Service',
      serviceDescription: 'Collects and analyzes data on user engagement, content performance, and platform metrics.',
      owningTeamId: 'team7',
      apis: [
          { apiName: 'Data Collection API', apiDescription: 'Collects data from various services.', dependentApis: [] },
          { apiName: 'Reporting API', apiDescription: 'Provides analytical reports and dashboards.', dependentApis: [] }
      ],
      serviceDependencies: ['User Management Service', 'Content Delivery Service', 'Recommendation Engine Service'],
      platformDependencies: ['AWS Redshift', 'Tableau']
    },
    {
      serviceName: 'Search Service',
      serviceDescription: 'Enables users to search for content across the platform.',
      owningTeamId: 'team8',
      apis: [
          { apiName: 'Search API', apiDescription: 'Allows users to search for content by title, genre, etc.', dependentApis: [] },
          { apiName: 'Autocomplete API', apiDescription: 'Provides search suggestions as users type.', dependentApis: [] }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service'],
      platformDependencies: ['Elasticsearch']
    }
];

// IN JS/DATA.JS
// REPLACE THE ENTIRE EXISTING const sampleSystemDataStreamView = { ... }; OBJECT WITH THIS:

const sampleSystemDataStreamView = {
    systemName: 'StreamView',
    systemDescription: 'StreamView is a video streaming platform that provides personalized content to users worldwide.',
    seniorManagers: sampleSeniorManagersDataStreamView,
    teams: sampleTeamsDataStreamView, // Ensure engineer objects within this array have their 'attributes' field as previously discussed
    sdms: sampleSDMsDataStreamView,
    pmts: samplePMTsDataStreamView,
    projectManagers: sampleProjectManagersDataStreamView, // New
    services: sampleServicesDataStreamView,
    platformDependencies: [], // Will be built dynamically on load

    capacityConfiguration: {
        workingDaysPerYear: 261,
        standardHoursPerDay: 8,
        globalConstraints: {
            publicHolidays: 10,
            orgEvents: [
                { id: 'event1', name: 'Company All-Hands Q1', estimatedDaysPerSDE: 0.5, attributes: {} },
                { id: 'event2', name: 'Innovation Day Sprint', estimatedDaysPerSDE: 2, attributes: {} }
            ]
        },
        leaveTypes: [
            { id: "annual", name: "Annual Leave", defaultEstimatedDays: 20, attributes: {} },
            { id: "sick", name: "Sick Leave", defaultEstimatedDays: 7, attributes: {} },
            { id: "study", name: "Study Leave", defaultEstimatedDays: 5, attributes: {} },
            { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
        ]
    },

    yearlyInitiatives: [
        // --- Protected Initiatives (Fully Updated) ---
        {
            initiativeId: 'init-sv-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', isProtected: true,
            assignments: [
                { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 1.25 },
                { teamId: 'team5', sdeYears: 0.75 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }
            ],
            roi: { category: 'Tech Debt', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for platform stability and developer velocity.', businessCaseLink: null, overrideJustification: 'KTLO is mandatory and foundational.' },
            targetDueDate: null, actualCompletionDate: null, status: 'Committed',
            themes: ['theme-eng-excellence-sv', 'theme-platform-stability-sv'], primaryGoalId: 'goal-stability-sv-2025',
            projectManager: null, owner: { type: 'seniorManager', id: 'srMgr1', name: 'Director Dave' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
            impactedServiceIds: [], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', isProtected: true,
            assignments: [
                 { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 },
                 { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 }
            ],
            roi: { category: 'Risk Mitigation', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Prevents revenue loss and reputational damage from outages.', businessCaseLink: null, overrideJustification: 'Essential for operational stability.' },
            targetDueDate: null, actualCompletionDate: null, status: 'Committed',
            themes: ['theme-platform-stability-sv'], primaryGoalId: 'goal-stability-sv-2025',
            projectManager: null, owner: { type: 'seniorManager', id: 'srMgr1', name: 'Director Dave' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' },
            impactedServiceIds: [], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-security', title: 'Mandatory Security Hardening (Compliance)', description: 'Address critical security vulnerabilities and ensure compliance (e.g., SOC2, GDPR).', isProtected: true,
            assignments: [ { teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team5', sdeYears: 0.75 }, { teamId: 'team2', sdeYears: 0.5 } ],
            roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Mandatory', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Required for legal and regulatory compliance.', businessCaseLink: null, overrideJustification: 'Compliance is non-negotiable.' },
            targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-security-sv', 'theme-compliance-sv'], primaryGoalId: 'goal-security-compliance-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'seniorManager', id: 'srMgr2', name: 'VP Victoria' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            impactedServiceIds: ['User Management Service', 'Billing and Subscription Service', 'Content Delivery Service'], workPackageIds: [], attributes: {}
        },
        // --- Feature/Product Initiatives (Fully Updated) ---
        {
            initiativeId: 'init-sv-001', title: 'AV1 Codec Support', description: 'Implement AV1 codec for improved streaming efficiency.', isProtected: false,
            assignments: [{ teamId: 'team2', sdeYears: 2.5 }, { teamId: 'team3', sdeYears: 1.0 }],
            roi: { category: 'Cost Reduction', valueType: 'Monetary', estimatedValue: 75000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Estimated 15% bandwidth reduction translating to $75k annual cost savings.', businessCaseLink: 'https://example.com/docs/av1_roi', overrideJustification: null },
            targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv', 'theme-cost-reduction-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engEmilyClark_team2_sv', name: 'Emily Clark (Spartans)' }, // Assuming a unique engineer reference
            impactedServiceIds: ['Content Delivery Service', 'Content Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-002', title: 'Tiered Subscription Model', description: 'Launch new subscription tiers (Basic, Premium, Family).', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 3.0 }, { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.5 }],
            roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: 250000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Projected uptake of new tiers leading to $250k additional ARR.', businessCaseLink: 'https://example.com/docs/tiers_roi', overrideJustification: null },
            targetDueDate: "2025-12-15", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-revenue-growth-sv'], primaryGoalId: 'goal-revenue-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            impactedServiceIds: ['Billing and Subscription Service', 'User Management Service', 'Notification Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-003', title: 'Recommendation Algorithm V3', description: 'Develop and deploy next-gen recommendation engine.', isProtected: false,
            assignments: [{ teamId: 'team4', sdeYears: 4.0 }, { teamId: 'team7', sdeYears: 1.5 }],
            roi: { category: 'Strategic Alignment', valueType: 'MetricImprovement', estimatedValue: '5% Engagement Uplift', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Expected 5% increase in content consumption per user.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm4', name: 'Grace Lee' }, technicalPOC: { type: 'engineer', id: 'engGraceLee_team4_sv', name: 'Grace Lee (Olympus)' },
            impactedServiceIds: ['Recommendation Engine Service', 'Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-004', title: 'Expand CDN to South America', description: 'Set up CDN infrastructure in SA region.', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }],
            roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Market Expansion to SA', currency: null, timeHorizonMonths: 18, confidenceLevel: 'Medium', calculationMethodology: 'Enables entry into new geographic market.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2026-03-31", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-global-expansion-sv'], primaryGoalId: 'goal-expansion-sv-2026',
            projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engDanielThompson_team2_sv', name: 'Daniel Thompson (Spartans)' },
            impactedServiceIds: ['Content Delivery Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-005', title: 'User Profile Enhancements', description: 'Add customizable avatars and viewing preferences.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.5 }],
            roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '2% increase in profile completion', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Increased personalization options expected to improve profile completion rates.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
            impactedServiceIds: ['User Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-006', title: 'Content Search Facets', description: 'Improve search with filters for genre, rating, year.', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }],
            roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '10% faster content discovery', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Facets expected to significantly reduce time to find content.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm8', name: 'Zoe King' },
            impactedServiceIds: ['Search Service', 'Content Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-007', title: 'Offline Viewing Improvements', description: 'Enhance download stability and management.', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.0 }],
            roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '5% reduction in download failures', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Improved reliability for offline feature.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-10-15", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engOliviaBrown_team2_sv', name: 'Olivia Brown (Spartans)' },
            impactedServiceIds: ['Content Delivery Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-008', title: 'A/B Testing Framework', description: 'Build internal framework for feature A/B testing.', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 2.0 }],
            roi: { category: 'Engineering Excellence', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Experimentation', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Reduces time to run A/B tests by 50%, enabling quicker data-driven decisions.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-eng-excellence-sv'], primaryGoalId: 'goal-stability-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' }, technicalPOC: { type: 'engineer', id: 'engNatalieGreen_team7_sv', name: 'Natalie Green (Dragons)' },
            impactedServiceIds: ['Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-009', title: 'Parental Controls V2', description: 'Granular controls per profile and content rating.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.0 }],
            roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Addresses user demand and improves platform trust for families.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-08-15", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-compliance-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-security-compliance-sv-2025', // Also UX
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
            impactedServiceIds: ['User Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-010', title: 'Interactive Content POC', description: 'Proof-of-concept for choose-your-own-adventure style content.', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team3', sdeYears: 0.5 }],
            roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Explore new content formats', currency: null, timeHorizonMonths: 4, confidenceLevel: 'Medium', calculationMethodology: 'POC to determine feasibility and user interest.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Backlog', // Could be a lower priority item
            themes: ['theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Carol Davis' },
            impactedServiceIds: ['Content Delivery Service', 'Content Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-011', title: 'Payment Gateway Integration (New Region)', description: 'Add local payment options for APAC.', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.5 }],
            roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Market Expansion APAC', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Required for APAC market launch.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2026-01-31", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-global-expansion-sv'], primaryGoalId: 'goal-expansion-sv-2026', // Link to a 2026 goal
            projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            impactedServiceIds: ['Billing and Subscription Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-012', title: 'Real-time Analytics Dashboard', description: 'Internal dashboard for viewing concurrency and errors.', isProtected: false, assignments: [{ teamId: 'team7', sdeYears: 1.0 }],
            roi: { category: 'Operational Stability', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Incident Response', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Reduces MTTR by providing real-time insights.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-15", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-platform-stability-sv', 'theme-eng-excellence-sv'], primaryGoalId: 'goal-stability-sv-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' }, technicalPOC: { type: 'engineer', id: 'engAndrewHall_team7_sv', name: 'Andrew Hall (Dragons)' },
            impactedServiceIds: ['Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-013', title: 'Watch Party Feature', description: 'Allow users to watch content synchronously with friends.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team6', sdeYears: 0.5 }],
            roi: { category: 'User Engagement', valueType: 'MetricImprovement', estimatedValue: 'Increased Social Interaction', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Aims to boost user stickiness and social sharing.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
            impactedServiceIds: ['User Management Service', 'Content Delivery Service', 'Notification Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-014', title: 'Metadata Enrichment AI', description: 'Use AI to auto-tag content metadata.', isProtected: false, assignments: [{ teamId: 'team3', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
            roi: { category: 'Productivity/Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 1000, currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Automates manual tagging, saving approx. 1000 editor hours/year.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-eng-excellence-sv', 'theme-cost-reduction-sv'], primaryGoalId: null, // Could be a general efficiency goal
            projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Carol Davis' }, technicalPOC: { type: 'engineer', id: 'engCarolDavis_team3_sv', name: 'Carol Davis (Crusaders)' },
            impactedServiceIds: ['Content Management Service', 'Recommendation Engine Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-015', title: 'GDPR Data Deletion Automation', description: 'Automate user data deletion requests for GDPR.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.75 }, { teamId: 'team7', sdeYears: 0.25 }],
            roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Reduced Manual Effort & Risk', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Ensures timely compliance and reduces manual processing overhead.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-05-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-compliance-sv', 'theme-platform-stability-sv'], primaryGoalId: 'goal-security-compliance-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' }, technicalPOC: { type: 'engineer', id: 'engMarkEvans_team1_sv', name: 'Mark Evans (Avengers)' },
            impactedServiceIds: ['User Management Service', 'Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-016', title: 'Improved Subtitle Customization', description: 'Allow users to change subtitle font, size, color.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.5 }],
            roi: { category: 'Accessibility', valueType: 'QualitativeScore', estimatedValue: 'High', currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Improves accessibility and user satisfaction for a key feature.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv', 'theme-compliance-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'engineer', id: 'engSophiaLee_team1_sv', name: 'Sophia Lee (Avengers)' },
            impactedServiceIds: ['User Management Service'], workPackageIds: [], attributes: {} // Assuming player settings are part of UMS
        },
        {
            initiativeId: 'init-sv-017', title: 'Search Performance Optimization', description: 'Reduce search latency by 50%.', isProtected: false, assignments: [{ teamId: 'team8', sdeYears: 1.0 }],
            roi: { category: 'Engineering Excellence', valueType: 'MetricImprovement', estimatedValue: '50% Latency Reduction', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Improves core search performance for better UX.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-eng-excellence-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm8', name: 'Zoe King' }, technicalPOC: { type: 'engineer', id: 'engZoeKing_team8_sv', name: 'Zoe King (Search)' },
            impactedServiceIds: ['Search Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-018', title: 'Gift Subscriptions', description: 'Allow users to purchase subscriptions for others.', isProtected: false, assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.25 }],
            roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: 50000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Low', calculationMethodology: 'New revenue stream, estimate based on 1% of user base gifting.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-11-15", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-revenue-growth-sv'], primaryGoalId: 'goal-revenue-sv-2025',
            projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            impactedServiceIds: ['Billing and Subscription Service', 'Notification Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-019', title: 'Video Player Accessibility Audit & Fixes', description: 'Ensure player meets WCAG AA standards.', isProtected: false, assignments: [{ teamId: 'team1', sdeYears: 0.75 }],
            roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'High', currency: null, timeHorizonMonths: 5, confidenceLevel: 'High', calculationMethodology: 'Ensures WCAG AA compliance for video player.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-compliance-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-security-compliance-sv-2025', // Broader compliance goal
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'engineer', id: 'engJohnDoe_team1_sv', name: 'John Doe (Avengers)' },
            impactedServiceIds: ['User Management Service'], workPackageIds: [], attributes: {} // Assuming player is part of UMS or a general UI concern of team1
        },
        {
            initiativeId: 'init-sv-020', title: 'Reduce Streaming Startup Time', description: 'Optimize playback start time for users.', isProtected: false, assignments: [{ teamId: 'team2', sdeYears: 1.5 }],
            roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '200ms reduction in P95 startup', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Optimizations in player and initial segment delivery.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed',
            themes: ['theme-user-experience-sv', 'theme-eng-excellence-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engDanielThompson_team2_sv', name: 'Daniel Thompson (Spartans)' },
            impactedServiceIds: ['Content Delivery Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-021', title: 'Content Partner Reporting Portal', description: 'Allow content partners to view performance data.', isProtected: false, assignments: [{ teamId: 'team3', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }],
            roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Improved Partner Relations', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Provides transparency and value to content partners.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2026-02-28", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-partnerships-sv'], primaryGoalId: null, // Could be a new goal: 'goal-partner-relations-sv'
            projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' },
            impactedServiceIds: ['Content Management Service', 'Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-sv-022', title: 'Personalized Push Notifications', description: 'Send targeted notifications based on viewing habits.', isProtected: false, assignments: [{ teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 0.5 }],
            roi: { category: 'User Engagement', valueType: 'MetricImprovement', estimatedValue: '5% increase in DAU', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Low', calculationMethodology: 'Targeted notifications to re-engage users.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Backlog',
            themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm6', name: 'Karen Adams' },
            impactedServiceIds: ['Notification Service', 'Recommendation Engine Service'], workPackageIds: [], attributes: {}
        }
    ],

    goals: [
        {
            goalId: 'goal-stability-sv-2025', name: 'Maintain Platform Stability & Reliability 2025', description: 'Ensure StreamView platform meets 99.99% uptime and key performance indicators.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgr1', name: 'Director Dave' }, projectManager: null, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
            initiativeIds: ['init-sv-ktlo', 'init-sv-oncall', 'init-sv-008', 'init-sv-012'], attributes: {}
        },
        {
            goalId: 'goal-security-compliance-sv-2025', name: 'Achieve Full Security Compliance 2025', description: 'Meet all SOC2, GDPR, and internal security policy requirements.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgr2', name: 'VP Victoria' }, projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            initiativeIds: ['init-sv-security', 'init-sv-009', 'init-sv-015', 'init-sv-019'], attributes: {}
        },
        {
            goalId: 'goal-ux-enhancement-sv-2025', name: 'Enhance User Experience Q3/Q4 2025', description: 'Deliver key features and improvements to increase user engagement and satisfaction.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Grace Lee' },
            initiativeIds: ['init-sv-001', 'init-sv-003', 'init-sv-005', 'init-sv-006', 'init-sv-007', 'init-sv-010', 'init-sv-013', 'init-sv-016', 'init-sv-017', 'init-sv-020', 'init-sv-022'], attributes: {}
        },
        {
            goalId: 'goal-revenue-sv-2025', name: 'Grow Subscription Revenue by 15% in 2025', description: 'Launch new products and features to drive revenue growth.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
            initiativeIds: ['init-sv-002', 'init-sv-018'], attributes: {}
        },
        {
            goalId: 'goal-expansion-sv-2026', name: 'Expand to South American Market by EOY 2026', description: 'Launch StreamView services in key South American countries.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgr2', name: 'VP Victoria' }, projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' },
            initiativeIds: ['init-sv-004', 'init-sv-011'], attributes: {}
        }
    ],
    definedThemes: [
        { themeId: 'theme-eng-excellence-sv', name: 'Engineering Excellence (SV)', description: 'Initiatives focused on improving engineering practices, tools, and code quality.', relatedGoalIds: ['goal-stability-sv-2025'], attributes: {} },
        { themeId: 'theme-platform-stability-sv', name: 'Platform Stability (SV)', description: 'Ensuring the reliability and uptime of the platform.', relatedGoalIds: ['goal-stability-sv-2025'], attributes: {} },
        { themeId: 'theme-user-experience-sv', name: 'User Experience (SV)', description: 'Enhancing the overall user journey and satisfaction.', relatedGoalIds: ['goal-ux-enhancement-sv-2025'], attributes: {} },
        { themeId: 'theme-revenue-growth-sv', name: 'Revenue Growth (SV)', description: 'Initiatives directly aimed at increasing company revenue.', relatedGoalIds: ['goal-revenue-sv-2025'], attributes: {} },
        { themeId: 'theme-cost-reduction-sv', name: 'Cost Reduction (SV)', description: 'Initiatives aimed at reducing operational or other costs.', relatedGoalIds: [], attributes: {} }, // AV1 codec could link here.
        { themeId: 'theme-security-sv', name: 'Security (SV)', description: 'Initiatives focused on platform and data security.', relatedGoalIds: ['goal-security-compliance-sv-2025'], attributes: {} },
        { themeId: 'theme-compliance-sv', name: 'Compliance (SV)', description: 'Meeting legal, regulatory, and industry standards.', relatedGoalIds: ['goal-security-compliance-sv-2025'], attributes: {} },
        { themeId: 'theme-innovation-sv', name: 'Innovation (SV)', description: 'Exploring new technologies and product ideas.', relatedGoalIds: ['goal-ux-enhancement-sv-2025'], attributes: {} },
        { themeId: 'theme-global-expansion-sv', name: 'Global Expansion (SV)', description: 'Expanding service reach to new markets.', relatedGoalIds: ['goal-expansion-sv-2026'], attributes: {} },
        { themeId: 'theme-partnerships-sv', name: 'Partnerships (SV)', description: 'Developing and managing content or technology partnerships.', relatedGoalIds: [], attributes: {} }
    ],
    archivedYearlyPlans: [],
    workPackages: [],
    calculatedCapacityMetrics: null,
    allKnownEngineers: sampleAllKnownEngineersStreamView,
    attributes: {}
};

// END OF REPLACEMENT FOR sampleSystemDataStreamView

/** Sample Data for ConnectPro **/

const sampleSeniorManagersDataContactCenter = [
    { seniorManagerId: 'srMgrCC1', seniorManagerName: 'Senior Sam' }
];

const contactCenterSDMsData = [
    { sdmId: 'sdm1', sdmName: 'Alex Johnson', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm2', sdmName: 'Matthew Jackson', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm3', sdmName: 'Ryan King', seniorManagerId: 'srMgrCC1' },
    { sdmId: 'sdm4', sdmName: 'Laura Turner', seniorManagerId: 'srMgrCC1' }
];

const contactCenterPMTsData = [
    { pmtId: 'pmt1', pmtName: 'Karen Davis' },
    { pmtId: 'pmt2', pmtName: 'Patricia Thompson' },
    { pmtId: 'pmt3', pmtName: 'Angela Green' },
    { pmtId: 'pmt4', pmtName: 'Stephanie Roberts' }
];

// Temporary array to define ConnectPro engineers with their initial team and level
const tempContactCenterEngineers = [
    // Team 1: CX Warriors
    { name: 'Alex Johnson', level: 4, teamId: 'team1', skills: ['CRM Integration', 'Workflow Design', 'Customer Journey Mapping'], yearsOfExperience: 7 },
    { name: 'Emily Smith', level: 3, teamId: 'team1', skills: ['JavaScript (Frontend)', 'Customer Support Tools API', 'Zendesk Apps'], yearsOfExperience: 4 },
    { name: 'David Lee', level: 3, teamId: 'team1', skills: ['Backend API Development (Node.js)', 'Database Management (SQL)', 'Security Best Practices'], yearsOfExperience: 5 },
    { name: 'Sarah Brown', level: 2, teamId: 'team1', skills: ['HTML/CSS', 'Ticket Management Systems', 'User Training'], yearsOfExperience: 2 },
    { name: 'Michael Wilson', level: 1, teamId: 'team1', skills: ['Basic Scripting', 'QA Testing', 'Documentation'], yearsOfExperience: 1 },
    // Team 2: Case Titans
    { name: 'Jessica Taylor', level: 4, teamId: 'team2', skills: ['Case Management System Architecture', 'Salesforce Service Cloud', 'Process Automation'], yearsOfExperience: 6 },
    { name: 'Daniel Moore', level: 3, teamId: 'team2', skills: ['API Development (Java)', 'System Integration (MuleSoft/REST)', 'Data Migration'], yearsOfExperience: 5 },
    { name: 'Amy Anderson', level: 2, teamId: 'team2', skills: ['Apex (Salesforce)', 'Workflow Configuration', 'Reporting'], yearsOfExperience: 3 },
    { name: 'James Thomas', level: 2, teamId: 'team2', skills: ['SQL', 'Data Validation', 'Support Ticket Analysis'], yearsOfExperience: 2 },
    // Team 3: Routing Rangers
    { name: 'Matthew Jackson', level: 5, teamId: 'team3', skills: ['Routing Logic Design', 'Telephony Systems (Asterisk/Twilio)', 'AWS Connect', 'Real-time Systems'], yearsOfExperience: 10 },
    { name: 'Ashley White', level: 3, teamId: 'team3', skills: ['IVR Design & Scripting', 'Python', 'Lambda Functions'], yearsOfExperience: 4 },
    { name: 'Joshua Harris', level: 2, teamId: 'team3', skills: ['ACD Configuration', 'Queue Management', 'Monitoring & Alerts'], yearsOfExperience: 3 },
    { name: 'Andrew Garcia', level: 2, teamId: 'team3', skills: ['Skills-based Routing Implementation', 'Reporting on Routing Metrics'], yearsOfExperience: 2 },
    // Team 4: Agent Aces
    { name: 'Megan Clark', level: 3, teamId: 'team4', skills: ['Agent Desktop UI/UX', 'JavaScript Frameworks (e.g., Vue/Angular)', 'CTI Integration'], yearsOfExperience: 5 },
    { name: 'Steven Lewis', level: 2, teamId: 'team4', skills: ['Web Sockets', 'Browser Extension Development', 'User Acceptance Testing'], yearsOfExperience: 3 },
    { name: 'Nicole Young', level: 1, teamId: 'team4', skills: ['Frontend Bug Fixing', 'Accessibility Testing (Basic)', 'Style Guides'], yearsOfExperience: 1 },
    // Team 5: Comm Mandalorians
    { name: 'Ryan King', level: 4, teamId: 'team5', skills: ['Communication Protocols (SIP, WebRTC)', 'Channel Integration (Voice, Chat, Email)', 'API Design for Comms'], yearsOfExperience: 8 },
    { name: 'Samantha Wright', level: 3, teamId: 'team5', skills: ['Amazon Connect CCP', 'AWS Lambda for Comms', 'Security in Communication'], yearsOfExperience: 5 },
    { name: 'Brandon Lopez', level: 3, teamId: 'team5', skills: ['Email Processing Systems (AWS SES)', 'Chatbot Integration Basics', 'Scalability for Comms'], yearsOfExperience: 4 },
    { name: 'Rachel Hill', level: 2, teamId: 'team5', skills: ['Troubleshooting Voice Quality', 'Log Analysis for Comms', 'SMS Gateway Integration'], yearsOfExperience: 3 },
    { name: 'Justin Scott', level: 2, teamId: 'team5', skills: ['Testing Communication Flows', 'Carrier Integrations', 'Documentation for APIs'], yearsOfExperience: 2 },
    // Team 6: Skill Masters
    { name: 'Kimberly Adams', level: 3, teamId: 'team6', skills: ['Skills Taxonomy Design', 'Agent Performance Metrics', 'Machine Learning for Skill Prediction (Conceptual)'], yearsOfExperience: 5 },
    { name: 'Jonathan Baker', level: 2, teamId: 'team6', skills: ['Database for Skills Management', 'UI for Skill Assignment', 'Reporting on Skill Gaps'], yearsOfExperience: 3 },
    // Team 7: Data Wizards
    { name: 'Jason Carter', level: 4, teamId: 'team7', skills: ['Data Architecture for Analytics', 'AWS Redshift/QuickSight', 'ETL Pipeline Development', 'Advanced Reporting'], yearsOfExperience: 7 },
    { name: 'Melissa Mitchell', level: 3, teamId: 'team7', skills: ['SQL Query Optimization', 'Dashboard Development (QuickSight)', 'Data Modeling for BI'], yearsOfExperience: 4 },
    { name: 'Kevin Perez', level: 2, teamId: 'team7', skills: ['Data Extraction from Multiple Sources', 'Report Automation', 'Data Quality Checks'], yearsOfExperience: 2 },
    // Team 8: Config Ninjas
    { name: 'Laura Turner', level: 4, teamId: 'team8', skills: ['System Configuration Management', 'DevOps Practices (IaC - CloudFormation)', 'AWS Administration', 'Security Configuration'], yearsOfExperience: 7 },
    { name: 'Eric Phillips', level: 3, teamId: 'team8', skills: ['Rules Engine Configuration', 'Business Process Modeling Notation (BPMN)', 'System Monitoring Setup'], yearsOfExperience: 4 }
];

const sampleAllKnownEngineersContactCenter = tempContactCenterEngineers.map(eng => ({
    name: eng.name,
    level: eng.level,
    currentTeamId: eng.teamId,
    attributes: {
        isAISWE: false,
        aiAgentType: null,
        skills: eng.skills || [],
        yearsOfExperience: eng.yearsOfExperience || 0
    }
})).concat([ // Add AI SWEs
    { name: 'AI-Router-Alpha (ConnectPro)', level: 4, currentTeamId: 'team3', attributes: { isAISWE: true, aiAgentType: "Intelligent Routing", skills: ["Machine Learning", "Optimization Algorithms", "Real-time Decisioning"], yearsOfExperience: null } },
    { name: 'AI-SupportBot-Omega (ConnectPro)', level: 3, currentTeamId: 'team1', attributes: { isAISWE: true, aiAgentType: "Automated Support Response", skills: ["NLP", "DialogFlow", "Knowledge Base Integration"], yearsOfExperience: null } }
]);

// Updated contactCenterTeamsData to only contain engineer names
const contactCenterTeamsData = [
    { teamId: 'team1', teamName: 'Customer Experience Team', teamIdentity: 'CX Warriors', fundedHeadcount: 6, engineers: ['Alex Johnson', 'Emily Smith', 'David Lee', 'Sarah Brown', 'Michael Wilson', 'AI-SupportBot-Omega (ConnectPro)'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team2', teamName: 'Case Management Team', teamIdentity: 'Case Titans', fundedHeadcount: 5, engineers: ['Jessica Taylor', 'Daniel Moore', 'Amy Anderson', 'James Thomas'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team3', teamName: 'Routing and Agent Tools Team', teamIdentity: 'Routing Rangers', fundedHeadcount: 5, engineers: ['Matthew Jackson', 'Ashley White', 'Joshua Harris', 'Andrew Garcia', 'AI-Router-Alpha (ConnectPro)'], awayTeamMembers: [ { name: 'Helping Hannah', level: 2, sourceTeam: 'AI Research Division' } ], sdmId: 'sdm2', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team4', teamName: 'Agent Tools Team', teamIdentity: 'Agent Aces', fundedHeadcount: 4, engineers: ['Megan Clark', 'Steven Lewis', 'Nicole Young'], awayTeamMembers: [], sdmId: 'sdm2', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team5', teamName: 'Communication Channels Team', teamIdentity: 'Comm Mandalorians', fundedHeadcount: 6, engineers: ['Ryan King', 'Samantha Wright', 'Brandon Lopez', 'Rachel Hill', 'Justin Scott'], awayTeamMembers: [ { name: 'Support Sam', level: 3, sourceTeam: 'Sister Company Ops' } ], sdmId: 'sdm3', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team6', teamName: 'Skills Management Team', teamIdentity: 'Skill Masters', fundedHeadcount: 3, engineers: ['Kimberly Adams', 'Jonathan Baker'], awayTeamMembers: [], sdmId: 'sdm3', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team7', teamName: 'Analytics and Configuration Team', teamIdentity: 'Data Wizards', fundedHeadcount: 4, engineers: ['Jason Carter', 'Melissa Mitchell', 'Kevin Perez'], awayTeamMembers: [], sdmId: 'sdm4', pmtId: 'pmt4', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }},
    { teamId: 'team8', teamName: 'Configuration Team', teamIdentity: 'Config Ninjas', fundedHeadcount: 3, engineers: ['Laura Turner', 'Eric Phillips'], awayTeamMembers: [], sdmId: 'sdm4', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }}
];

const sampleServicesDataConnectPro = [
    {
        serviceName: 'Customer Portal Service',
        serviceDescription: 'Allows customers to raise support tickets and track their status.',
        owningTeamId: 'team1',
        apis: [ { apiName: 'Ticket Submission API', apiDescription: 'Enables customers to submit support tickets.', dependentApis: [] }, { apiName: 'Ticket Tracking API', apiDescription: 'Allows customers to check the status of their tickets.', dependentApis: [] } ],
        serviceDependencies: [],
        platformDependencies: ['AWS Cognito', 'AWS S3']
    },
    {
        serviceName: 'Case Management Service',
        serviceDescription: 'Manages the lifecycle of support tickets within the system.',
        owningTeamId: 'team2',
        apis: [ { apiName: 'Case Creation API', apiDescription: 'Creates a new case in the system.', dependentApis: [] }, { apiName: 'Case Update API', apiDescription: 'Updates case details and status.', dependentApis: [] }, { apiName: 'Case Assignment API', apiDescription: 'Assigns cases to agents based on skills and availability.', dependentApis: ['Skills Assignment API'] } ],
        serviceDependencies: ['Customer Portal Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS DynamoDB']
    },
    {
        serviceName: 'Routing Service',
        serviceDescription: 'Routes incoming interactions to appropriate agents.',
        owningTeamId: 'team3',
        apis: [ { apiName: 'Interaction Routing API', apiDescription: 'Routes voice, email, and chat interactions.', dependentApis: ['Skill Matching API', 'Agent Login API'] }, { apiName: 'Skill Matching API', apiDescription: 'Matches interactions to agents based on skills.', dependentApis: ['Skills Evaluation API'] } ],
        serviceDependencies: ['Communication Channels Service', 'Skills Management Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Lambda']
    },
    {
        serviceName: 'Agent Desktop Service',
        serviceDescription: 'Provides agents with tools to handle customer interactions.',
        owningTeamId: 'team4',
        apis: [ { apiName: 'Agent Login API', apiDescription: 'Authenticates agents and starts their session.', dependentApis: [] }, { apiName: 'Interaction Handling API', apiDescription: 'Manages ongoing interactions with customers.', dependentApis: ['Case Retrieval API'] }, { apiName: 'Case Retrieval API', apiDescription: 'Retrieves case details for agents.', dependentApis: [] } ],
        serviceDependencies: ['Case Management Service', 'Routing Service'],
        platformDependencies: ['AWS AppSync']
    },
    {
        serviceName: 'Communication Channels Service',
        serviceDescription: 'Handles voice calls, emails, and chat messages.',
        owningTeamId: 'team5',
        apis: [ { apiName: 'Voice Call API', apiDescription: 'Manages voice call connections.', dependentApis: [] }, { apiName: 'Email Processing API', apiDescription: 'Processes incoming and outgoing emails.', dependentApis: [] }, { apiName: 'Chat Messaging API', apiDescription: 'Manages live chat sessions.', dependentApis: [] } ],
        serviceDependencies: ['Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['Amazon Connect', 'AWS SES', 'Amazon Lex']
    },
    {
        serviceName: 'Skills Management Service',
        serviceDescription: 'Manages agent skills and competencies.',
        owningTeamId: 'team6',
        apis: [ { apiName: 'Skills Assignment API', apiDescription: 'Assigns skills to agents.', dependentApis: [] }, { apiName: 'Skills Evaluation API', apiDescription: 'Evaluates agent performance in skills.', dependentApis: [] } ],
        serviceDependencies: [],
        platformDependencies: ['AWS Machine Learning']
    },
    {
        serviceName: 'Reporting and Analytics Service',
        serviceDescription: 'Provides reports on contact center performance.',
        owningTeamId: 'team7',
        apis: [ { apiName: 'Performance Metrics API', apiDescription: 'Retrieves metrics on agent and center performance.', dependentApis: [] }, { apiName: 'Historical Data API', apiDescription: 'Accesses historical interaction data.', dependentApis: [] } ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Redshift', 'Amazon QuickSight']
    },
    {
        serviceName: 'Business Configuration Service',
        serviceDescription: 'Allows administrators to configure business rules and settings.',
        owningTeamId: 'team8',
        apis: [ { apiName: 'Settings API', apiDescription: 'Manages system-wide settings.', dependentApis: [] }, { apiName: 'Rules Engine API', apiDescription: 'Defines routing and assignment rules.', dependentApis: [] } ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service', 'Communication Channels Service', 'Skills Management Service'],
        platformDependencies: ['AWS CloudFormation']
    }
];

// IN JS/DATA.JS
// REPLACE THE ENTIRE EXISTING const sampleSystemDataContactCenter = { ... }; OBJECT WITH THIS:

const sampleSystemDataContactCenter = {
    systemName: 'ConnectPro',
    systemDescription: 'ConnectPro is a cloud-based contact center solution that streamlines customer interactions across multiple channels.',
    seniorManagers: sampleSeniorManagersDataContactCenter, // Assuming this is defined elsewhere in your js/data.js
    teams: contactCenterTeamsData, // Assuming this is defined elsewhere and EACH engineer object within it has an 'attributes' field
    sdms: contactCenterSDMsData, // Assuming this is defined elsewhere
    pmts: contactCenterPMTsData, // Assuming this is defined elsewhere
    projectManagers: sampleProjectManagersDataContactCenter, // New
    services: sampleServicesDataConnectPro, // Assuming this is defined elsewhere
    platformDependencies: [],

    capacityConfiguration: {
        workingDaysPerYear: 261,
        standardHoursPerDay: 8,
        globalConstraints: {
            publicHolidays: 11,
            orgEvents: [
                { id: 'eventCC001', name: 'ConnectPro QBR', estimatedDaysPerSDE: 0.5, attributes: {} },
                { id: 'eventCC002', name: 'ConnectPro Offsite', estimatedDaysPerSDE: 1, attributes: {} }
            ]
        },
        leaveTypes: [
            { id: "annual_cc", name: "Annual Leave (CC)", defaultEstimatedDays: 21, attributes: {} },
            { id: "sick_cc", name: "Sick Leave (CC)", defaultEstimatedDays: 8, attributes: {} },
            { id: "study_cc", name: "Study Leave (CC)", defaultEstimatedDays: 3, attributes: {} },
            { id: "inlieu_cc", name: "Time off In-lieu Leave (CC)", defaultEstimatedDays: 0, attributes: {} }
        ]
    },

    yearlyInitiatives: [
        // --- Protected Initiatives (Fully Updated) ---
        {
            initiativeId: 'init-cc-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', isProtected: true,
            assignments: [ { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.75 }, { teamId: 'team5', sdeYears: 1.25 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 } ],
            roi: { category: 'Tech Debt', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for system stability and performance.', businessCaseLink: null, overrideJustification: 'KTLO is mandatory for ConnectPro operations.' },
            targetDueDate: null, actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-ops-stability-cc-2025',
            projectManager: null, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: [], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', isProtected: true,
            assignments: [ { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 } ],
            roi: { category: 'Risk Mitigation', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Prevents service disruption.', businessCaseLink: null, overrideJustification: 'Essential for operational stability.' },
            targetDueDate: null, actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-stability-cc'], primaryGoalId: 'goal-ops-stability-cc-2025',
            projectManager: null, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
            impactedServiceIds: [], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-security', title: 'Mandatory Security Audit & Remediation', description: 'Address findings from annual security audit and maintain compliance.', isProtected: true,
            assignments: [ { teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team4', sdeYears: 0.75 }, { teamId: 'team5', sdeYears: 0.5 }, { teamId: 'team8', sdeYears: 0.5 } ],
            roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Mandatory', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Required to pass security audits.', businessCaseLink: null, overrideJustification: 'Compliance is non-negotiable.' },
            targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-security-cc', 'theme-compliance-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            impactedServiceIds: ['Customer Portal Service', 'Agent Desktop Service', 'Communication Channels Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        // --- Feature/Product Initiatives (Fully Updated) ---
        {
            initiativeId: 'init-cc-001', title: 'Omnichannel Support (Chat)', description: 'Integrate live chat channel support.', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }],
            roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: '10% CSAT Increase', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Projected CSAT improvement based on industry benchmarks for chat support.', businessCaseLink: 'https://example.com/docs/chat_roi_cc', overrideJustification: null },
            targetDueDate: "2025-08-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-feature-enhancement-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
            impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service', 'Routing Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-002', title: 'AI-Powered Agent Assist (KB Suggestions)', description: 'Suggest relevant knowledge base articles to agents in real-time.', isProtected: false,
            assignments: [{ teamId: 'team4', sdeYears: 2.5 }, { teamId: 'team7', sdeYears: 1.0 }],
            roi: { category: 'Agent Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 5000, currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Reduces average handle time by 15s per interaction, leading to 5000 agent hours saved annually.', businessCaseLink: 'https://example.com/docs/ai_assist_roi_cc', overrideJustification: null },
            targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-innovation-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            impactedServiceIds: ['Agent Desktop Service', 'Reporting and Analytics Service', 'Skills Management Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-003', title: 'Upgrade Reporting Engine', description: 'Migrate reporting to new platform for better performance.', isProtected: false,
            assignments: [{ teamId: 'team7', sdeYears: 3.0 }],
            roi: { category: 'Engineering Excellence', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Report Generation', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Improves report generation speed by 70% and enables new analytics capabilities.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engJasonCarter_team7_cc', name: 'Jason Carter (Data Wizards)' },
            impactedServiceIds: ['Reporting and Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-004', title: 'Salesforce CRM Integration V1', description: 'Basic integration to sync contact data and case creation.', isProtected: false,
            assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team8', sdeYears: 0.5 }],
            roi: { category: 'Integration', valueType: 'Productivity/Efficiency', estimatedValue: 'Streamlined Data Flow', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces manual data entry between systems for sales and support.', businessCaseLink: 'https://example.com/docs/sf_integration_roi', overrideJustification: null },
            targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-integration-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: ['Case Management Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-005', title: 'Customer Portal Self-Service KB', description: 'Allow customers to search knowledge base via portal.', isProtected: false,
            assignments: [{ teamId: 'team1', sdeYears: 1.5 }],
            roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: '5% call deflection', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Empowers customers to self-serve, reducing support tickets.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-07-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-cost-reduction-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: ['Customer Portal Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-006', title: 'Advanced Routing Rules (Time-based)', description: 'Allow configuration of time-of-day routing.', isProtected: false,
            assignments: [{ teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }],
            roi: { category: 'Operational Efficiency', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Optimizes agent allocation based on peak hours and global operations.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' }, technicalPOC: { type: 'engineer', id: 'engAshleyWhite_team3_cc', name: 'Ashley White (Routing Rangers)' },
            impactedServiceIds: ['Routing Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-007', title: 'Agent Performance Dashboard', description: 'New dashboard in agent desktop showing key metrics.', isProtected: false,
            assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 0.5 }],
            roi: { category: 'Agent Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved Agent KPIs', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Provides agents visibility into their performance, motivating improvement.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt3', name: 'Angela Green' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' }, // Assuming SDM for Agent Tools
            impactedServiceIds: ['Agent Desktop Service', 'Reporting and Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-008', title: 'Skills-Based Routing Enhancements', description: 'Add proficiency levels to skill matching.', isProtected: false,
            assignments: [{ teamId: 'team6', sdeYears: 1.5 }, { teamId: 'team3', sdeYears: 0.5 }],
            roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: 'Improved First Call Resolution', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Better matching of agents to customer needs.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-agent-efficiency-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engKimberlyAdams_team6_cc', name: 'Kimberly Adams (Skill Masters)' },
            impactedServiceIds: ['Skills Management Service', 'Routing Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-009', title: 'Email Channel Integration', description: 'Add support for email as an interaction channel.', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
            roi: { category: 'Feature Enhancement', valueType: 'Narrative', estimatedValue: 'Expand Channel Support', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Adds a key communication channel requested by customers.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-feature-enhancement-cc', 'theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
            impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-010', title: 'Voice Call Recording & Playback', description: 'Implement secure call recording and retrieval.', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team8', sdeYears: 0.5 }],
            roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Meet Legal Requirements', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for quality assurance, dispute resolution, and potential legal/regulatory requirements.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-compliance-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engSamanthaWright_team5_cc', name: 'Samantha Wright (Comm Mandalorians)' },
            impactedServiceIds: ['Communication Channels Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-011', title: 'Case Prioritization Engine', description: 'Automatically prioritize cases based on SLA or sentiment.', isProtected: false,
            assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team7', sdeYears: 0.5 }],
            roi: { category: 'Operational Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved SLA Adherence', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Ensures critical cases are handled promptly.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2026-01-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-ops-efficiency-cc', 'theme-innovation-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025', // Or a new goal for 2026
            projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: ['Case Management Service', 'Reporting and Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-012', title: 'Configuration Change History', description: 'Track who changed what configuration when.', isProtected: false,
            assignments: [{ teamId: 'team8', sdeYears: 1.0 }],
            roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Audit Trail & Reversibility', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Essential for auditing, troubleshooting, and SOX compliance if applicable.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-compliance-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engLauraTurner_team8_cc', name: 'Laura Turner (Config Ninjas)' },
            impactedServiceIds: ['Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-013', title: 'CTI Screen Pop Improvements', description: 'Customize screen pop data based on call context.', isProtected: false,
            assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team5', sdeYears: 0.5 }],
            roi: { category: 'Agent Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 2000, currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces time agents spend searching for customer info.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-10-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt3', name: 'Angela Green' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            impactedServiceIds: ['Agent Desktop Service', 'Communication Channels Service', 'Routing Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-014', title: 'Sentiment Analysis POC', description: 'Proof-of-concept for analyzing sentiment in chat/email.', isProtected: false,
            assignments: [{ teamId: 'team7', sdeYears: 1.0 }],
            roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Explore Sentiment Insights', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'POC to understand potential for proactive issue resolution and CSAT prediction.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Backlog', themes: ['theme-innovation-cc', 'theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt4', name: 'Stephanie Roberts' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
            impactedServiceIds: ['Reporting and Analytics Service', 'Communication Channels Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-015', title: 'Supervisor Barge-In/Listen-In', description: 'Allow supervisors to monitor or join live calls.', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
            roi: { category: 'Quality Assurance', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 9, confidenceLevel: 'High', calculationMethodology: 'Improves agent training and quality monitoring capabilities.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-ops-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engBrandonLopez_team5_cc', name: 'Brandon Lopez (Comm Mandalorians)' },
            impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-016', title: 'Customer Satisfaction Survey (CSAT)', description: 'Implement post-interaction CSAT surveys.', isProtected: false,
            assignments: [{ teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 0.5 }],
            roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: 'Direct CSAT Measurement', currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Enables direct measurement of CSAT post-interaction.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-06-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: ['Customer Portal Service', 'Reporting and Analytics Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-017', title: 'Agent Skill Self-Assessment', description: 'Allow agents to update their skill profiles.', isProtected: false,
            assignments: [{ teamId: 'team6', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.25 }],
            roi: { category: 'Agent Efficiency', valueType: 'Productivity/Efficiency', estimatedValue: 'Accurate Skill Data', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Improves accuracy of skill data for routing and development.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engKimberlyAdams_team6_cc', name: 'Kimberly Adams (Skill Masters)' },
            impactedServiceIds: ['Skills Management Service', 'Agent Desktop Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-018', title: 'Knowledge Base Article Versioning', description: 'Track changes and history for KB articles.', isProtected: false,
            assignments: [{ teamId: 'team1', sdeYears: 0.5 }], // Assuming portal team owns KB UI/management
            roi: { category: 'Engineering Excellence', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 5, confidenceLevel: 'High', calculationMethodology: 'Improves content management and auditability for KB.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-efficiency-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
            projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            impactedServiceIds: ['Customer Portal Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-019', title: 'Real-time Queue Dashboard', description: 'Dashboard showing queue lengths, wait times.', isProtected: false,
            assignments: [{ teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.25 }],
            roi: { category: 'Operational Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved Queue Management', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Allows supervisors to manage queues and agent allocation proactively.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-ops-stability-cc-2025', // Could be stability or efficiency
            projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engMelissaMitchell_team7_cc', name: 'Melissa Mitchell (Data Wizards)' },
            impactedServiceIds: ['Reporting and Analytics Service', 'Routing Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-020', title: 'Automated Case Closure Rules', description: 'Configure rules to auto-close inactive cases.', isProtected: false,
            assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team8', sdeYears: 0.25 }],
            roi: { category: 'Operational Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 1500, currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces manual effort in closing out old cases.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-11-15", actualCompletionDate: null, status: 'Backlog', themes: ['theme-ops-efficiency-cc', 'theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' }, technicalPOC: { type: 'engineer', id: 'engJessicaTaylor_team2_cc', name: 'Jessica Taylor (Case Titans)' },
            impactedServiceIds: ['Case Management Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-021', title: 'Bulk User Import/Update', description: 'Allow admins to manage agents in bulk.', isProtected: false,
            assignments: [{ teamId: 'team8', sdeYears: 0.5 }],
            roi: { category: 'Operational Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 500, currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Saves admin time during large onboarding or restructuring efforts.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
            projectManager: null, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engEricPhillips_team8_cc', name: 'Eric Phillips (Config Ninjas)' },
            impactedServiceIds: ['Business Configuration Service'], workPackageIds: [], attributes: {}
        },
        {
            initiativeId: 'init-cc-022', title: 'PCI Compliance for Call Recordings', description: 'Ensure call recording storage meets PCI standards.', isProtected: false,
            assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }],
            roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Avoid PCI Fines', currency: null, timeHorizonMonths: 9, confidenceLevel: 'High', calculationMethodology: 'Mandatory for handling payment information if applicable to call recordings.', businessCaseLink: null, overrideJustification: null },
            targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-compliance-cc', 'theme-security-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
            projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
            impactedServiceIds: ['Communication Channels Service', 'Business Configuration Service'], workPackageIds: [], attributes: {}
        }
    ],

    goals: [
        {
            goalId: 'goal-ops-stability-cc-2025', name: 'Ensure ConnectPro Operational Stability 2025', description: 'Maintain high availability and performance for all ConnectPro services.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            initiativeIds: ['init-cc-ktlo', 'init-cc-oncall', 'init-cc-010', 'init-cc-012', 'init-cc-019'], attributes: {}
        },
        {
            goalId: 'goal-security-compliance-cc-2025', name: 'Achieve ConnectPro Security & Compliance 2025', description: 'Meet all relevant industry security standards and compliance mandates.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
            initiativeIds: ['init-cc-security', 'init-cc-010', 'init-cc-012', 'init-cc-022'], attributes: {}
        },
        {
            goalId: 'goal-csat-increase-cc-2025', name: 'Increase Customer Satisfaction by 10% in 2025 (CC)', description: 'Improve agent tools and customer interaction channels.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            initiativeIds: ['init-cc-001', 'init-cc-005', 'init-cc-008', 'init-cc-009', 'init-cc-014', 'init-cc-016'], attributes: {}
        },
        {
            goalId: 'goal-agent-efficiency-cc-2025', name: 'Improve Agent Efficiency by 15% (CC)', description: 'Streamline workflows and provide better tools for agents.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            initiativeIds: ['init-cc-002', 'init-cc-004', 'init-cc-006', 'init-cc-007', 'init-cc-011', 'init-cc-013', 'init-cc-015', 'init-cc-017', 'init-cc-020'], attributes: {}
        },
        {
            goalId: 'goal-platform-enhancement-cc-2025', name: 'Enhance Core Platform Capabilities (CC)', description: 'Upgrade foundational components for future growth and operational efficiency.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
            initiativeIds: ['init-cc-003', 'init-cc-018', 'init-cc-021'], attributes: {}
        }
    ],
    definedThemes: [
        { themeId: 'theme-eng-excellence-cc', name: 'Engineering Excellence (CC)', description: 'Improving ConnectPro engineering practices.', relatedGoalIds: ['goal-ops-stability-cc-2025', 'goal-platform-enhancement-cc-2025'], attributes: {} },
        { themeId: 'theme-ops-stability-cc', name: 'Operational Stability (CC)', description: 'Ensuring ConnectPro reliability.', relatedGoalIds: ['goal-ops-stability-cc-2025'], attributes: {} },
        { themeId: 'theme-customer-sat-cc', name: 'Customer Satisfaction (CC)', description: 'Enhancing customer experience with ConnectPro.', relatedGoalIds: ['goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-agent-efficiency-cc', name: 'Agent Efficiency (CC)', description: 'Improving tools and processes for contact center agents.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} },
        { themeId: 'theme-compliance-cc', name: 'Compliance (CC)', description: 'Meeting regulatory requirements for contact centers.', relatedGoalIds: ['goal-security-compliance-cc-2025'], attributes: {} },
        { themeId: 'theme-feature-enhancement-cc', name: 'Feature Enhancement (CC)', description: 'Adding new features to ConnectPro.', relatedGoalIds: ['goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-security-cc', name: 'Security (CC)', description: 'Initiatives focused on platform and data security.', relatedGoalIds: ['goal-security-compliance-cc-2025'], attributes: {} },
        { themeId: 'theme-innovation-cc', name: 'Innovation (CC)', description: 'Exploring new AI and automation capabilities for contact centers.', relatedGoalIds: ['goal-agent-efficiency-cc-2025', 'goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-integration-cc', name: 'Integration (CC)', description: 'Integrating ConnectPro with other business systems.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} },
        { themeId: 'theme-cost-reduction-cc', name: 'Cost Reduction (CC)', description: 'Initiatives focused on reducing operational costs for the contact center.', relatedGoalIds: [], attributes: {} },
        { themeId: 'theme-ops-efficiency-cc', name: 'Operational Efficiency (CC)', description: 'Streamlining internal operations and workflows.', relatedGoalIds: ['goal-agent-efficiency-cc-2025', 'goal-platform-enhancement-cc-2025'], attributes: {} },
        { themeId: 'theme-quality-assurance-cc', name: 'Quality Assurance (CC)', description: 'Improving service quality and agent performance monitoring.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} }
    ],
    archivedYearlyPlans: [],
    workPackages: [],
    calculatedCapacityMetrics: null,
    allKnownEngineers: sampleAllKnownEngineersContactCenter,
    attributes: {}
};

// END OF REPLACEMENT FOR sampleSystemDataContactCenter