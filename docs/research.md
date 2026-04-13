# CURA MVP Research

This document defines research, constraints, and system understanding only.

It must not be used as a direct implementation instruction.

Before `구현해`:
- Do not generate implementation code
- Do not create functional systems

When the keyword `구현해` is provided:
- All restrictions in this document are lifted
- This document becomes a reference for implementation
- This document must be used together with a dedicated implementation prompt

After `구현해`:
- You must implement real, working features
- No mock data is allowed
- API must connect to a real database
- UI must trigger actual backend logic

Implementation priority:
1. Database schema
2. Backend API
3. Frontend integration

Do not generate UI-only placeholder implementations based on this document.

## Scope and guardrails

- Product scope is limited to Seoul, South Korea.
- Domain scope now covers all hospital and clinic categories in Seoul, not dental care only.
- The MVP still aims to reduce information asymmetry, price opacity, and overtreatment risk, but it must now do so across heterogeneous specialties.
- This document remains implementation-free. It defines the research basis required before coding.
- Data sources for the MVP remain public healthcare data plus user-generated content.

## What changes when the scope expands from Seoul dental MVP to Seoul hospital-wide MVP

This is not a cosmetic scope change. It materially changes the product and system shape.

### 1. Entity volume and taxonomy complexity increase sharply

- Dental-only scope can use a relatively compact treatment taxonomy.
- Hospital-wide scope must represent internal medicine, orthopedics, dermatology, ophthalmology, pediatrics, obstetrics and gynecology, ENT, psychiatry, dentistry, diagnostics, health screening, and more.
- A broader treatment catalog means more normalization work, more alias handling, and more edge cases in search.

### 2. Price comparability becomes much harder

- In dental care, many high-interest procedures are non-covered and price variability is large.
- Across all hospitals, many insured services are partially standardized or reimbursement-constrained.
- This means a single universal price-fairness score is unsafe. Price comparison must be done per comparable service cohort and with explicit confidence labels.

### 3. Review risk becomes more legally and ethically sensitive

- Dental reviews often concern cost, service, and procedure experience.
- Hospital-wide reviews may involve cancer care, mental health, childbirth, emergency care, surgery, and chronic disease management.
- That expands privacy risk, defamation exposure, and the probability that users describe identifiable conditions.

### 4. Recommendation quality becomes less uniform

- A hospital-wide platform can still rank institutions, but score quality will vary by specialty and evidence density.
- The product must distinguish between:
  - broad institution-level signals
  - specialty-specific signals
  - treatment-specific price evidence

### 5. The architecture needs a stronger separation of concerns

- A citywide hospital product needs clearer boundaries for:
  - taxonomy management
  - specialty-aware pricing
  - trust and moderation
  - async recomputation
  - search indexing

### 6. Operational scope grows faster than user-facing scope

- Supporting "all hospitals in Seoul" does not just add more records.
- It adds more ingestion pathways, more moderation queues, more data sparsity problems, more specialty-specific normalization rules, and more admin tooling needs.

Conclusion:

- Expanding to all Seoul hospitals is feasible, but only if the MVP is honest about confidence, comparability, and coverage.
- The product can no longer assume that one ranking formula or one pricing model works equally well across all specialties.

## Official sources reviewed

- HIRA and public healthcare datasets for institution information, detailed institution metadata, treatment information, code mapping, opening and closure status, and non-covered fee disclosure:
  - https://www.data.go.kr/data/15001699/openapi.do
  - https://www.data.go.kr/data/15001711/openapi.do
  - https://www.data.go.kr/data/15001698/openapi.do
  - https://www.data.go.kr/data/3039508/openapi.do
  - https://www.data.go.kr/data/15013116/openapi.do
  - https://www.data.go.kr/data/15001673/openapi.do
- Kakao Local and Maps documentation for Korean address search, geocoding, and place lookup:
  - https://developers.kakao.com/docs/latest/en/local/common
- Seoul Open Data guidance and district boundary resources:
  - https://data.seoul.go.kr/together/guide/useGuide.do
- Korean law references relevant to UGC, privacy, and medical-platform risk:
  - Medical Service Act Article 45 and Article 56
  - Medical Service Act Enforcement Decree Article 23
  - Personal Information Protection Act Article 23
  - Criminal Act Articles 307 and 310
  - Information and Communications Network Act Article 70

## 1. System decomposition assumptions

### 1.1 Product responsibilities

The MVP is not a hospital directory. It is a decision-support system with five distinct responsibilities:

1. Canonical institution registry
   - Maintain normalized records for Seoul hospitals and clinics, including branches, aliases, and operating status.
2. Evidence ingestion
   - Pull official institution and pricing datasets where available.
   - Accept user reviews, ratings, posts, and price evidence.
3. Trust and moderation
   - Score credibility, identify manipulation, and moderate legally risky content.
