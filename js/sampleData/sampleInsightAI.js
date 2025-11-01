// js/sampleData/sampleInsightAI.js

/** Sample Data for InsightAI (Generative AI Platform) **/

const sampleProjectManagersDataInsightAI = [
    { pmId: 'pmIA001', pmName: 'Aisha Khan (Program Manager, Research)', attributes: {} },
    { pmId: 'pmIA002', pmName: 'Ben Cohen (Program Manager, Platform)', attributes: {} }
];

const sampleSeniorManagersDataInsightAI = [
    { seniorManagerId: 'srMgrIA1', seniorManagerName: 'Dr. Evelyn Reed (VP, Core Research)', attributes: {} },
    { seniorManagerId: 'srMgrIA2', seniorManagerName: 'Mark Chen (VP, Applied AI & Platform)', attributes: {} }
];

const insightAISDMsData = [
    { sdmId: 'sdmIA1', sdmName: 'Dr. Kenji Tanaka (Foundational Models)', seniorManagerId: 'srMgrIA1', attributes: {} },
    { sdmId: 'sdmIA2', sdmName: 'Dr. Sarah Jenkins (Safety & Alignment)', seniorManagerId: 'srMgrIA1', attributes: {} },
    { sdmId: 'sdmIA3', sdmName: 'Leo Valdez (Data Engineering)', seniorManagerId: 'srMgrIA2', attributes: {} },
    { sdmId: 'sdmIA4', sdmName: 'Mei Lin (Model Infra & MLOps)', seniorManagerId: 'srMgrIA2', attributes: {} },
    { sdmId: 'sdmIA5', sdmName: 'Sam O\'Connell (API & Platform)', seniorManagerId: 'srMgrIA2', attributes: {} },
    { sdmId: 'sdmIA6', sdmName: 'Tanya Sharma (Product & Web)', seniorManagerId: 'srMgrIA2', attributes: {} }
];

const insightAIPMTsData = [
    { pmtId: 'pmtIA1', pmtName: 'Rachel Lee (Platform & API)', attributes: {} },
    { pmtId: 'pmtIA2', pmtName: 'David Kim (Product & Enterprise)', attributes: {} },
    { pmtId: 'pmtIA3', pmtName: 'Nina Brown (Research & Alignment)', attributes: {} }
];

