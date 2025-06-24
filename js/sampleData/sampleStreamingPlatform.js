// js/sampleData/sampleStreamingPlatform.js

/** Sample Data for StreamView **/

const sampleProjectManagersDataStreamView = [
    { pmId: 'pmSV001', pmName: 'Eleanor Planwell', attributes: {} },
    { pmId: 'pmSV002', pmName: 'Marcus Scope', attributes: {} }
];

const sampleSeniorManagersDataStreamView = [
    { seniorManagerId: 'srMgr1', seniorManagerName: 'Director Dave' },
    { seniorManagerId: 'srMgr2', seniorManagerName: 'VP Victoria' }
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

const sampleTeamsDataStreamView = [
    { teamId: 'team1', teamName: 'User Experience Team', teamIdentity: 'Avengers', fundedHeadcount: 7, engineers: ['Alice Johnson', 'Mark Evans', 'Sophia Lee', 'John Doe', 'Emma Davis'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 6, aiProductivityGainPercent: 10 }, attributes: {} },
    { teamId: 'team2', teamName: 'Streaming Team', teamIdentity: 'Spartans', fundedHeadcount: 5, engineers: ['Emily Clark', 'Daniel Thompson', 'Olivia Brown', 'Liam Wilson', 'AI-Coder-001 (StreamView)'], awayTeamMembers: [ { name: 'Borrowed Betty', level: 3, sourceTeam: 'External Partner X', attributes:{} } ], sdmId: 'sdm2', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5, aiProductivityGainPercent: 20 }, attributes: {} },
    { teamId: 'team3', teamName: 'Content Team', teamIdentity: 'Crusaders', fundedHeadcount: 4, engineers: ['Carol Davis', 'Kevin Moore', 'Isabella Martinez'], awayTeamMembers: [], sdmId: 'sdm3', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4, aiProductivityGainPercent: 5 }, attributes: {} },
    { teamId: 'team4', teamName: 'Recommendation Team', teamIdentity: 'Olympus', fundedHeadcount: 6, engineers: ['Grace Lee', 'Ethan Harris', 'Mia Turner', 'Noah Walker'], awayTeamMembers: [ { name: 'Loaned Larry', level: 4, sourceTeam: 'Core Platform BU', attributes:{} }, { name: 'Visiting Vinny', level: 2, sourceTeam: 'Data Science Org', attributes:{} } ], sdmId: 'sdm4', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 8, aiProductivityGainPercent: 25 }, attributes: {} },
    { teamId: 'team5', teamName: 'Finance Team', teamIdentity: 'Falcons', fundedHeadcount: 4, engineers: ['Ian Turner', 'Charlotte Adams', 'Benjamin Scott'], awayTeamMembers: [], sdmId: 'sdm5', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4 }, attributes: {} },
    { teamId: 'team6', teamName: 'Communication Team', teamIdentity: 'Ninjas', fundedHeadcount: 3, engineers: ['Karen Adams', 'Lucas Wright'], awayTeamMembers: [], sdmId: 'sdm6', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 3 }, attributes: {} },
    { teamId: 'team7', teamName: 'Analytics Team', teamIdentity: 'Dragons', fundedHeadcount: 5, engineers: ['Natalie Green', 'Andrew Hall', 'Ella Young', 'AI-Analyst-007 (StreamView)'], awayTeamMembers: [], sdmId: 'sdm7', pmtId: 'pmt4', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5 }, attributes: {} },
    { teamId: 'team8', teamName: 'Search Team', teamIdentity: 'Search', fundedHeadcount: 3, engineers: ['Zoe King', 'Michael Baker'], awayTeamMembers: [], sdmId: 'sdm8', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4, aiProductivityGainPercent: 15 }, attributes: {} }
];

