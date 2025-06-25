// js/sampleData/sampleContactCenterPlatform.js

/** Sample Data for ConnectPro **/

// Define all sample data arrays for ConnectPro FIRST
const sampleProjectManagersDataContactCenter = [ // Defined here
    { pmId: 'pmCC001', pmName: 'Valerie Timeline', attributes: {} },
    { pmId: 'pmCC002', pmName: 'Ricardo Deliver', attributes: {} }
];

const sampleSeniorManagersDataContactCenter = [
    { seniorManagerId: 'srMgrCC1', seniorManagerName: 'Senior Sam', attributes: {} }
];

const contactCenterSDMsData = [
    { sdmId: 'sdm1', sdmName: 'Alex Johnson', seniorManagerId: 'srMgrCC1', attributes: {} },
    { sdmId: 'sdm2', sdmName: 'Matthew Jackson', seniorManagerId: 'srMgrCC1', attributes: {} },
    { sdmId: 'sdm3', sdmName: 'Ryan King', seniorManagerId: 'srMgrCC1', attributes: {} },
    { sdmId: 'sdm4', sdmName: 'Laura Turner', seniorManagerId: 'srMgrCC1', attributes: {} }
];

const contactCenterPMTsData = [
    { pmtId: 'pmt1', pmtName: 'Karen Davis', attributes: {} },
    { pmtId: 'pmt2', pmtName: 'Patricia Thompson', attributes: {} },
    { pmtId: 'pmt3', pmtName: 'Angela Green', attributes: {} },
    { pmtId: 'pmt4', pmtName: 'Stephanie Roberts', attributes: {} }
];

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
})).concat([ 
    { name: 'AI-Router-Alpha (ConnectPro)', level: 4, currentTeamId: 'team3', attributes: { isAISWE: true, aiAgentType: "Intelligent Routing", skills: ["Machine Learning", "Optimization Algorithms", "Real-time Decisioning"], yearsOfExperience: null } },
    { name: 'AI-SupportBot-Omega (ConnectPro)', level: 3, currentTeamId: 'team1', attributes: { isAISWE: true, aiAgentType: "Automated Support Response", skills: ["NLP", "DialogFlow", "Knowledge Base Integration"], yearsOfExperience: null } }
]);