const tempInsightAIEngineers = [
    // Team IA1: Core Model Research
    { name: 'Dr. Kenji Tanaka', level: 6, teamId: 'teamIA1', skills: ['Transformers', 'LLM Architecture', 'PyTorch', 'JAX', 'Research Lead'], yearsOfExperience: 10 },
    { name: 'Dr. Alice Wong', level: 5, teamId: 'teamIA1', skills: ['Deep Learning', 'NLP', 'Model Optimization', 'Python'], yearsOfExperience: 7 },
    { name: 'Chen Liu', level: 4, teamId: 'teamIA1', skills: ['PyTorch', 'Distributed Training', 'ML Research'], yearsOfExperience: 5 },
    { name: 'Ravi Shankar', level: 4, teamId: 'teamIA1', skills: ['JAX', 'TPU/GPU Kernels', 'Performance Tuning'], yearsOfExperience: 6 },
    // Team IA2: Data Engineering
    { name: 'Leo Valdez', level: 5, teamId: 'teamIA2', skills: ['Data Pipelines', 'Apache Spark', 'Airflow', 'BigQuery/Snowflake', 'Team Lead'], yearsOfExperience: 9 },
    { name: 'Maria Garcia', level: 4, teamId: 'teamIA2', skills: ['Data Curation', 'ETL', 'Python (Pandas)', 'Data Governance'], yearsOfExperience: 6 },
    { name: 'Ben Carter', level: 3, teamId: 'teamIA2', skills: ['Spark Streaming', 'Kafka', 'Data Warehousing'], yearsOfExperience: 4 },
    // Team IA3: Safety & Alignment
    { name: 'Dr. Sarah Jenkins', level: 6, teamId: 'teamIA3', skills: ['AI Ethics', 'Reinforcement Learning (RLHF)', 'Model Safety', 'Policy'], yearsOfExperience: 8 },
    { name: 'Tom Wilson', level: 4, teamId: 'teamIA3', skills: ['ML Engineering', 'Adversarial Testing', 'Python', 'Safety Filters'], yearsOfExperience: 5 },
    { name: 'Emily Vance', level: 3, teamId: 'teamIA3', skills: ['Data Analysis', 'NLP', 'Bias Detection', 'SQL'], yearsOfExperience: 3 },
    // Team IA4: Model Infra & MLOps
    { name: 'Mei Lin', level: 5, teamId: 'teamIA4', skills: ['Kubernetes', 'MLOps', 'Distributed Systems', 'SRE', 'GPU Clusters'], yearsOfExperience: 10 },
    { name:g: 'Omar Hassan', level: 4, teamId: 'teamIA4', skills: ['Triton/TensorRT', 'Inference Optimization', 'Go', 'Rust', 'Performance'], yearsOfExperience: 6 },
    { name: 'Grace Hopper', level: 3, teamId: 'teamIA4', skills: ['Kubeflow', 'MLflow', 'CI/CD for ML', 'Terraform'], yearsOfExperience: 4 },
    { name: 'Finn Doyle', level: 3, teamId: 'teamIA4', skills: ['SRE', 'Observability (Prometheus)', 'Networking', 'Python'], yearsOfExperience: 5 },
    // Team IA5: API & Platform
    { name: 'Sam O\'Connell', level: 5, teamId: 'teamIA5', skills: ['API Design', 'Backend (Go, Rust)', 'System Architecture', 'High Availability'], yearsOfExperience: 11 },
    { name: 'Kevin Zhang', level: 4, teamId: 'teamIA5', skills: ['Backend (Go)', 'gRPC', 'PostgreSQL', 'Microservices'], yearsOfExperience: 7 },
    { name: 'Laura Bailey', level: 3, teamId: 'teamIA5', skills: ['Billing Systems', 'Stripe API', 'Database Management', 'Java'], yearsOfExperience: 5 },
    { name: 'Zoe Armstrong', level: 3, teamId: 'teamIA5', skills: ['Developer Relations', 'API Documentation', 'SDK Development (Python, JS)'], yearsOfExperience: 4 },
    // Team IA6: Product & Web
    { name: 'Tanya Sharma', level: 5, teamId: 'teamIA6', skills: ['Full-stack', 'React', 'Node.js', 'Product Engineering', 'Team Lead'], yearsOfExperience: 9 },
    { name: 'Mikey Smith', level: 4, teamId: 'teamIA6', skills: ['Frontend Architecture', 'React', 'TypeScript', 'Web Performance'], yearsOfExperience: 6 },
    { name: 'Chloe Dubois', level: 3, teamId: 'teamIA6', skills: ['UI/UX Design', 'Figma', 'User Research', 'CSS-in-JS'], yearsOfExperience: 5 },
    { name: 'Ryan Ito', level: 3, teamId: 'teamIA6', skills: ['Node.js', 'GraphQL', 'BFF', 'PostgreSQL'], yearsOfExperience: 4 }
];