const sampleServicesDataStreamView = [
    {
      serviceName: 'User Management Service',
      serviceDescription: 'Handles user registration, authentication, profiles, and account settings.',
      owningTeamId: 'team1',
      apis: [
          { apiName: 'Register API', apiDescription: 'Allows new users to sign up.', dependentApis: [], attributes: {} },
          { apiName: 'Login API', apiDescription: 'Authenticates users and starts a session.', dependentApis: [], attributes: {} },
          { apiName: 'Profile API', apiDescription: 'Manages user profiles and account settings.', dependentApis: [], attributes: {} },
          { apiName: 'Logout API', apiDescription: 'Ends the user session.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: [],
      platformDependencies: ['Auth0', 'AWS DynamoDB'],
      attributes: {}
    },
    {
      serviceName: 'Content Delivery Service',
      serviceDescription: 'Manages content streaming and delivery to users.',
      owningTeamId: 'team2',
      apis: [
          { apiName: 'Stream Content API', apiDescription: 'Streams selected content to the user.', dependentApis: ['Subscription API', 'Profile API'], attributes: {} },
          { apiName: 'Adaptive Bitrate API', apiDescription: 'Adjusts streaming quality based on network conditions.', dependentApis: [], attributes: {} },
          { apiName: 'Content Caching API', apiDescription: 'Manages caching of frequently accessed content.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS CloudFront', 'AWS S3'],
      attributes: {}
    },
    {
      serviceName: 'Content Management Service',
      serviceDescription: 'Handles content ingestion, metadata, and catalog management.',
      owningTeamId: 'team3',
      apis: [
          { apiName: 'Content Ingestion API', apiDescription: 'Ingests new content into the platform.', dependentApis: [], attributes: {} },
          { apiName: 'Metadata API', apiDescription: 'Manages content metadata like titles, descriptions, genres.', dependentApis: [], attributes: {} },
          { apiName: 'Catalog API', apiDescription: 'Provides the catalog of available content.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: [],
      platformDependencies: ['AWS S3', 'AWS Lambda'],
      attributes: {}
    },
    {
      serviceName: 'Recommendation Engine Service',
      serviceDescription: 'Provides personalized content recommendations to users based on viewing history and preferences.',
      owningTeamId: 'team4',
      apis: [
          { apiName: 'Recommendations API', apiDescription: 'Retrieves recommended content for a user.', dependentApis: ['User Behavior Tracking API', 'Metadata API'], attributes: {} },
          { apiName: 'User Behavior Tracking API', apiDescription: 'Tracks user interactions and viewing history.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['User Management Service', 'Content Management Service', 'Analytics Service'],
      platformDependencies: ['AWS Machine Learning', 'Apache Spark'],
      attributes: {}
    },
    {
      serviceName: 'Billing and Subscription Service',
      serviceDescription: 'Manages user subscriptions, billing, and payment processing.',
      owningTeamId: 'team5',
      apis: [
          { apiName: 'Subscription API', apiDescription: 'Manages user subscription plans.', dependentApis: [], attributes: {} },
          { apiName: 'Payment Processing API', apiDescription: 'Processes payments securely.', dependentApis: ['Email Notification API'], attributes: {} },
          { apiName: 'Invoice API', apiDescription: 'Generates invoices and billing statements.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['User Management Service', 'Notification Service'],
      platformDependencies: ['Stripe API', 'AWS RDS'],
      attributes: {}
    },
    {
      serviceName: 'Notification Service',
      serviceDescription: 'Sends notifications, emails, and in-app messages to users.',
      owningTeamId: 'team6',
      apis: [
          { apiName: 'Email Notification API', apiDescription: 'Sends email notifications to users.', dependentApis: [], attributes: {} },
          { apiName: 'Push Notification API', apiDescription: 'Sends push notifications to user devices.', dependentApis: ['Profile API'], attributes: {} },
          { apiName: 'In-App Messaging API', apiDescription: 'Displays messages within the app.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['User Management Service', 'Billing and Subscription Service'],
      platformDependencies: ['AWS SNS', 'Firebase Cloud Messaging'],
      attributes: {}
    },
    {
      serviceName: 'Analytics Service',
      serviceDescription: 'Collects and analyzes data on user engagement, content performance, and platform metrics.',
      owningTeamId: 'team7',
      apis: [
          { apiName: 'Data Collection API', apiDescription: 'Collects data from various services.', dependentApis: [], attributes: {} },
          { apiName: 'Reporting API', apiDescription: 'Provides analytical reports and dashboards.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['User Management Service', 'Content Delivery Service', 'Recommendation Engine Service'],
      platformDependencies: ['AWS Redshift', 'Tableau'],
      attributes: {}
    },
    {
      serviceName: 'Search Service',
      serviceDescription: 'Enables users to search for content across the platform.',
      owningTeamId: 'team8',
      apis: [
          { apiName: 'Search API', apiDescription: 'Allows users to search for content by title, genre, etc.', dependentApis: [], attributes: {} },
          { apiName: 'Autocomplete API', apiDescription: 'Provides search suggestions as users type.', dependentApis: [], attributes: {} }
      ],
      serviceDependencies: ['Content Management Service', 'User Management Service'],
      platformDependencies: ['Elasticsearch'],
      attributes: {}
    }
];

const sampleYearlyInitiativesStreamView = [
    {
        initiativeId: 'init-sv-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', isProtected: true,
        assignments: [
            { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 1.25 },
            { teamId: 'team5', sdeYears: 0.75 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }
        ],
        impactedServiceIds: [], 
        roi: { category: 'Tech Debt', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for platform stability and developer velocity.', businessCaseLink: null, overrideJustification: 'KTLO is mandatory and foundational.' },
        targetDueDate: null, actualCompletionDate: null, status: 'Committed',
        themes: ['theme-eng-excellence-sv', 'theme-platform-stability-sv'], primaryGoalId: 'goal-stability-sv-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgr1', name: 'Director Dave' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Standard KTLO allocation, ongoing." }
    },
    {
        initiativeId: 'init-sv-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', isProtected: true,
        assignments: [
             { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 },
             { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 }
        ],
        impactedServiceIds: [],
        roi: { category: 'Risk Mitigation', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Prevents revenue loss and reputational damage from outages.', businessCaseLink: null, overrideJustification: 'Essential for operational stability.' },
        targetDueDate: null, actualCompletionDate: null, status: 'Committed',
        themes: ['theme-platform-stability-sv'], primaryGoalId: 'goal-stability-sv-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgr1', name: 'Director Dave' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Standard On-Call allocation, ongoing." }
    },
    {
        initiativeId: 'init-sv-security', title: 'Mandatory Security Hardening (Compliance)', description: 'Address critical security vulnerabilities and ensure compliance (e.g., SOC2, GDPR).', isProtected: true,
        assignments: [ { teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team5', sdeYears: 0.75 }, { teamId: 'team2', sdeYears: 0.5 } ],
        impactedServiceIds: ['User Management Service', 'Billing and Subscription Service', 'Content Delivery Service'],
        roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Mandatory', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Required for legal and regulatory compliance.', businessCaseLink: null, overrideJustification: 'Compliance is non-negotiable.' },
        targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-security-sv', 'theme-compliance-sv'], primaryGoalId: 'goal-security-compliance-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'seniorManager', id: 'srMgr2', name: 'VP Victoria' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Coordination across multiple teams needed for these security updates." }
    },
    {
        initiativeId: 'init-sv-001', title: 'AV1 Codec Support', description: 'Implement AV1 codec for improved streaming efficiency.', isProtected: false,
        assignments: [{ teamId: 'team2', sdeYears: 2.5 }, { teamId: 'team3', sdeYears: 1.0 }],
        impactedServiceIds: ['Content Delivery Service', 'Content Management Service'],
        roi: { category: 'Cost Reduction', valueType: 'Monetary', estimatedValue: 75000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Estimated 15% bandwidth reduction translating to $75k annual cost savings.', businessCaseLink: 'https://example.com/docs/av1_roi', overrideJustification: null },
        targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv', 'theme-cost-reduction-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engEmilyClark_team2_sv', name: 'Emily Clark (Spartans)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Team Spartans (Streaming) lead, Crusaders (Content) for ingestion changes." }
    },
    {
        initiativeId: 'init-sv-002', title: 'Tiered Subscription Model', description: 'Launch new subscription tiers (Basic, Premium, Family).', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 3.0 }, { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.5 }],
        impactedServiceIds: ['Billing and Subscription Service', 'User Management Service', 'Notification Service'],
        roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: 250000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Projected uptake of new tiers leading to $250k additional ARR.', businessCaseLink: 'https://example.com/docs/tiers_roi', overrideJustification: null },
        targetDueDate: "2025-12-15", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-revenue-growth-sv'], primaryGoalId: 'goal-revenue-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Major effort for Finance Team, UX and Comms support." }
    },
    {
        initiativeId: 'init-sv-003', title: 'Recommendation Algorithm V3', description: 'Develop and deploy next-gen recommendation engine.', isProtected: false,
        assignments: [{ teamId: 'team4', sdeYears: 4.0 }, { teamId: 'team7', sdeYears: 1.5 }],
        impactedServiceIds: ['Recommendation Engine Service', 'Analytics Service'],
        roi: { category: 'Strategic Alignment', valueType: 'MetricImprovement', estimatedValue: '5% Engagement Uplift', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Expected 5% increase in content consumption per user.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm4', name: 'Grace Lee' }, technicalPOC: { type: 'engineer', id: 'engGraceLee_team4_sv', name: 'Grace Lee (Olympus)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-004', title: 'Expand CDN to South America', description: 'Set up CDN infrastructure in SA region.', isProtected: false, 
        assignments: [{ teamId: 'team2', sdeYears: 1.5 }],
        impactedServiceIds: ['Content Delivery Service'],
        roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Market Expansion to SA', currency: null, timeHorizonMonths: 18, confidenceLevel: 'Medium', calculationMethodology: 'Enables entry into new geographic market.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2026-03-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-global-expansion-sv'], primaryGoalId: 'goal-expansion-sv-2026',
        projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engDanielThompson_team2_sv', name: 'Daniel Thompson (Spartans)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-005', title: 'User Profile Enhancements', description: 'Add customizable avatars and viewing preferences.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 1.5 }],
        impactedServiceIds: ['User Management Service'],
        roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '2% increase in profile completion', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Increased personalization options expected to improve profile completion rates.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-006', title: 'Content Search Facets', description: 'Improve search with filters for genre, rating, year.', isProtected: false, 
        assignments: [{ teamId: 'team8', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }],
        impactedServiceIds: ['Search Service', 'Content Management Service'],
        roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '10% faster content discovery', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Facets expected to significantly reduce time to find content.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm8', name: 'Zoe King' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-007', title: 'Offline Viewing Improvements', description: 'Enhance download stability and management.', isProtected: false, 
        assignments: [{ teamId: 'team2', sdeYears: 1.0 }],
        impactedServiceIds: ['Content Delivery Service'],
        roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '5% reduction in download failures', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Improved reliability for offline feature.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-10-15", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engOliviaBrown_team2_sv', name: 'Olivia Brown (Spartans)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-008', title: 'A/B Testing Framework', description: 'Build internal framework for feature A/B testing.', isProtected: false, 
        assignments: [{ teamId: 'team7', sdeYears: 2.0 }],
        impactedServiceIds: ['Analytics Service'],
        roi: { category: 'Engineering Excellence', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Experimentation', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Reduces time to run A/B tests by 50%, enabling quicker data-driven decisions.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-eng-excellence-sv'], primaryGoalId: 'goal-stability-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' }, technicalPOC: { type: 'engineer', id: 'engNatalieGreen_team7_sv', name: 'Natalie Green (Dragons)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-009', title: 'Parental Controls V2', description: 'Granular controls per profile and content rating.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 1.0 }],
        impactedServiceIds: ['User Management Service'],
        roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Addresses user demand and improves platform trust for families.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-08-15", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-compliance-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-security-compliance-sv-2025', 
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-010', title: 'Interactive Content POC', description: 'Proof-of-concept for choose-your-own-adventure style content.', isProtected: false, 
        assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team3', sdeYears: 0.5 }],
        impactedServiceIds: ['Content Delivery Service', 'Content Management Service'],
        roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Explore new content formats', currency: null, timeHorizonMonths: 4, confidenceLevel: 'Medium', calculationMethodology: 'POC to determine feasibility and user interest.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Backlog', 
        themes: ['theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Carol Davis' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-011', title: 'Payment Gateway Integration (New Region)', description: 'Add local payment options for APAC.', isProtected: false, 
        assignments: [{ teamId: 'team5', sdeYears: 1.5 }],
        impactedServiceIds: ['Billing and Subscription Service'],
        roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Market Expansion APAC', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Required for APAC market launch.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2026-01-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-global-expansion-sv'], primaryGoalId: 'goal-expansion-sv-2026', 
        projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-012', title: 'Real-time Analytics Dashboard', description: 'Internal dashboard for viewing concurrency and errors.', isProtected: false, 
        assignments: [{ teamId: 'team7', sdeYears: 1.0 }],
        impactedServiceIds: ['Analytics Service'],
        roi: { category: 'Operational Stability', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Incident Response', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Reduces MTTR by providing real-time insights.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-15", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-platform-stability-sv', 'theme-eng-excellence-sv'], primaryGoalId: 'goal-stability-sv-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' }, technicalPOC: { type: 'engineer', id: 'engAndrewHall_team7_sv', name: 'Andrew Hall (Dragons)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-013', title: 'Watch Party Feature', description: 'Allow users to watch content synchronously with friends.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team6', sdeYears: 0.5 }],
        impactedServiceIds: ['User Management Service', 'Content Delivery Service', 'Notification Service'],
        roi: { category: 'User Engagement', valueType: 'MetricImprovement', estimatedValue: 'Increased Social Interaction', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Aims to boost user stickiness and social sharing.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-014', title: 'Metadata Enrichment AI', description: 'Use AI to auto-tag content metadata.', isProtected: false, 
        assignments: [{ teamId: 'team3', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
        impactedServiceIds: ['Content Management Service', 'Recommendation Engine Service'],
        roi: { category: 'Productivity/Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 1000, currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Automates manual tagging, saving approx. 1000 editor hours/year.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-eng-excellence-sv', 'theme-cost-reduction-sv'], primaryGoalId: null,
        projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Carol Davis' }, technicalPOC: { type: 'engineer', id: 'engCarolDavis_team3_sv', name: 'Carol Davis (Crusaders)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-015', title: 'GDPR Data Deletion Automation', description: 'Automate user data deletion requests for GDPR.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 0.75 }, { teamId: 'team7', sdeYears: 0.25 }],
        impactedServiceIds: ['User Management Service', 'Analytics Service'],
        roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Reduced Manual Effort & Risk', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Ensures timely compliance and reduces manual processing overhead.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-05-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-compliance-sv', 'theme-platform-stability-sv'], primaryGoalId: 'goal-security-compliance-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV001', name: 'Eleanor Planwell' }, owner: { type: 'sdm', id: 'sdm1', name: 'Alice Johnson' }, technicalPOC: { type: 'engineer', id: 'engMarkEvans_team1_sv', name: 'Mark Evans (Avengers)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-016', title: 'Improved Subtitle Customization', description: 'Allow users to change subtitle font, size, color.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 0.5 }],
        impactedServiceIds: ['User Management Service'],
        roi: { category: 'Accessibility', valueType: 'QualitativeScore', estimatedValue: 'High', currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Improves accessibility and user satisfaction for a key feature.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv', 'theme-compliance-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'engineer', id: 'engSophiaLee_team1_sv', name: 'Sophia Lee (Avengers)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-017', title: 'Search Performance Optimization', description: 'Reduce search latency by 50%.', isProtected: false, 
        assignments: [{ teamId: 'team8', sdeYears: 1.0 }],
        impactedServiceIds: ['Search Service'],
        roi: { category: 'Engineering Excellence', valueType: 'MetricImprovement', estimatedValue: '50% Latency Reduction', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Improves core search performance for better UX.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-eng-excellence-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm8', name: 'Zoe King' }, technicalPOC: { type: 'engineer', id: 'engZoeKing_team8_sv', name: 'Zoe King (Search)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-018', title: 'Gift Subscriptions', description: 'Allow users to purchase subscriptions for others.', isProtected: false, 
        assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 0.25 }],
        impactedServiceIds: ['Billing and Subscription Service', 'Notification Service'],
        roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: 50000, currency: 'USD', timeHorizonMonths: 12, confidenceLevel: 'Low', calculationMethodology: 'New revenue stream, estimate based on 1% of user base gifting.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-11-15", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-revenue-growth-sv'], primaryGoalId: 'goal-revenue-sv-2025',
        projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt3', name: 'Jane Parker' }, technicalPOC: { type: 'sdm', id: 'sdm5', name: 'Ian Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-019', title: 'Video Player Accessibility Audit & Fixes', description: 'Ensure player meets WCAG AA standards.', isProtected: false, 
        assignments: [{ teamId: 'team1', sdeYears: 0.75 }],
        impactedServiceIds: ['User Management Service'],
        roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'High', currency: null, timeHorizonMonths: 5, confidenceLevel: 'High', calculationMethodology: 'Ensures WCAG AA compliance for video player.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-compliance-sv', 'theme-user-experience-sv'], primaryGoalId: 'goal-security-compliance-sv-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Bob Smith' }, technicalPOC: { type: 'engineer', id: 'engJohnDoe_team1_sv', name: 'John Doe (Avengers)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" } 
    },
    {
        initiativeId: 'init-sv-020', title: 'Reduce Streaming Startup Time', description: 'Optimize playback start time for users.', isProtected: false, 
        assignments: [{ teamId: 'team2', sdeYears: 1.5 }],
        impactedServiceIds: ['Content Delivery Service'],
        roi: { category: 'User Experience', valueType: 'MetricImprovement', estimatedValue: '200ms reduction in P95 startup', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Optimizations in player and initial segment delivery.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-user-experience-sv', 'theme-eng-excellence-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Emily Clark' }, technicalPOC: { type: 'engineer', id: 'engDanielThompson_team2_sv', name: 'Daniel Thompson (Spartans)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-021', title: 'Content Partner Reporting Portal', description: 'Allow content partners to view performance data.', isProtected: false, 
        assignments: [{ teamId: 'team3', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }],
        impactedServiceIds: ['Content Management Service', 'Analytics Service'],
        roi: { category: 'Strategic Alignment', valueType: 'Narrative', estimatedValue: 'Improved Partner Relations', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Provides transparency and value to content partners.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2026-02-28", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-partnerships-sv'], primaryGoalId: null, 
        projectManager: { type: 'projectManager', id: 'pmSV002', name: 'Marcus Scope' }, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm7', name: 'Natalie Green' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    },
    {
        initiativeId: 'init-sv-022', title: 'Personalized Push Notifications', description: 'Send targeted notifications based on viewing habits.', isProtected: false, 
        assignments: [{ teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 0.5 }],
        impactedServiceIds: ['Notification Service', 'Recommendation Engine Service'],
        roi: { category: 'User Engagement', valueType: 'MetricImprovement', estimatedValue: '5% increase in DAU', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Low', calculationMethodology: 'Targeted notifications to re-engage users.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-user-experience-sv', 'theme-innovation-sv'], primaryGoalId: 'goal-ux-enhancement-sv-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Frank Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm6', name: 'Karen Adams' },
        workPackageIds: [], attributes: { pmCapacityNotes: "" }
    }
];


const sampleSystemDataStreamView = {
    systemName: 'StreamView',
    systemDescription: 'StreamView is a video streaming platform that provides personalized content to users worldwide.',
    seniorManagers: sampleSeniorManagersDataStreamView,
    teams: sampleTeamsDataStreamView,
    sdms: sampleSDMsDataStreamView,
    pmts: samplePMTsDataStreamView,
    projectManagers: sampleProjectManagersDataStreamView,
    services: sampleServicesDataStreamView,
    platformDependencies: [], 
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
        ],
        attributes: {}
    },
    yearlyInitiatives: sampleYearlyInitiativesStreamView, 
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
        { themeId: 'theme-eng-excellence-sv', name: 'Engineering Excellence', description: 'Initiatives focused on improving engineering practices, tools, and code quality.', relatedGoalIds: ['goal-stability-sv-2025'], attributes: {} },
        { themeId: 'theme-platform-stability-sv', name: 'Platform Stability', description: 'Ensuring the reliability and uptime of the platform.', relatedGoalIds: ['goal-stability-sv-2025'], attributes: {} },
        { themeId: 'theme-user-experience-sv', name: 'User Experience', description: 'Enhancing the overall user journey and satisfaction.', relatedGoalIds: ['goal-ux-enhancement-sv-2025'], attributes: {} },
        { themeId: 'theme-revenue-growth-sv', name: 'Revenue Growth', description: 'Initiatives directly aimed at increasing company revenue.', relatedGoalIds: ['goal-revenue-sv-2025'], attributes: {} },
        { themeId: 'theme-cost-reduction-sv', name: 'Cost Reduction', description: 'Initiatives aimed at reducing operational or other costs.', relatedGoalIds: [], attributes: {} }, 
        { themeId: 'theme-security-sv', name: 'Security', description: 'Initiatives focused on platform and data security.', relatedGoalIds: ['goal-security-compliance-sv-2025'], attributes: {} },
        { themeId: 'theme-compliance-sv', name: 'Compliance', description: 'Meeting legal, regulatory, and industry standards.', relatedGoalIds: ['goal-security-compliance-sv-2025'], attributes: {} },
        { themeId: 'theme-innovation-sv', name: 'Innovation', description: 'Exploring new technologies and product ideas.', relatedGoalIds: ['goal-ux-enhancement-sv-2025'], attributes: {} },
        { themeId: 'theme-global-expansion-sv', name: 'Global Expansion', description: 'Expanding service reach to new markets.', relatedGoalIds: ['goal-expansion-sv-2026'], attributes: {} },
        { themeId: 'theme-partnerships-sv', name: 'Partnerships', description: 'Developing and managing content or technology partnerships.', relatedGoalIds: [], attributes: {} }
    ],
    archivedYearlyPlans: [],
    workPackages: [], 
    calculatedCapacityMetrics: null,
    allKnownEngineers: sampleAllKnownEngineersStreamView, 
    attributes: {} 
};