const contactCenterTeamsData = [
    { teamId: 'team1', teamName: 'Customer Experience Team', teamIdentity: 'CX Warriors', fundedHeadcount: 6, engineers: ['Alex Johnson', 'Emily Smith', 'David Lee', 'Sarah Brown', 'Michael Wilson', 'AI-SupportBot-Omega (ConnectPro)'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5, aiProductivityGainPercent: 10 }, attributes: {} },
    { teamId: 'team2', teamName: 'Case Management Team', teamIdentity: 'Case Titans', fundedHeadcount: 5, engineers: ['Jessica Taylor', 'Daniel Moore', 'Amy Anderson', 'James Thomas'], awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 6, aiProductivityGainPercent: 15 }, attributes: {} },
    { teamId: 'team3', teamName: 'Routing and Agent Tools Team', teamIdentity: 'Routing Rangers', fundedHeadcount: 5, engineers: ['Matthew Jackson', 'Ashley White', 'Joshua Harris', 'Andrew Garcia', 'AI-Router-Alpha (ConnectPro)'], awayTeamMembers: [ { name: 'Helping Hannah', level: 2, sourceTeam: 'AI Research Division', attributes:{} } ], sdmId: 'sdm2', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5 }, attributes: {} },
    { teamId: 'team4', teamName: 'Agent Tools Team', teamIdentity: 'Agent Aces', fundedHeadcount: 4, engineers: ['Megan Clark', 'Steven Lewis', 'Nicole Young'], awayTeamMembers: [], sdmId: 'sdm2', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4 }, attributes: {} },
    { teamId: 'team5', teamName: 'Communication Channels Team', teamIdentity: 'Comm Mandalorians', fundedHeadcount: 6, engineers: ['Ryan King', 'Samantha Wright', 'Brandon Lopez', 'Rachel Hill', 'Justin Scott'], awayTeamMembers: [ { name: 'Support Sam', level: 3, sourceTeam: 'Sister Company Ops', attributes:{} } ], sdmId: 'sdm3', pmtId: 'pmt3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 7 }, attributes: {} },
    { teamId: 'team6', teamName: 'Skills Management Team', teamIdentity: 'Skill Masters', fundedHeadcount: 3, engineers: ['Kimberly Adams', 'Jonathan Baker'], awayTeamMembers: [], sdmId: 'sdm3', pmtId: 'pmt2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 3 }, attributes: {} },
    { teamId: 'team7', teamName: 'Analytics and Configuration Team', teamIdentity: 'Data Wizards', fundedHeadcount: 4, engineers: ['Jason Carter', 'Melissa Mitchell', 'Kevin Perez'], awayTeamMembers: [], sdmId: 'sdm4', pmtId: 'pmt4', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5, aiProductivityGainPercent: 5 }, attributes: {} },
    { teamId: 'team8', teamName: 'Configuration Team', teamIdentity: 'Config Ninjas', fundedHeadcount: 3, engineers: ['Laura Turner', 'Eric Phillips'], awayTeamMembers: [], sdmId: 'sdm4', pmtId: 'pmt1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4 }, attributes: {} }
];

const sampleServicesDataConnectPro = [
    {
        serviceName: 'Customer Portal Service',
        serviceDescription: 'Allows customers to raise support tickets and track their status.',
        owningTeamId: 'team1',
        apis: [ { apiName: 'Ticket Submission API', apiDescription: 'Enables customers to submit support tickets.', dependentApis: [], attributes: {} }, { apiName: 'Ticket Tracking API', apiDescription: 'Allows customers to check the status of their tickets.', dependentApis: [], attributes: {} } ],
        serviceDependencies: [],
        platformDependencies: ['AWS Cognito', 'AWS S3'],
        attributes: {}
    },
    {
        serviceName: 'Case Management Service',
        serviceDescription: 'Manages the lifecycle of support tickets within the system.',
        owningTeamId: 'team2',
        apis: [ { apiName: 'Case Creation API', apiDescription: 'Creates a new case in the system.', dependentApis: [], attributes: {} }, { apiName: 'Case Update API', apiDescription: 'Updates case details and status.', dependentApis: [], attributes: {} }, { apiName: 'Case Assignment API', apiDescription: 'Assigns cases to agents based on skills and availability.', dependentApis: ['Skills Assignment API'], attributes: {} } ],
        serviceDependencies: ['Customer Portal Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS DynamoDB'],
        attributes: {}
    },
    {
        serviceName: 'Routing Service',
        serviceDescription: 'Routes incoming interactions to appropriate agents.',
        owningTeamId: 'team3',
        apis: [ { apiName: 'Interaction Routing API', apiDescription: 'Routes voice, email, and chat interactions.', dependentApis: ['Skill Matching API', 'Agent Login API'], attributes: {} }, { apiName: 'Skill Matching API', apiDescription: 'Matches interactions to agents based on skills.', dependentApis: ['Skills Evaluation API'], attributes: {} } ],
        serviceDependencies: ['Communication Channels Service', 'Skills Management Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Lambda'],
        attributes: {}
    },
    {
        serviceName: 'Agent Desktop Service',
        serviceDescription: 'Provides agents with tools to handle customer interactions.',
        owningTeamId: 'team4',
        apis: [ { apiName: 'Agent Login API', apiDescription: 'Authenticates agents and starts their session.', dependentApis: [], attributes: {} }, { apiName: 'Interaction Handling API', apiDescription: 'Manages ongoing interactions with customers.', dependentApis: ['Case Retrieval API'], attributes: {} }, { apiName: 'Case Retrieval API', apiDescription: 'Retrieves case details for agents.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['Case Management Service', 'Routing Service'],
        platformDependencies: ['AWS AppSync'],
        attributes: {}
    },
    {
        serviceName: 'Communication Channels Service',
        serviceDescription: 'Handles voice calls, emails, and chat messages.',
        owningTeamId: 'team5',
        apis: [ { apiName: 'Voice Call API', apiDescription: 'Manages voice call connections.', dependentApis: [], attributes: {} }, { apiName: 'Email Processing API', apiDescription: 'Processes incoming and outgoing emails.', dependentApis: [], attributes: {} }, { apiName: 'Chat Messaging API', apiDescription: 'Manages live chat sessions.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['Amazon Connect', 'AWS SES', 'Amazon Lex'],
        attributes: {}
    },
    {
        serviceName: 'Skills Management Service',
        serviceDescription: 'Manages agent skills and competencies.',
        owningTeamId: 'team6',
        apis: [ { apiName: 'Skills Assignment API', apiDescription: 'Assigns skills to agents.', dependentApis: [], attributes: {} }, { apiName: 'Skills Evaluation API', apiDescription: 'Evaluates agent performance in skills.', dependentApis: [], attributes: {} } ],
        serviceDependencies: [],
        platformDependencies: ['AWS Machine Learning'],
        attributes: {}
    },
    {
        serviceName: 'Reporting and Analytics Service',
        serviceDescription: 'Provides reports on contact center performance.',
        owningTeamId: 'team7',
        apis: [ { apiName: 'Performance Metrics API', apiDescription: 'Retrieves metrics on agent and center performance.', dependentApis: [], attributes: {} }, { apiName: 'Historical Data API', apiDescription: 'Accesses historical interaction data.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service'],
        platformDependencies: ['AWS Redshift', 'Amazon QuickSight'],
        attributes: {}
    },
    {
        serviceName: 'Business Configuration Service',
        serviceDescription: 'Allows administrators to configure business rules and settings.',
        owningTeamId: 'team8',
        apis: [ { apiName: 'Settings API', apiDescription: 'Manages system-wide settings.', dependentApis: [], attributes: {} }, { apiName: 'Rules Engine API', apiDescription: 'Defines routing and assignment rules.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['Case Management Service', 'Routing Service', 'Agent Desktop Service', 'Communication Channels Service', 'Skills Management Service'],
        platformDependencies: ['AWS CloudFormation'],
        attributes: {}
    }
];

const sampleYearlyInitiativesConnectPro = [
    {
        initiativeId: 'init-cc-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing bug fixes, refactoring, library updates, minor enhancements.', isProtected: true,
        assignments: [ { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.75 }, { teamId: 'team5', sdeYears: 1.25 }, { teamId: 'team6', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 } ],
        impactedServiceIds: [],
        roi: { category: 'Tech Debt', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for system stability and performance.', businessCaseLink: null, overrideJustification: 'KTLO is mandatory for ConnectPro operations.' },
        targetDueDate: null, actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-ops-stability-cc-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Baseline KTLO for all teams.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling live site issues and production incidents.', isProtected: true,
        assignments: [ { teamId: 'team1', sdeYears: 1.0 }, { teamId: 'team2', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team6', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 1.0 } ],
        impactedServiceIds: [],
        roi: { category: 'Risk Mitigation', valueType: 'QualitativeScore', estimatedValue: 'Critical', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Prevents service disruption.', businessCaseLink: null, overrideJustification: 'Essential for operational stability.' },
        targetDueDate: null, actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-stability-cc'], primaryGoalId: 'goal-ops-stability-cc-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Standard on-call rotation budget.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-security', title: 'Mandatory Security Audit & Remediation', description: 'Address findings from annual security audit and maintain compliance.', isProtected: true,
        assignments: [ { teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team4', sdeYears: 0.75 }, { teamId: 'team5', sdeYears: 0.5 }, { teamId: 'team8', sdeYears: 0.5 } ],
        impactedServiceIds: ['Customer Portal Service', 'Agent Desktop Service', 'Communication Channels Service', 'Business Configuration Service'],
        roi: { category: 'Compliance', valueType: 'QualitativeScore', estimatedValue: 'Mandatory', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Required to pass security audits.', businessCaseLink: null, overrideJustification: 'Compliance is non-negotiable.' },
        targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-security-cc', 'theme-compliance-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Security findings impact customer portal, agent tools, and core comms.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-001', title: 'Omnichannel Support (Chat)', description: 'Integrate live chat channel support.', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.5 }],
        impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service', 'Routing Service'],
        roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: '10% CSAT Increase', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Projected CSAT improvement based on industry benchmarks for chat support.', businessCaseLink: 'https://example.com/docs/chat_roi_cc', overrideJustification: null },
        targetDueDate: "2025-08-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-feature-enhancement-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Comms team to lead, Agent Tools for UI, Routing for chat queue.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-002', title: 'AI-Powered Agent Assist (KB Suggestions)', description: 'Suggest relevant knowledge base articles to agents in real-time.', isProtected: false,
        assignments: [{ teamId: 'team4', sdeYears: 2.5 }, { teamId: 'team7', sdeYears: 1.0 }],
        impactedServiceIds: ['Agent Desktop Service', 'Reporting and Analytics Service', 'Skills Management Service'],
        roi: { category: 'Agent Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 5000, currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Reduces average handle time by 15s per interaction, leading to 5000 agent hours saved annually.', businessCaseLink: 'https://example.com/docs/ai_assist_roi_cc', overrideJustification: null },
        targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-innovation-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-003', title: 'Upgrade Reporting Engine', description: 'Migrate reporting to new platform for better performance.', isProtected: false,
        assignments: [{ teamId: 'team7', sdeYears: 3.0 }],
        impactedServiceIds: ['Reporting and Analytics Service'],
        roi: { category: 'Engineering Excellence', valueType: 'Productivity/Efficiency', estimatedValue: 'Faster Report Generation', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Improves report generation speed by 70% and enables new analytics capabilities.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engJasonCarter_team7_cc', name: 'Jason Carter (Data Wizards)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-004', title: 'Salesforce CRM Integration V1', description: 'Basic integration to sync contact data and case creation.', isProtected: false,
        assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team8', sdeYears: 0.5 }],
        impactedServiceIds: ['Case Management Service', 'Business Configuration Service'],
        roi: { category: 'Integration', valueType: 'Productivity/Efficiency', estimatedValue: 'Streamlined Data Flow', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces manual data entry between systems for sales and support.', businessCaseLink: 'https://example.com/docs/sf_integration_roi', overrideJustification: null },
        targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-integration-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-005', title: 'Customer Portal Self-Service KB', description: 'Allow customers to search knowledge base via portal.', isProtected: false,
        assignments: [{ teamId: 'team1', sdeYears: 1.5 }],
        impactedServiceIds: ['Customer Portal Service'],
        roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: '5% call deflection', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Empowers customers to self-serve, reducing support tickets.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-07-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-cost-reduction-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-006', title: 'Advanced Routing Rules (Time-based)', description: 'Allow configuration of time-of-day routing.', isProtected: false,
        assignments: [{ teamId: 'team3', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }],
        impactedServiceIds: ['Routing Service', 'Business Configuration Service'],
        roi: { category: 'Operational Efficiency', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Optimizes agent allocation based on peak hours and global operations.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' }, technicalPOC: { type: 'engineer', id: 'engAshleyWhite_team3_cc', name: 'Ashley White (Routing Rangers)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-007', title: 'Agent Performance Dashboard', description: 'New dashboard in agent desktop showing key metrics.', isProtected: false,
        assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team7', sdeYears: 0.5 }],
        impactedServiceIds: ['Agent Desktop Service', 'Reporting and Analytics Service'],
        roi: { category: 'Agent Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved Agent KPIs', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Provides agents visibility into their performance, motivating improvement.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt3', name: 'Angela Green' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-008', title: 'Skills-Based Routing Enhancements', description: 'Add proficiency levels to skill matching.', isProtected: false,
        assignments: [{ teamId: 'team6', sdeYears: 1.5 }, { teamId: 'team3', sdeYears: 0.5 }],
        impactedServiceIds: ['Skills Management Service', 'Routing Service'],
        roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: 'Improved First Call Resolution', currency: null, timeHorizonMonths: 12, confidenceLevel: 'Medium', calculationMethodology: 'Better matching of agents to customer needs.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc', 'theme-agent-efficiency-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engKimberlyAdams_team6_cc', name: 'Kimberly Adams (Skill Masters)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-009', title: 'Email Channel Integration', description: 'Add support for email as an interaction channel.', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
        impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service'],
        roi: { category: 'Feature Enhancement', valueType: 'Narrative', estimatedValue: 'Expand Channel Support', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Adds a key communication channel requested by customers.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-feature-enhancement-cc', 'theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm3', name: 'Ryan King' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-010', title: 'Voice Call Recording & Playback', description: 'Implement secure call recording and retrieval.', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 2.0 }, { teamId: 'team8', sdeYears: 0.5 }],
        impactedServiceIds: ['Communication Channels Service', 'Business Configuration Service'],
        roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Meet Legal Requirements', currency: null, timeHorizonMonths: 12, confidenceLevel: 'High', calculationMethodology: 'Essential for quality assurance, dispute resolution, and potential legal/regulatory requirements.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-compliance-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engSamanthaWright_team5_cc', name: 'Samantha Wright (Comm Mandalorians)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-011', title: 'Case Prioritization Engine', description: 'Automatically prioritize cases based on SLA or sentiment.', isProtected: false,
        assignments: [{ teamId: 'team2', sdeYears: 1.5 }, { teamId: 'team7', sdeYears: 0.5 }],
        impactedServiceIds: ['Case Management Service', 'Reporting and Analytics Service'],
        roi: { category: 'Operational Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved SLA Adherence', currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Ensures critical cases are handled promptly.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2026-01-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-ops-efficiency-cc', 'theme-innovation-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025', 
        projectManager: null, owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2026 }
    },
    {
        initiativeId: 'init-cc-012', title: 'Configuration Change History', description: 'Track who changed what configuration when.', isProtected: false,
        assignments: [{ teamId: 'team8', sdeYears: 1.0 }],
        impactedServiceIds: ['Business Configuration Service'],
        roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Audit Trail & Reversibility', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Essential for auditing, troubleshooting, and SOX compliance if applicable.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-compliance-cc', 'theme-ops-stability-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engLauraTurner_team8_cc', name: 'Laura Turner (Config Ninjas)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-013', title: 'CTI Screen Pop Improvements', description: 'Customize screen pop data based on call context.', isProtected: false,
        assignments: [{ teamId: 'team4', sdeYears: 1.0 }, { teamId: 'team5', sdeYears: 0.5 }],
        impactedServiceIds: ['Agent Desktop Service', 'Communication Channels Service', 'Routing Service'],
        roi: { category: 'Agent Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 2000, currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces time agents spend searching for customer info.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-10-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'pmt', id: 'pmt3', name: 'Angela Green' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-014', title: 'Sentiment Analysis POC', description: 'Proof-of-concept for analyzing sentiment in chat/email.', isProtected: false,
        assignments: [{ teamId: 'team7', sdeYears: 1.0 }],
        impactedServiceIds: ['Reporting and Analytics Service', 'Communication Channels Service'],
        roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Explore Sentiment Insights', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'POC to understand potential for proactive issue resolution and CSAT prediction.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Backlog', themes: ['theme-innovation-cc', 'theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt4', name: 'Stephanie Roberts' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-015', title: 'Supervisor Barge-In/Listen-In', description: 'Allow supervisors to monitor or join live calls.', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 1.5 }, { teamId: 'team4', sdeYears: 0.5 }],
        impactedServiceIds: ['Communication Channels Service', 'Agent Desktop Service'],
        roi: { category: 'Quality Assurance', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 9, confidenceLevel: 'High', calculationMethodology: 'Improves agent training and quality monitoring capabilities.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-agent-efficiency-cc', 'theme-ops-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engBrandonLopez_team5_cc', name: 'Brandon Lopez (Comm Mandalorians)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-016', title: 'Customer Satisfaction Survey (CSAT)', description: 'Implement post-interaction CSAT surveys.', isProtected: false,
        assignments: [{ teamId: 'team1', sdeYears: 0.5 }, { teamId: 'team7', sdeYears: 0.5 }],
        impactedServiceIds: ['Customer Portal Service', 'Reporting and Analytics Service'],
        roi: { category: 'Customer Satisfaction', valueType: 'MetricImprovement', estimatedValue: 'Direct CSAT Measurement', currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Enables direct measurement of CSAT post-interaction.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-06-15", actualCompletionDate: null, status: 'Committed', themes: ['theme-customer-sat-cc'], primaryGoalId: 'goal-csat-increase-cc-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-017', title: 'Agent Skill Self-Assessment', description: 'Allow agents to update their skill profiles.', isProtected: false,
        assignments: [{ teamId: 'team6', sdeYears: 0.75 }, { teamId: 'team4', sdeYears: 0.25 }],
        impactedServiceIds: ['Skills Management Service', 'Agent Desktop Service'],
        roi: { category: 'Agent Efficiency', valueType: 'Productivity/Efficiency', estimatedValue: 'Accurate Skill Data', currency: null, timeHorizonMonths: 6, confidenceLevel: 'Medium', calculationMethodology: 'Improves accuracy of skill data for routing and development.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-08-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'engineer', id: 'engKimberlyAdams_team6_cc', name: 'Kimberly Adams (Skill Masters)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-018', title: 'Knowledge Base Article Versioning', description: 'Track changes and history for KB articles.', isProtected: false,
        assignments: [{ teamId: 'team1', sdeYears: 0.5 }], 
        impactedServiceIds: ['Customer Portal Service'],
        roi: { category: 'Engineering Excellence', valueType: 'QualitativeScore', estimatedValue: 'Medium', currency: null, timeHorizonMonths: 5, confidenceLevel: 'High', calculationMethodology: 'Improves content management and auditability for KB.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-07-31", actualCompletionDate: null, status: 'Committed', themes: ['theme-eng-excellence-cc', 'theme-ops-efficiency-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
        projectManager: null, owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-019', title: 'Real-time Queue Dashboard', description: 'Dashboard showing queue lengths, wait times.', isProtected: false,
        assignments: [{ teamId: 'team7', sdeYears: 1.0 }, { teamId: 'team3', sdeYears: 0.25 }],
        impactedServiceIds: ['Reporting and Analytics Service', 'Routing Service'],
        roi: { category: 'Operational Efficiency', valueType: 'MetricImprovement', estimatedValue: 'Improved Queue Management', currency: null, timeHorizonMonths: 6, confidenceLevel: 'High', calculationMethodology: 'Allows supervisors to manage queues and agent allocation proactively.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-ops-stability-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engMelissaMitchell_team7_cc', name: 'Melissa Mitchell (Data Wizards)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-020', title: 'Automated Case Closure Rules', description: 'Configure rules to auto-close inactive cases.', isProtected: false,
        assignments: [{ teamId: 'team2', sdeYears: 0.75 }, { teamId: 'team8', sdeYears: 0.25 }],
        impactedServiceIds: ['Case Management Service', 'Business Configuration Service'],
        roi: { category: 'Operational Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 1500, currency: null, timeHorizonMonths: 9, confidenceLevel: 'Medium', calculationMethodology: 'Reduces manual effort in closing out old cases.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-11-15", actualCompletionDate: null, status: 'Backlog', themes: ['theme-ops-efficiency-cc', 'theme-agent-efficiency-cc'], primaryGoalId: 'goal-agent-efficiency-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' }, technicalPOC: { type: 'engineer', id: 'engJessicaTaylor_team2_cc', name: 'Jessica Taylor (Case Titans)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-021', title: 'Bulk User Import/Update', description: 'Allow admins to manage agents in bulk.', isProtected: false,
        assignments: [{ teamId: 'team8', sdeYears: 0.5 }],
        impactedServiceIds: ['Business Configuration Service'],
        roi: { category: 'Operational Efficiency', valueType: 'TimeSaved_HoursPerYear', estimatedValue: 500, currency: null, timeHorizonMonths: 4, confidenceLevel: 'High', calculationMethodology: 'Saves admin time during large onboarding or restructuring efforts.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed', themes: ['theme-ops-efficiency-cc'], primaryGoalId: 'goal-platform-enhancement-cc-2025',
        projectManager: null, owner: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' }, technicalPOC: { type: 'engineer', id: 'engEricPhillips_team8_cc', name: 'Eric Phillips (Config Ninjas)' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    },
    {
        initiativeId: 'init-cc-022', title: 'PCI Compliance for Call Recordings', description: 'Ensure call recording storage meets PCI standards.', isProtected: false,
        assignments: [{ teamId: 'team5', sdeYears: 1.0 }, { teamId: 'team8', sdeYears: 0.5 }],
        impactedServiceIds: ['Communication Channels Service', 'Business Configuration Service'],
        roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Avoid PCI Fines', currency: null, timeHorizonMonths: 9, confidenceLevel: 'High', calculationMethodology: 'Mandatory for handling payment information if applicable to call recordings.', businessCaseLink: null, overrideJustification: null },
        targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Backlog', themes: ['theme-compliance-cc', 'theme-security-cc'], primaryGoalId: 'goal-security-compliance-cc-2025',
        projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, owner: { type: 'sdm', id: 'sdm3', name: 'Ryan King' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
        workPackageIds: [], attributes: { pmCapacityNotes: "", planningYear: 2025 }
    }
];

// Then, the main sampleSystemDataContactCenter object
const sampleSystemDataContactCenter = {
    systemName: 'ConnectPro',
    systemDescription: 'ConnectPro is a cloud-based contact center solution that streamlines customer interactions across multiple channels.',
    seniorManagers: sampleSeniorManagersDataContactCenter, // Defined above
    teams: contactCenterTeamsData, // Defined above
    sdms: contactCenterSDMsData, // Defined above
    pmts: contactCenterPMTsData, // Defined above
    projectManagers: sampleProjectManagersDataContactCenter, // Defined above
    services: sampleServicesDataConnectPro, // Defined above
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
            { id: "annual_cc", name: "Annual Leave", defaultEstimatedDays: 21, attributes: {} },
            { id: "sick_cc", name: "Sick Leave", defaultEstimatedDays: 8, attributes: {} },
            { id: "study_cc", name: "Study Leave", defaultEstimatedDays: 3, attributes: {} },
            { id: "inlieu_cc", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
        ],
        attributes: {}
    },
    yearlyInitiatives: sampleYearlyInitiativesConnectPro, // Defined above
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
            goalId: 'goal-csat-increase-cc-2025', name: 'Increase Customer Satisfaction by 10% in 2025', description: 'Improve agent tools and customer interaction channels.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt1', name: 'Karen Davis' }, projectManager: { type: 'projectManager', id: 'pmCC001', name: 'Valerie Timeline' }, technicalPOC: { type: 'sdm', id: 'sdm1', name: 'Alex Johnson' },
            initiativeIds: ['init-cc-001', 'init-cc-005', 'init-cc-008', 'init-cc-009', 'init-cc-014', 'init-cc-016'], attributes: {}
        },
        {
            goalId: 'goal-agent-efficiency-cc-2025', name: 'Improve Agent Efficiency by 15%', description: 'Streamline workflows and provide better tools for agents.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmt2', name: 'Patricia Thompson' }, projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, technicalPOC: { type: 'sdm', id: 'sdm2', name: 'Matthew Jackson' },
            initiativeIds: ['init-cc-002', 'init-cc-004', 'init-cc-006', 'init-cc-007', 'init-cc-011', 'init-cc-013', 'init-cc-015', 'init-cc-017', 'init-cc-020'], attributes: {}
        },
        {
            goalId: 'goal-platform-enhancement-cc-2025', name: 'Enhance Core Platform Capabilities', description: 'Upgrade foundational components for future growth and operational efficiency.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrCC1', name: 'Senior Sam' }, projectManager: { type: 'projectManager', id: 'pmCC002', name: 'Ricardo Deliver' }, technicalPOC: { type: 'sdm', id: 'sdm4', name: 'Laura Turner' },
            initiativeIds: ['init-cc-003', 'init-cc-018', 'init-cc-021'], attributes: {}
        }
    ],
    definedThemes: [
        { themeId: 'theme-eng-excellence-cc', name: 'Engineering Excellence', description: 'Improving ConnectPro engineering practices.', relatedGoalIds: ['goal-ops-stability-cc-2025', 'goal-platform-enhancement-cc-2025'], attributes: {} },
        { themeId: 'theme-ops-stability-cc', name: 'Operational Stability', description: 'Ensuring ConnectPro reliability.', relatedGoalIds: ['goal-ops-stability-cc-2025'], attributes: {} },
        { themeId: 'theme-customer-sat-cc', name: 'Customer Satisfaction', description: 'Enhancing customer experience with ConnectPro.', relatedGoalIds: ['goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-agent-efficiency-cc', name: 'Agent Efficiency', description: 'Improving tools and processes for contact center agents.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} },
        { themeId: 'theme-compliance-cc', name: 'Compliance', description: 'Meeting regulatory requirements for contact centers.', relatedGoalIds: ['goal-security-compliance-cc-2025'], attributes: {} },
        { themeId: 'theme-feature-enhancement-cc', name: 'Feature Enhancement', description: 'Adding new features to ConnectPro.', relatedGoalIds: ['goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-security-cc', name: 'Security', description: 'Initiatives focused on platform and data security.', relatedGoalIds: ['goal-security-compliance-cc-2025'], attributes: {} },
        { themeId: 'theme-innovation-cc', name: 'Innovation', description: 'Exploring new AI and automation capabilities for contact centers.', relatedGoalIds: ['goal-agent-efficiency-cc-2025', 'goal-csat-increase-cc-2025'], attributes: {} },
        { themeId: 'theme-integration-cc', name: 'Integration', description: 'Integrating ConnectPro with other business systems.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} },
        { themeId: 'theme-cost-reduction-cc', name: 'Cost Reduction', description: 'Initiatives focused on reducing operational costs for the contact center.', relatedGoalIds: [], attributes: {} },
        { themeId: 'theme-ops-efficiency-cc', name: 'Operational Efficiency', description: 'Streamlining internal operations and workflows.', relatedGoalIds: ['goal-agent-efficiency-cc-2025', 'goal-platform-enhancement-cc-2025'], attributes: {} },
        { themeId: 'theme-quality-assurance-cc', name: 'Quality Assurance', description: 'Improving service quality and agent performance monitoring.', relatedGoalIds: ['goal-agent-efficiency-cc-2025'], attributes: {} }
    ],
    archivedYearlyPlans: [],
    workPackages: [], 
    calculatedCapacityMetrics: null,
    allKnownEngineers: sampleAllKnownEngineersContactCenter, 
    attributes: {} 
};