const sampleAllKnownEngineersInsightAI = tempInsightAIEngineers.map(eng => ({
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
    { name: 'AI-Code-Gen-01 (InsightAI)', level: 5, currentTeamId: 'teamIA5', attributes: { isAISWE: true, aiAgentType: "Code Generation", skills: ["Go", "Python", "Rust", "API Client Gen"], yearsOfExperience: null } },
    { name: 'AI-Data-Annotator-01 (InsightAI)', level: 4, currentTeamId: 'teamIA2', attributes: { isAISWE: true, aiAgentType: "Data Annotation", skills: ["NLP", "Classification", "Data Cleaning"], yearsOfExperience: null } },
    { name: 'AI-Safety-Tester-01 (InsightAI)', level: 4, currentTeamId: 'teamIA3', attributes: { isAISWE: true, aiAgentType: "Adversarial Testing", skills: ["Red Teaming", "Bias Detection", "Prompt Injection"], yearsOfExperience: null } }
]);

const insightAITeamsData = [
    { teamId: 'teamIA1', teamName: 'Core Model Research', teamIdentity: 'Core Research', fundedHeadcount: 5, engineers: ['Dr. Kenji Tanaka', 'Dr. Alice Wong', 'Chen Liu', 'Ravi Shankar'], awayTeamMembers: [], sdmId: 'sdmIA1', pmtId: 'pmtIA3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 4, aiProductivityGainPercent: 30 }, attributes: {} },
    { teamId: 'teamIA2', teamName: 'Data Engineering', teamIdentity: 'Data Engineering', fundedHeadcount: 4, engineers: ['Leo Valdez', 'Maria Garcia', 'Ben Carter', 'AI-Data-Annotator-01 (InsightAI)'], awayTeamMembers: [], sdmId: 'sdmIA3', pmtId: 'pmtIA3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 6, aiProductivityGainPercent: 25 }, attributes: {} },
    { teamId: 'teamIA3', teamName: 'Safety & Alignment', teamIdentity: 'Safety & Alignment', fundedHeadcount: 4, engineers: ['Dr. Sarah Jenkins', 'Tom Wilson', 'Emily Vance', 'AI-Safety-Tester-01 (InsightAI)'], awayTeamMembers: [], sdmId: 'sdmIA2', pmtId: 'pmtIA3', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5, aiProductivityGainPercent: 20 }, attributes: {} },
    { teamId: 'teamIA4', teamName: 'Model Infrastructure & MLOps', teamIdentity: 'MLOps', fundedHeadcount: 5, engineers: ['Mei Lin', 'Omar Hassan', 'Grace Hopper', 'Finn Doyle'], awayTeamMembers: [ { name: 'SRE-Contractor-01', level: 4, sourceTeam: 'External SRE Firm', attributes:{} } ], sdmId: 'sdmIA4', pmtId: 'pmtIA1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 8, aiProductivityGainPercent: 40 }, attributes: {} },
    { teamId: 'teamIA5', teamName: 'API & Platform', teamIdentity: 'API Platform', fundedHeadcount: 5, engineers: ['Sam O\'Connell', 'Kevin Zhang', 'Laura Bailey', 'Zoe Armstrong', 'AI-Code-Gen-01 (InsightAI)'], awayTeamMembers: [], sdmId: 'sdmIA5', pmtId: 'pmtIA1', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 5, aiProductivityGainPercent: 40 }, attributes: {} },
    { teamId: 'teamIA6', teamName: 'Product & Web', teamIdentity: 'Web Product', fundedHeadcount: 5, engineers: ['Tanya Sharma', 'Mikey Smith', 'Chloe Dubois', 'Ryan Ito'], awayTeamMembers: [], sdmId: 'sdmIA6', pmtId: 'pmtIA2', teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 6, aiProductivityGainPercent: 35 }, attributes: {} }
];

const sampleServicesDataInsightAI = [
    {
        serviceName: 'FoundationModelService',
        serviceDescription: 'Core foundational model weights and internal access layer. Managed by MLOps, consumed by Inference API.',
        owningTeamId: 'teamIA4',
        apis: [ { apiName: 'InternalModelAPI', apiDescription: 'Internal-only API for MLOps to load and serve model weights.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['TrainingPipelineService'],
        platformDependencies: ['GPU Cluster (On-Prem)', 'AWS S3 (Model Weights)', 'Triton Inference Server'],
        attributes: {}
    },
    {
        serviceName: 'TrainingPipelineService',
        serviceDescription: 'Manages the end-to-end pipeline for training new foundation models.',
        owningTeamId: 'teamIA1',
        apis: [ { apiName: 'StartTrainingJobAPI', apiDescription: 'Internal API to trigger a new training run.', dependentApis: ['DataIngestionService:GetBatchAPI'], attributes: {} } ],
        serviceDependencies: ['DataIngestionService', 'FoundationModelService'],
        platformDependencies: ['Kubernetes (Training Jobs)', 'PyTorch', 'JAX', 'Airflow', 'W&B (Weights & Biases)'],
        attributes: {}
    },
    {
        serviceName: 'DataIngestionService',
        serviceDescription: 'Handles sourcing, cleaning, and batching of massive training datasets.',
        owningTeamId: 'teamIA2',
        apis: [ { apiName: 'IngestAPI', apiDescription: 'API for crawlers and partners to push data.', dependentApis: [], attributes: {} }, { apiName: 'GetBatchAPI', apiDescription: 'Internal API for Training Pipeline to get curated data batches.', dependentApis: [], attributes: {} } ],
        serviceDependencies: [],
        platformDependencies: ['Kafka', 'Apache Spark', 'AWS S3 (Data Lake)', 'Snowflake'],
        attributes: {}
    },
    {
        serviceName: 'SafetyModerationService',
        serviceDescription: 'A mandatory service that filters all incoming prompts and outgoing responses for safety, bias, and policy adherence.',
        owningTeamId: 'teamIA3',
        apis: [ { apiName: 'FilterPromptAPI', apiDescription: 'Checks an incoming prompt.', dependentApis: [], attributes: {} }, { apiName: 'FilterResponseAPI', apiDescription: 'Checks a model-generated response.', dependentApis: [], attributes: {} } ],
        serviceDependencies: [],
        platformDependencies: ['Internal ML Platform (Classifier Models)', 'Redis (Rule Cache)'],
        attributes: {}
    },
    {
        serviceName: 'InferenceAPIService',
        serviceDescription: 'The public-facing, scalable, low-latency API for model inference.',
        owningTeamId: 'teamIA5',
        apis: [ { apiName: 'GenerateAPI', apiDescription: 'Public API for text generation.', dependentApis: ['SafetyModerationService:FilterPromptAPI', 'SafetyModerationService:FilterResponseAPI', 'FoundationModelService:InternalModelAPI', 'BillingService:CheckQuotaAPI'], attributes: {} }, { apiName: 'EmbeddingsAPI', apiDescription: 'Public API for generating text embeddings.', dependentApis: ['SafetyModerationService:FilterPromptAPI', 'FoundationModelService:InternalModelAPI', 'BillingService:CheckQuotaAPI'], attributes: {} } ],
        serviceDependencies: ['FoundationModelService', 'SafetyModerationService', 'BillingService', 'UserService'],
        platformDependencies: ['Kubernetes (Inference)', 'AWS EKS', 'Go', 'gRPC'],
        attributes: {}
    },
    {
        serviceName: 'WebAppService',
        serviceDescription: 'The backend-for-frontend (BFF) and web server for the chat.insight.ai product.',
        owningTeamId: 'teamIA6',
        apis: [ { apiName: 'ChatAPI', apiDescription: 'Handles chat history and streams responses from the main API.', dependentApis: ['InferenceAPIService:GenerateAPI', 'UserService:UserHistoryAPI'], attributes: {} } ],
        serviceDependencies: ['InferenceAPIService', 'UserService'],
        platformDependencies: ['Node.js', 'React (Next.js)', 'PostgreSQL (Chat History)'],
        attributes: {}
    },
    {
        serviceName: 'UserService',
        serviceDescription: 'Manages user accounts, API keys, and enterprise auth (SAML/SSO).',
        owningTeamId: 'teamIA5',
        apis: [ { apiName: 'AuthAPI', apiDescription: 'Handles user login and API key generation.', dependentApis: [], attributes: {} }, { apiName: 'UserHistoryAPI', apiDescription: 'Stores user chat history.', dependentApis: [], attributes: {} } ],
        serviceDependencies: ['BillingService'],
        platformDependencies: ['Auth0', 'PostgreSQL'],
        attributes: {}
    },
    {
        serviceName: 'BillingService',
        serviceDescription: 'Manages API quotas, subscriptions, and per-token billing.',
        owningTeamId: 'teamIA5',
        apis: [ { apiName: 'CheckQuotaAPI', apiDescription: 'Checks if a user is within their rate limit/quota.', dependentApis: [], attributes: {} }, { apiName: 'UsageAPI', apiDescription: 'Receives usage data from InferenceAPIService.', dependentApis: [], attributes: {} } ],
        serviceDependencies: [],
        platformDependencies: ['Stripe', 'Redis (Rate Limiting)', 'TimescaleDB (Usage)'],
        attributes: {}
    }
];

const sampleYearlyInitiativesInsightAI = [
    // --- 2025 (Year 1: Train, Scale, Secure) ---
    {
        initiativeId: 'init-ia-ktlo', title: 'KTLO / Operational Excellence', description: 'Ongoing infra maintenance, monitoring, minor bug fixes, dependency updates.', isProtected: true,
        assignments: [ { teamId: 'teamIA1', sdeYears: 0.5 }, { teamId: 'teamIA2', sdeYears: 0.5 }, { teamId: 'teamIA3', sdeYears: 0.5 }, { teamId: 'teamIA4', sdeYears: 1.0 }, { teamId: 'teamIA5', sdeYears: 1.0 }, { teamId: 'teamIA6', sdeYears: 0.75 } ],
        impactedServiceIds: [], roi: { category: 'Tech Debt', valueType: 'QualitativeScore', estimatedValue: 'Critical' }, targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-platform-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgrIA2', name: 'Mark Chen' }, technicalPOC: { type: 'sdm', id: 'sdmIA4', name: 'Mei Lin' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Baseline KTLO for all teams.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-ia-oncall', title: 'On-Call / Production Support', description: 'Dedicated capacity for handling API outages, inference latency, and live site issues.', isProtected: true,
        assignments: [ { teamId: 'teamIA4', sdeYears: 1.0 }, { teamId: 'teamIA5', sdeYears: 1.0 }, { teamId: 'teamIA6', sdeYears: 0.5 } ],
        impactedServiceIds: ['InferenceAPIService', 'WebAppService', 'FoundationModelService'], roi: { category: 'Ops Stability', valueType: 'QualitativeScore', estimatedValue: 'Critical' }, targetDueDate: "2025-12-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-platform-2025',
        projectManager: null, owner: { type: 'seniorManager', id: 'srMgrIA2', name: 'Mark Chen' }, technicalPOC: { type: 'sdm', id: 'sdmIA4', name: 'Mei Lin' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Production support for user-facing services.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-ia-001', title: 'Train & Launch "Insight-5" Foundational Model', description: 'Full training run for the next-generation foundational model, including data curation and alignment.', isProtected: true,
        assignments: [ { teamId: 'teamIA1', sdeYears: 3.0 }, { teamId: 'teamIA2', sdeYears: 2.0 }, { teamId: 'teamIA3', sdeYears: 1.5 }, { teamId: 'teamIA4', sdeYears: 1.0 } ],
        impactedServiceIds: ['FoundationModelService', 'TrainingPipelineService', 'DataIngestionService', 'SafetyModerationService'], roi: { category: 'Strategic', valueType: 'Narrative', estimatedValue: 'State-of-the-Art Model' }, targetDueDate: "2025-10-31", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-core-model', 'theme-ia-safety'], primaryGoalId: 'goal-ia-insight5-2025',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, technicalPOC: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Top company priority. Blocks almost all of Core Research.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-ia-002', title: 'Launch Public API v2 (GA)', description: 'General Availability launch of the public API, including billing, API keys, and documentation.', isProtected: false,
        assignments: [ { teamId: 'teamIA5', sdeYears: 2.0 }, { teamId: 'teamIA6', sdeYears: 0.5 } ],
        impactedServiceIds: ['InferenceAPIService', 'UserService', 'BillingService', 'WebAppService'], roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: 'Enable all revenue' }, targetDueDate: "2025-06-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-enterprise', 'theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-platform-2025',
        projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, owner: { type: 'pmt', id: 'pmtIA1', name: 'Rachel Lee' }, technicalPOC: { type: 'sdm', id: 'sdmIA5', name: 'Sam O\'Connell' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Critical path for monetization.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-ia-003', title: 'Develop Safety Benchmarks v2', description: 'Build internal benchmarks and automated red-teaming for "Insight-5" model.', isProtected: false,
        assignments: [ { teamId: 'teamIA3', sdeYears: 1.5 } ],
        impactedServiceIds: ['SafetyModerationService'], roi: { category: 'Compliance', valueType: 'Risk Mitigation', estimatedValue: 'Reduce model misuse' }, targetDueDate: "2025-09-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-safety'], primaryGoalId: 'goal-ia-safety-2025',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'pmt', id: 'pmtIA3', name: 'Nina Brown' }, technicalPOC: { type: 'sdm', id: 'sdmIA2', name: 'Dr. Sarah Jenkins' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Required for Insight-5 launch.", planningYear: 2025 }
    },
    {
        initiativeId: 'init-ia-004', title: 'Enterprise Auth (SAML/SSO)', description: 'Add SAML/SSO support for enterprise customers in the UserService.', isProtected: false,
        assignments: [ { teamId: 'teamIA5', sdeYears: 0.5 }, { teamId: 'teamIA6', sdeYears: 0.25 } ],
        impactedServiceIds: ['UserService', 'WebAppService'], roi: { category: 'Feature Enhancement', valueType: 'Narrative', estimatedValue: 'Unblock enterprise sales' }, targetDueDate: "2025-11-30", actualCompletionDate: null, status: 'Committed',
        themes: ['theme-ia-enterprise'], primaryGoalId: 'goal-ia-enterprise-2026',
        projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, owner: { type: 'pmt', id: 'pmtIA2', name: 'David Kim' }, technicalPOC: { type: 'engineer', id: 'engKevinZhang_teamIA5_ia', name: 'Kevin Zhang' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Key feature for B2B.", planningYear: 2025 }
    },
    // --- 2026 (Year 2: Enterprise, Cost, Multi-modality POC) ---
    {
        initiativeId: 'init-ia-005', title: 'Optimize Inference Costs (Mixture of Experts)', description: 'Research and implement MoE architecture to reduce cost-per-token.', isProtected: false,
        assignments: [ { teamId: 'teamIA1', sdeYears: 2.0 }, { teamId: 'teamIA4', sdeYears: 1.5 } ],
        impactedServiceIds: ['FoundationModelService', 'InferenceAPIService'], roi: { category: 'Cost Reduction', valueType: 'MetricImprovement', estimatedValue: 'Reduce inference cost 40%' }, targetDueDate: "2026-09-30", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-core-model', 'theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-enterprise-2026',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, technicalPOC: { type: 'sdm', id: 'sdmIA4', name: 'Mei Lin' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Strategic cost-saving project.", planningYear: 2026 }
    },
    {
        initiativeId: 'init-ia-006', title: 'Launch "InsightAI for Enterprise" (VPC & Dedicated)', description: 'Offer private VPC deployment and dedicated inference capacity for large customers.', isProtected: false,
        assignments: [ { teamId: 'teamIA5', sdeYears: 2.0 }, { teamId: 'teamIA4', sdeYears: 1.0 }, { teamId: 'teamIA1', sdeYears: 0.5 } ],
        impactedServiceIds: ['InferenceAPIService', 'UserService', 'BillingService'], roi: { category: 'Revenue Generation', valueType: 'Monetary', estimatedValue: '50M New ARR' }, targetDueDate: "2026-06-30", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-enterprise', 'theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-enterprise-2026',
        projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, owner: { type: 'pmt', id: 'pmtIA2', name: 'David Kim' }, technicalPOC: { type: 'sdm', id: 'sdmIA5', name: 'Sam O\'Connell' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Major revenue driver for 2026.", planningYear: 2026 }
    },
    {
        initiativeId: 'init-ia-007', title: 'POC: "Insight-5-Vision" Module', description: 'Initial research and training for an image-generation (multi-modal) model.', isProtected: false,
        assignments: [ { teamId: 'teamIA1', sdeYears: 1.5 }, { teamId: 'teamIA2', sdeYears: 0.5 } ],
        impactedServiceIds: ['TrainingPipelineService', 'DataIngestionService'], roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Explore new modality' }, targetDueDate: "2026-11-30", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-core-model', 'theme-ia-multimodality'], primaryGoalId: 'goal-ia-multimodality-2027',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' }, technicalPOC: { type: 'engineer', id: 'engAliceWong_teamIA1_ia', name: 'Dr. Alice Wong' },
        workPackageIds: [], attributes: { pmCapacityNotes: "R&D for next major feature.", planningYear: 2026 }
    },
    {
        initiativeId: 'init-ia-008', title: 'Data Pipeline v3 (100T Token Scale)', description: 'Re-architect the data ingestion and curation pipeline to handle 100T+ tokens.', isProtected: false,
        assignments: [ { teamId: 'teamIA2', sdeYears: 2.0 } ],
        impactedServiceIds: ['DataIngestionService', 'TrainingPipelineService'], roi: { category: 'Tech Debt', valueType: 'Narrative', estimatedValue: 'Enable future model scale' }, targetDueDate: "2026-12-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-platform-scaling'], primaryGoalId: 'goal-ia-insight6-2027',
        projectManager: null, owner: { type: 'sdm', id: 'sdmIA3', name: 'Leo Valdez' }, technicalPOC: { type: 'sdm', id: 'sdmIA3', name: 'Leo Valdez' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Prerequisite for Insight-6.", planningYear: 2026 }
    },
    // --- 2027 (Year 3: Multi-modality, Next-Gen Research) ---
    {
        initiativeId: 'init-ia-009', title: 'Launch "Insight-5-Vision" (GA)', description: 'General availability of the new multi-modal (image/text) API.', isProtected: false,
        assignments: [ { teamId: 'teamIA1', sdeYears: 1.0 }, { teamId: 'teamIA4', sdeYears: 1.5 }, { teamId: 'teamIA5', sdeYears: 1.0 } ],
        impactedServiceIds: ['FoundationModelService', 'InferenceAPIService', 'SafetyModerationService', 'BillingService'], roi: { category: 'Strategic', valueType: 'Narrative', estimatedValue: 'Launch Multi-modality' }, targetDueDate: "2027-06-30", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-multimodality', 'theme-ia-enterprise'], primaryGoalId: 'goal-ia-multimodality-2027',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'pmt', id: 'pmtIA1', name: 'Rachel Lee' }, technicalPOC: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Major new product line.", planningYear: 2027 }
    },
    {
        initiativeId: 'init-ia-010', title: 'Achieve SOC-2 Type 2 Compliance', description: 'Complete audit and certification for SOC-2 Type 2 for the entire platform.', isProtected: false,
        assignments: [ { teamId: 'teamIA5', sdeYears: 1.0 }, { teamId: 'teamIA4', sdeYears: 0.5 }, { teamId: 'teamIA1', sdeYears: 0.5 } ],
        impactedServiceIds: ['UserService', 'InferenceAPIService', 'FoundationModelService'], roi: { category: 'Compliance', valueType: 'Narrative', estimatedValue: 'Unblock major enterprise' }, targetDueDate: "2027-09-30", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-enterprise', 'theme-ia-security'], primaryGoalId: 'goal-ia-enterprise-2026',
        projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, owner: { type: 'seniorManager', id: 'srMgrIA2', name: 'Mark Chen' }, technicalPOC: { type: 'sdm', id: 'sdmIA5', name: 'Sam O\'Connell' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Required for large regulated customers.", planningYear: 2027 }
    },
    {
        initiativeId: 'init-ia-011', title: 'Begin "Insight-6" Research', description: 'Initial exploratory research for the next-next-generation model architecture.', isProtected: false,
        assignments: [ { teamId: 'teamIA1', sdeYears: 2.0 } ],
        impactedServiceIds: ['TrainingPipelineService'], roi: { category: 'Innovation', valueType: 'Narrative', estimatedValue: 'Long-term R&D' }, targetDueDate: "2027-12-31", actualCompletionDate: null, status: 'Backlog',
        themes: ['theme-ia-core-model'], primaryGoalId: 'goal-ia-insight6-2027',
        projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, technicalPOC: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' },
        workPackageIds: [], attributes: { pmCapacityNotes: "Future-looking research.", planningYear: 2027 }
    }
];

// Then, the main sampleSystemDataInsightAI object
const sampleSystemDataInsightAI = {
    systemName: 'InsightAI',
    systemDescription: 'InsightAI is a state-of-the-art Generative AI research and product company, providing foundational models and API services.',
    seniorManagers: sampleSeniorManagersDataInsightAI,
    teams: insightAITeamsData,
    sdms: insightAISDMsData,
    pmts: insightAIPMTsData,
    projectManagers: sampleProjectManagersDataInsightAI,
    services: sampleServicesDataInsightAI,
    platformDependencies: [], 
    capacityConfiguration: {
        workingDaysPerYear: 261,
        standardHoursPerDay: 8,
        globalConstraints: {
            publicHolidays: 10,
            orgEvents: [
                { id: 'eventIA001', name: 'AI Research Conference (NeurIPS/ICML)', estimatedDaysPerSDE: 2, attributes: {} },
                { id: 'eventIA002', name: 'Internal Safety & Alignment Summit', estimatedDaysPerSDE: 1, attributes: {} }
            ]
        },
        leaveTypes: [
            { id: "annual_ia", name: "Annual Leave", defaultEstimatedDays: 25, attributes: {} },
            { id: "sick_ia", name: "Sick Leave", defaultEstimatedDays: 10, attributes: {} },
            { id: "study_ia", name: "Study/Conference Leave", defaultEstimatedDays: 10, attributes: {} },
            { id: "inlieu_ia", name: "Time off In-lieu Leave", defaultEstimatedDays: 5, attributes: {} }
        ],
        attributes: {}
    },
    yearlyInitiatives: sampleYearlyInitiativesInsightAI, 
    goals: [
        {
            goalId: 'goal-ia-insight5-2025', name: 'Train & Launch Insight-5 Model (2025)', description: 'Successfully train, align, and launch the Insight-5 foundational model.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, technicalPOC: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' },
            initiativeIds: ['init-ia-001'], attributes: {}
        },
        {
            goalId: 'goal-ia-platform-2025', name: 'Launch Scalable Public API Platform (2025)', description: 'Achieve GA for the public API with 99.95% uptime and target latency.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrIA2', name: 'Mark Chen' }, projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, technicalPOC: { type: 'sdm', id: 'sdmIA5', name: 'Sam O\'Connell' },
            initiativeIds: ['init-ia-ktlo', 'init-ia-oncall', 'init-ia-002'], attributes: {}
        },
        {
            goalId: 'goal-ia-safety-2025', name: 'Establish SOTA Safety & Alignment (2025)', description: 'Develop and implement industry-leading safety benchmarks and moderation.', strategyLink: null,
            owner: { type: 'sdm', id: 'sdmIA2', name: 'Dr. Sarah Jenkins' }, projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, technicalPOC: { type: 'sdm', id: 'sdmIA2', name: 'Dr. Sarah Jenkins' },
            initiativeIds: ['init-ia-003'], attributes: {}
        },
        {
            goalId: 'goal-ia-enterprise-2026', name: 'Grow Enterprise Revenue to $100M ARR (2026)', description: 'Build and launch features required for large-scale enterprise adoption.', strategyLink: null,
            owner: { type: 'pmt', id: 'pmtIA2', name: 'David Kim' }, projectManager: { type: 'projectManager', id: 'pmIA002', name: 'Ben Cohen' }, technicalPOC: { type: 'sdm', id: 'sdmIA5', name: 'Sam O\'Connell' },
            initiativeIds: ['init-ia-004', 'init-ia-005', 'init-ia-006', 'init-ia-010'], attributes: {}
        },
        {
            goalId: 'goal-ia-multimodality-2027', name: 'Launch Multi-modal Capabilities (2027)', description: 'Expand the InsightAI platform beyond text to include image generation.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, projectManager: { type: 'projectManager', id: 'pmIA001', name: 'Aisha Khan' }, technicalPOC: { type: 'sdm', id: 'sdmIA1', name: 'Dr. Kenji Tanaka' },
            initiativeIds: ['init-ia-007', 'init-ia-009'], attributes: {}
        },
        {
            goalId: 'goal-ia-insight6-2027', name: 'Begin Insight-6 Research Program (2027)', description: 'Secure data and infrastructure prerequisites for the next-next-gen model.', strategyLink: null,
            owner: { type: 'seniorManager', id: 'srMgrIA1', name: 'Dr. Evelyn Reed' }, projectManager: null, technicalPOC: { type: 'sdm', id: 'sdmIA3', name: 'Leo Valdez' },
            initiativeIds: ['init-ia-008', 'init-ia-011'], attributes: {}
        }
    ],
    definedThemes: [
        { themeId: 'theme-ia-core-model', name: 'Core Model Advancement', description: 'Fundamental research and training of next-generation foundation models.', relatedGoalIds: ['goal-ia-insight5-2025', 'goal-ia-multimodality-2027', 'goal-ia-insight6-2027'], attributes: {} },
        { themeId: 'theme-ia-safety', name: 'Safety & Alignment', description: 'Research and implementation of model safety, ethics, and alignment (e.g., RLHF).', relatedGoalIds: ['goal-ia-safety-2025', 'goal-ia-insight5-2025'], attributes: {} },
        { themeId: 'theme-ia-platform-scaling', name: 'Platform & Scaling', description: 'Work on inference optimization, cost, latency, uptime, and MLOps.', relatedGoalIds: ['goal-ia-platform-2025', 'goal-ia-enterprise-2026'], attributes: {} },
        { themeId: 'theme-ia-enterprise', name: 'Enterprise Adoption', description: 'Features specifically for B2B customers (e.g., SSO, VPC, Billing, Compliance).', relatedGoalIds: ['goal-ia-platform-2025', 'goal-ia-enterprise-2026'], attributes: {} },
        { themeId: 'theme-ia-multimodality', name: 'New Modalities', description: 'Expanding the model to new domains like images, audio, or video.', relatedGoalIds: ['goal-ia-multimodality-2027'], attributes: {} },
        { themeId: 'theme-ia-security', name: 'Security', description: 'Platform and data security initiatives.', relatedGoalIds: ['goal-ia-enterprise-2026'], attributes: {} }
    ],
    archivedYearlyPlans: [],
    workPackages: [], 
    calculatedCapacityMetrics: null,
    allKnownEngineers: sampleAllKnownEngineersInsightAI, 
    attributes: {} 
};