4. Decision-support computation
   - Calculate institution, specialty, treatment, price, and trust signals.
5. Read experience
   - Provide search, detail pages, comparison views, AI summaries, and transparent score explanations.

If any one of these layers is weak, the platform becomes misleading. This is even more true in hospital-wide scope than in dental-only scope.

### 1.2 Seoul hospital market assumptions

- Seoul contains a mix of tertiary hospitals, general hospitals, specialty hospitals, and a very large clinic market.
- Institution quality cannot be modeled at a single granularity. A hospital may be strong in one department and weak in another.
- Doctor-level modeling is useful, but institution-level administrative data is usually stronger than provider-level public data.
- A hospital-wide product must model both specialty and treatment context. "Hospital quality" without context is too blunt to be trusted.
- Price transparency is strongest for non-covered or loosely bundled services, and weakest for emergency, inpatient, or highly case-specific care.

### 1.3 Architectural assumptions implied by the research

- PostgreSQL should remain the source of truth for compliance-sensitive relational data.
- Search must be a derived index, not the canonical storage model.
- Async processing is mandatory for:
  - official-data ingestion
  - moderation pipelines
  - search indexing
  - AI summarization
  - price-stat recomputation
  - trust-score recomputation
- Confidence must be a first-class output, not just an internal metric.

## 2. External dependencies

### 2.1 Public medical APIs

The MVP depends primarily on HIRA-related public data.

#### Recommended dependency set

1. Institution directory and identifiers
   - hospital information service
   - detailed institution information service
   - hospital code mapping service
   - opening and closure service
2. Clinical context
   - institution treatment information service
3. Price evidence
   - non-covered fee disclosure data where available

#### What official datasets are good at

- canonical institution names and identifiers
- addresses, phone numbers, and facility metadata
- institution type and opening or closure status
- a baseline layer of publicly disclosed pricing evidence

#### What official datasets do not solve

- rich specialty-level quality outcomes for every Seoul institution
- reliable named-doctor identity for all institutions
- uniform treatment definitions across specialties
- complete price coverage for all outpatient and inpatient services
- patient experience and service quality

### 2.2 Geolocation and mapping

Korean address quality matters enough that a Korea-native mapping provider is preferred.

Preferred dependency:

- Kakao Local and Maps APIs

Why this matters:

- district filtering depends on accurate Seoul district normalization
- official names, branch aliases, road addresses, and place names often differ
- poor geocoding directly causes duplicate institutions and broken proximity views

Supporting data:

- Seoul Open Data administrative boundaries and district code tables

### 2.3 AI dependencies

The required AI features are:

- review summarization
- sentiment classification
- anomaly detection

Research implication:

- AI should summarize already moderated evidence
- AI should not create medical or legal conclusions
- AI output must remain subordinate to evidence and auditability

## 3. Domain modeling considerations

### 3.1 Institution versus branch versus brand

The platform should compare licensed care locations, not only marketing brands.

Why this matters:

- one brand can operate multiple Seoul branches
- one branch can rebrand
- user reviews often refer to storefront names instead of legal institution names

Recommended stance:

- `Hospital` should represent a canonical branch-level care location
- aliases should be indexed for search
- official identifiers and operating status must attach to the canonical record

### 3.2 Hospital versus doctor versus specialty

Hospital-wide scope makes specialty context mandatory.

Implications:

- hospital-level scores should be available
- specialty-level scores should be treated as a stronger decision unit when enough evidence exists
- doctor-level profiles should require explicit identity confidence
- recommendation output should explain whether the score is institution-wide or specialty-specific

### 3.3 Treatment versus service cohort

In a hospital-wide platform, not every treatment is equally comparable.

Examples:

- MRI may be comparable by body part, contrast usage, and hospital type
- health screening packages require bundle-level normalization
- cataract surgery and dermatology procedures are more comparable than emergency admission or complex oncology care
- insured outpatient consultations may have limited price variance and should not be overstated as a "fairness" differentiator

Therefore:

- `Treatment` should be canonical taxonomy
- price comparisons should occur in service cohorts
- each cohort should carry a comparability level

### 3.4 Covered versus non-covered pricing

This distinction is critical in hospital-wide scope.

- Covered services often have constrained pricing and should lean more on access, wait time, explanation quality, and trust.
- Non-covered services can support stronger price distribution analysis.
- Mixed bundles should be modeled as partially comparable, not fully comparable.

### 3.5 Review versus rating versus discussion

- structured ratings support aggregation
- free-text reviews support nuance
- posts and comments support community knowledge and quote discrepancy reporting

These should remain distinct because they contribute differently to trust and ranking.

## 4. Data reliability challenges

### 4.1 Fake reviews and manipulation

Expected attack patterns:

- agency-written positive reviews
- competitor attacks
- bursty specialty-specific campaigns
- duplicate text
- coordinated low-price or high-price anchoring submissions

Mitigation needs:

- trust scoring
- rate limiting
- device and network heuristics
- staged publication
- weighted aggregation

### 4.2 Price inconsistency at hospital-wide scope

Broader hospital scope makes pricing harder, not easier.

Root causes:

- insured versus non-covered mix
- bundled services
- department-specific terminology
- clinical severity differences
- pre-op, imaging, room, sedation, and aftercare inclusion differences

Design consequence:

- a raw amount alone is not enough
- every price record must carry treatment context, source type, and normalization metadata
- low-comparability records should stay visible but have lower analytical weight

### 4.3 Specialty coverage bias

The platform will have uneven evidence density across specialties.

Examples:

- dermatology and dentistry may gather more user reviews
- tertiary-hospital inpatient departments may have fewer public reviews
- community-heavy specialties may dominate rankings if confidence is not controlled

Mitigation:

- confidence-aware ranking
- specialty-aware evidence thresholds
- clear "insufficient evidence" states

### 4.4 Entity resolution and deduplication

The same institution may appear under different names across official APIs, map providers, and user submissions.

Deduplication needs:

- official identifier priority
- normalized name and address signatures
- geospatial checks
- human review for ambiguous merges

### 4.5 AI reliability risk

Failure modes:

- over-compressing nuanced review evidence
- hallucinating overtreatment claims
- making department-level conclusions from thin data

Mitigation:

- summarize only moderated content
- require minimum evidence counts
- link summaries to source evidence
- fallback to "summary unavailable" when evidence is weak

## 5. Legal constraints

This section is a product-risk analysis, not legal advice.

### 5.1 Sensitive health information

Hospital-wide reviews are more privacy-sensitive than dental-only reviews because they may reveal:

- diagnosis categories
- surgery dates
- pregnancy status
- mental health context
- pediatric conditions

Implications:

- minimize raw medical detail collection
- prefer month-level visit timestamps
- avoid storing unnecessary attachments
- strictly control staff access to evidence

### 5.2 Defamation risk

Hospital-wide scope increases the likelihood of severe allegations involving negligence, misdiagnosis, or unnecessary treatment.

Product implications:

- high-risk content needs moderation workflow
- AI summaries must never convert allegations into facts
- public phrasing must stay evidence-based and non-accusatory

### 5.3 Medical advertising restrictions

A hospital-comparison platform can drift into risky comparative advertising if it:

- uses aggressive superlatives
- mixes paid placement with neutral ranking
- republishes patient testimonials as promotional claims

Mitigation:

- separate sponsored content
- publish methodology
- avoid unverifiable superlatives

### 5.4 Patient inducement and referral concerns

For MVP safety:

- no pay-for-ranking
- no referral-fee flows
- no visibility boosts tied to patient conversion

### 5.5 Price publication risk

The UI must distinguish:

- official disclosed prices
- user-reported quoted prices
- user-reported paid prices
- covered-service patient burden estimates

Conflating these categories would be both legally and analytically unsound.

## 6. Identified risks and mitigation strategies

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Scope expansion causes taxonomy sprawl | Search and analytics become inconsistent | Add specialty and comparability layers to the data model |
| Price comparability varies by department | Users may over-trust weak comparisons | Attach comparability and confidence to every price view |
| Sparse evidence biases rankings | Large hospitals or digitally active departments dominate | Use Bayesian smoothing and minimum evidence thresholds |
| Doctor identity linkage is weak | Wrong attribution creates reputational risk | Default to institution and specialty aggregation first |
| Review manipulation distorts scores | Ranking becomes economically gameable | Trust scoring, rate limits, moderation queues, anomaly detection |
| Legal complaints increase | Hospital-wide topics are more sensitive | Admin tooling, audit logs, takedown flow, neutral UI wording |
| Search and source-of-truth divergence | Users see stale or contradictory data | Outbox-based reindexing and freshness metadata |

## 7. Research conclusions

### 7.1 What the revised MVP can credibly do

- compare Seoul hospitals and clinics at institution, specialty, and treatment levels when evidence exists
- expose price distributions for comparable service cohorts
- surface best value, best quality, and balanced recommendations with visible confidence

### 7.2 What the revised MVP should not pretend to do

- provide equally strong price intelligence across every department
- prove malpractice or overtreatment
- publish aggressive universal rankings without specialty context

### 7.3 Design principles forced by the revised scope

1. Specialty context is mandatory.
2. Comparability must be explicit.
3. Confidence must be visible.
4. Institution-wide scores and treatment-specific scores must not be conflated.
5. Moderation and legal defensibility are core product systems.

## 8. Pre-implementation gate

The next phase should refine the architecture and planning documents only. No application code should be written until the user explicitly approves implementation with the phrase `구현해`.
