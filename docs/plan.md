# CURA MVP Plan

## Implementation readiness

This plan defines the architecture for implementation.

Actual implementation must be triggered by `구현해`.

When triggered:
- All modules must be implemented as real working systems
- No mock data or placeholder UI is allowed
- All implementation must follow this plan

This plan is the primary source of truth for system design during implementation.

If there is any conflict, this plan takes precedence.

## Scope and protocol

- Scope is now Seoul hospital and clinic coverage across specialties, not Seoul dental only.
- This document is a no-code architecture and system plan.
- Pseudocode exists only to illustrate service logic.
- No implementation work should start until the user explicitly says `구현해`.

## Implementation status

- Completed: workspace scaffold for `apps/web`, `apps/api`, `libs/contracts`, `libs/domain`, `analytics-service`, and `infra`
- Completed: typed shared contracts, seeded Seoul hospital data, scoring logic, search logic, and recommendation logic
- Completed: NestJS controllers for health, search, hospital detail, specialty detail, price analytics, recommendations, reviews, and community posts
- Completed: Next.js pages for overview, search, hospital detail, specialty detail, and recommendations
- In progress: replace in-memory seeded repository with PostgreSQL, Redis queueing, and OpenSearch-backed persistence

## 1. Architecture

### 1.1 Logical system diagram

```text
Users
  |
  v
Next.js Web App
  |- Search
  |- Hospital detail
  |- Specialty and treatment views
  |- Reviews and ratings
  |- Community posts
  |- Auth session UX
  |
  v
NestJS API (Fastify adapter)
  |- Auth and authorization
  |- Hospital/Doctor/Treatment read APIs
  |- Review, rating, post, comment APIs
  |- Recommendation APIs
  |- Moderation APIs
  |- Queue producers and orchestration
  |
  +-------------------------+--------------------------+
  |                         |                          |
  v                         v                          v
PostgreSQL               Search Cluster              Redis
  |- canonical data        |- unified search index     |- job queue
  |- audits                |- autocomplete             |- rate limiting
  |- reviews               |- ranking docs             |- short-lived cache
  |- price evidence        |- denormalized facets
  |
  v
Worker Layer
  |- NestJS worker for ingestion, indexing, moderation orchestration
  |- Python analytics service for summarization, sentiment, anomaly tasks
```

### 1.2 Service boundaries

#### Frontend

- public search and comparison experience
- hospital detail pages
- authenticated contribution flows
- explanation UI for score breakdown and confidence
- legal-safe presentation of user-generated evidence

#### Core API

- canonical writes with strong validation
- read aggregation for detail pages
- auth, abuse prevention, moderation state transitions
- recommendation assembly
- queue production and orchestration

#### Worker layer

- official-data ingestion
- trust-score recomputation
- price-stat recomputation
- search reindexing
- AI summarization and anomaly tasks

#### PostgreSQL

- source of truth for relational and compliance-sensitive data
- audit trail and moderation history
- durable storage for review and price evidence

#### Search cluster

- fast unified search
- autocomplete
- denormalized retrieval and ranking

#### Redis

- async jobs
- rate limiting
- ephemeral caching where recomputation cost is high

### 1.3 Request lifecycle

#### Search lifecycle

1. User enters hospital, doctor, specialty, or treatment terms.
2. Next.js calls `GET /api/v1/search`.
3. Core API queries the search cluster.
4. Search response returns matched entities, filters, score summaries, and confidence labels.
5. Detail pages fetch canonical data from PostgreSQL-backed endpoints.

#### Review lifecycle

1. User submits review, rating, specialty context, and optional price evidence.
2. Core API validates and stores the record in PostgreSQL.
3. A queue event is produced transactionally.
4. Worker flow triggers moderation, trust recomputation, price normalization, AI analysis, and search reindexing.

#### Official-data sync lifecycle

1. Scheduled workers pull official public datasets.
2. Incoming records are normalized and matched to canonical institutions.
3. Source-of-truth entities are updated in PostgreSQL.
4. Search documents and aggregate metrics are recomputed asynchronously.

## 2. Technology decision record

### 2.1 Why the original Next.js + NestJS + PostgreSQL + Elasticsearch + Docker baseline was reasonable

That original stack was not arbitrary. It matched the shape of the problem in five ways.

#### 1. This is a web product first, not a pure analytics system

- The product depends on discoverable public pages, rich authenticated flows, structured forms, and explainable detail views.
- That makes a strong web framework more important than a pure API-first backend stack.
- Next.js is strong when public, SEO-sensitive pages and interactive authenticated flows must coexist.

#### 2. The domain is relational and audit-heavy

- Hospitals, doctors, specialties, treatments, reviews, ratings, posts, comments, moderation states, and price evidence are deeply related.
- This naturally pushes the source of truth toward PostgreSQL rather than a document-first store.

#### 3. Search is central to the UX

- Unified search is not a nice-to-have. It is a primary product capability.
- Hospitals, doctors, specialties, and treatments require autocomplete, fuzzy matching, filtering, and weighted ranking.
- That justifies a dedicated search engine instead of overloading the primary database.

#### 4. The API surface is not small

- Auth, moderation, ingestion, recommendation, ranking, and trust scoring create a larger backend than a typical CRUD app.
- NestJS makes sense when the backend needs explicit modules, validation, guards, and worker reuse.

#### 5. The project benefits from deterministic local environments

- Search, queueing, database, API, and web layers are hard to keep aligned without containerization.
- Docker is the simplest practical way to keep dev, CI, and staging reasonably consistent.

### 2.2 Why the wider Seoul hospital scope changes the answer

The original stack was still directionally right, but the broader domain reveals two weaknesses.

#### Weakness 1: a pure TypeScript stack is not always the best fit for analytics-heavy tasks

- Review summarization, sentiment classification, anomaly detection, and specialty-aware price analysis are easier to evolve in Python.
- The Python ecosystem remains stronger for experimental NLP, data analysis, and operational analytics workflows.
- Forcing all AI and analytics logic into NestJS is possible, but it increases friction exactly where experimentation is needed.

#### Weakness 2: Elasticsearch is not automatically the best operational choice

- The product needs Elasticsearch-class capabilities, but not necessarily Elasticsearch specifically.
- For a self-hosted MVP, OpenSearch may be more cost-effective and operationally flexible.
- If the team plans to buy a managed Elastic stack and accepts the cost and licensing model, Elasticsearch is still valid.

### 2.3 Revised recommendation for this project

The revised recommendation is:

- Frontend: Next.js App Router
- Core user-facing API: NestJS with Fastify adapter
- Primary language for product surface: TypeScript
- Analytics and AI runtime: Python service or worker
- Source-of-truth database: PostgreSQL
- Search engine: OpenSearch-compatible search cluster
  - OpenSearch preferred for self-hosted cost control
  - Elasticsearch acceptable if managed service and budget are acceptable
- Queue and rate limiting: Redis
- Containerization: Docker and Docker Compose for local development

### 2.4 Why this revised recommendation fits better

#### Next.js remains the right frontend choice

Why:

- hospital detail pages are public, searchable, and content-heavy
- search and comparison pages need good perceived performance
- authenticated contribution flows still need rich client interactivity
- the framework gives a practical balance between SSR, caching, and client-side UX

Why not replace it with Remix, Nuxt, or a SPA-only stack:

- Remix is strong, but the ecosystem and hiring pool are smaller for teams that already lean React and TypeScript
- Nuxt is reasonable only if the team strongly prefers Vue
- a SPA-only architecture would hurt SEO, shareability, and first-load experience for public detail pages

#### NestJS is still a strong fit for the core API

Why:

- the core API is domain-heavy, not just throughput-heavy
- explicit modules help separate hospitals, doctors, treatments, reviews, moderation, recommendations, and ingestion
- validation, guards, interceptors, and queue integration are useful in a compliance-sensitive product
- TypeScript contracts can be shared with the frontend

Why not use FastAPI as the only backend:

- FastAPI is excellent for data and model-serving tasks
- but as the sole backend for this project it would push too much core product logic into a Python service layer where shared client contracts and DTO discipline are weaker
- the result would likely be faster experimentation but slower long-term product consistency

Why not use Go as the main backend:

- Go is strong for throughput and operational simplicity
- but this project's bottleneck is not raw request throughput
- the harder problem is domain complexity, policy-rich validation, moderation workflow, and iteration speed
- Go would likely increase boilerplate and slow early product iteration

#### TypeScript for the product surface, Python for analytics, is the best language split

Why:

- TypeScript is strongest where contracts, shared schemas, and UI-to-API consistency matter
- Python is strongest where text processing, data exploration, anomaly detection, and model iteration matter
- this split keeps the core application coherent without forcing AI-heavy work into the wrong toolchain

Risk of this split:

- a polyglot stack increases operational complexity

Why the tradeoff is still worth it:

- the added complexity is concentrated in one place, the analytics worker
- that is preferable to distorting the entire product architecture around a single language choice

#### PostgreSQL remains the correct source of truth

Why:

- relational integrity matters more than schema looseness
- audits and moderation require strong transactional semantics
- JSONB allows flexible metadata for price evidence without giving up relational rigor

Why not use MongoDB or another document store as primary storage:

- the platform is relationship-heavy and audit-heavy
- a document-first source of truth would make cross-entity constraints, moderation history, and recomputation harder to reason about

#### Search should remain a separate engine

Why:

- unified autocomplete and ranking are product-critical
- PostgreSQL full-text search is useful, but not the right primary engine for weighted multi-entity retrieval at this scale

Why prefer OpenSearch-compatible search over locking into one exact vendor:

- feature needs map to the Elasticsearch family of search capabilities
- but vendor choice should stay flexible at MVP stage
- the product benefits more from analyzer quality, autocomplete, relevance tuning, and denormalized ranking than from brand-specific features

#### Redis is newly important in the revised plan

Why:

- hospital-wide scope means more recomputation, more ingestion, more moderation events, and more rate-limiting needs
- a queue is no longer optional if the system is to remain responsive under bursty write load

Why not keep everything synchronous:

- synchronous moderation, AI summary refresh, and reindexing would create slow writes and fragile user flows

#### Docker still makes sense

Why:

- this stack now includes web, API, database, queue, search, and analytics runtime
- without containers, environment drift would grow immediately

### 2.5 Failure modes and operational complexity by component

| Component | Scalability strength | Operational cost | Primary failure mode |
| --- | --- | --- | --- |
| Next.js | strong for hybrid public/private web UX | moderate | stale caching or confused server/client boundaries |
| NestJS | strong for modular domain logic | moderate | over-abstracted or decorator-heavy code |
| Python analytics worker | strong for AI and data iteration | moderate | model drift, queue backlog, or service coupling |
| PostgreSQL | strong for OLTP and audits | low to moderate | analytics jobs pressuring primary DB |
| Search cluster | strong for search and ranking | highest | index drift or relevance degradation |
| Redis | strong for async decoupling | low to moderate | queue backlog or poor retry discipline |
| Docker | strong for reproducibility | low to moderate | local and prod config divergence |

## 3. Domain model

### 3.1 Entity overview

The primary comparison unit is the canonical branch-level care location.

```text
User 1---N Review N---1 Hospital
User 1---N Post
User 1---N Comment
Review 1---N Rating
Review N---1 Treatment
Review N---0..1 Doctor
PriceRecord N---1 Hospital
PriceRecord N---1 Treatment
PriceRecord N---0..1 Review
Doctor N---N Hospital via DoctorAffiliation
Hospital N---N Specialty via HospitalSpecialty
Post 1---N Comment
```

Supporting entities:

- `Specialty`
- `DoctorAffiliation`
- `HospitalSpecialty`

### 3.2 Entity definitions

#### User

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| email | citext nullable | unique when local login exists |
| password_hash | text nullable | |
| nickname | varchar(40) | public handle |
| preferred_district | varchar(32) nullable | Seoul district preference |
| role | enum | `user`, `moderator`, `admin` |
| status | enum | `active`, `suspended`, `deleted` |
| trust_level | numeric(5,4) | account-level prior |
| created_at | timestamptz | |
| last_login_at | timestamptz nullable | |

Indexes:

- unique index on `email` where not null
- index on `role`
- index on `status`

#### Hospital

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| hira_institution_id | varchar(64) nullable | official identifier |
| institution_code | varchar(64) nullable | code mapping |
| legal_name | varchar(255) | canonical name |
| display_name | varchar(255) | user-facing label |
| normalized_name | varchar(255) | dedupe and search |
| care_level | enum | `clinic`, `hospital`, `general_hospital`, `tertiary_hospital`, `specialty_hospital`, `other` |
| ownership_type | enum nullable | `private`, `public`, `university`, `other` |
| address_road | varchar(255) | |
| address_lot | varchar(255) nullable | |
| district | varchar(32) | Seoul district |
| lat | numeric(9,6) nullable | |
| lon | numeric(9,6) nullable | |
| phone | varchar(32) nullable | |
| website_url | text nullable | |
| status | enum | `active`, `closed`, `unknown` |
| official_sync_at | timestamptz nullable | |
| aggregate_rating | numeric(4,3) nullable | denormalized cache |
| aggregate_price_score | numeric(4,3) nullable | denormalized cache |
| aggregate_trust_score | numeric(4,3) nullable | denormalized cache |
| aggregate_confidence | numeric(4,3) nullable | denormalized cache |
| evidence_count | integer | denormalized cache |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes:

- unique index on `hira_institution_id` where not null
- index on `(district, care_level, status)`
- index on `normalized_name`

#### Doctor

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| display_name | varchar(255) | |
| normalized_name | varchar(255) | |
| specialty_slug | varchar(64) nullable | canonical specialty |
| identity_confidence | numeric(5,4) | |
| source_type | enum | `official`, `ugc`, `mixed` |
| profile_status | enum | `active`, `hidden`, `needs_review` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes:

- index on `normalized_name`
- index on `specialty_slug`
- index on `identity_confidence`

#### Treatment

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| slug | varchar(64) | unique canonical key |
| name_ko | varchar(128) | display label |
| specialty_slug | varchar(64) | owning specialty |
| service_class | enum | `consultation`, `diagnostic`, `procedure`, `surgery`, `screening`, `rehabilitation`, `mental_health`, `dental`, `other` |
| coverage_type | enum | `covered`, `non_covered`, `mixed`, `unknown` |
| comparability_tier | enum | `tier_1`, `tier_2`, `tier_3`, `tier_4` |
| unit_label | varchar(64) nullable | e.g. `per_visit`, `per_case` |
| normalization_schema | jsonb | service-specific metadata rules |
| synonyms | jsonb | aliases |
| active | boolean | |
| created_at | timestamptz | |

Indexes:

- unique index on `slug`
- index on `(specialty_slug, service_class)`
- index on `comparability_tier`

#### Review

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | FK to user |
| hospital_id | uuid | FK to hospital |
| doctor_id | uuid nullable | FK to doctor |
| treatment_id | uuid nullable | FK to treatment |
| specialty_slug | varchar(64) nullable | explicit specialty context |
| care_context | enum | `outpatient`, `inpatient`, `emergency`, `screening`, `telehealth`, `other` |
| visit_month | date nullable | privacy-preserving date grain |
| review_text | text | |
| treatment_description | text nullable | |
| price_quote_amount | integer nullable | KRW |
| price_paid_amount | integer nullable | KRW |
| evidence_type | enum | `none`, `receipt`, `statement`, `other` |
| moderation_status | enum | `pending`, `published`, `rejected`, `hidden`, `escalated` |
| trust_score | numeric(5,4) | computed |
| sentiment_label | enum nullable | AI-derived, moderator-reviewable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes:

- index on `(hospital_id, moderation_status, created_at desc)`
- index on `(specialty_slug, moderation_status, created_at desc)` where `specialty_slug` is not null
- index on `(treatment_id, moderation_status)` where `treatment_id` is not null
- index on `trust_score`

#### Rating

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| review_id | uuid | FK to review |
| category | enum | `clinical_quality`, `price_fairness`, `explanation_clarity`, `service_experience`, `wait_time`, `accessibility`, `aftercare` |
| score | smallint | integer 1 through 5 |
| created_at | timestamptz | |

Indexes:

- unique index on `(review_id, category)`
- index on `(category, score)`

#### PriceRecord

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| hospital_id | uuid | FK to hospital |
| treatment_id | uuid | FK to treatment |
| review_id | uuid nullable | FK to review |
| source_type | enum | `official_api`, `ugc_receipt`, `ugc_self_report`, `admin_verified` |
| coverage_type | enum | `covered`, `non_covered`, `mixed`, `unknown` |
| observed_at | date | |
| amount_krw | integer | raw amount |
| normalized_amount_krw | integer nullable | |
| cohort_key | varchar(255) nullable | comparable cohort signature |
| comparability_score | numeric(5,4) | record-level comparability weight |
| evidence_weight | numeric(5,4) | source confidence |
| outlier_flag | enum | `none`, `high`, `low`, `suspicious`, `not_comparable` |
| metadata | jsonb | bundle or service context |
| created_at | timestamptz | |

Indexes:

- index on `(hospital_id, treatment_id, observed_at desc)`
- index on `(treatment_id, cohort_key, observed_at desc)`
- index on `(coverage_type, outlier_flag)`

#### Post

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | FK to user |
| hospital_id | uuid nullable | |
| specialty_slug | varchar(64) nullable | |
| treatment_id | uuid nullable | |
| title | varchar(200) | |
| body | text | |
| moderation_status | enum | `pending`, `published`, `hidden`, `rejected` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes:

- index on `(hospital_id, moderation_status, created_at desc)` where `hospital_id` is not null
- index on `(specialty_slug, moderation_status, created_at desc)` where `specialty_slug` is not null

#### Comment

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| post_id | uuid | FK to post |
| user_id | uuid | FK to user |
| parent_comment_id | uuid nullable | optional threaded reply |
| body | text | |
| moderation_status | enum | `pending`, `published`, `hidden`, `rejected` |
| created_at | timestamptz | |

Indexes:

- index on `(post_id, moderation_status, created_at asc)`
- index on `parent_comment_id`

### 3.3 Normalization versus denormalization

Normalize in PostgreSQL:

- canonical entities
- reviews and ratings
- raw price evidence
- moderation history
- source linkage and audit data

Denormalize selectively:

- hospital aggregate metrics
- specialty-level aggregates
- search documents
- treatment price stats by cohort
- AI summary snapshots

Reason:

- hospital-wide scope multiplies read-path joins, so derived views are necessary
- but recomputation and auditability still require a clean source of truth

### 3.4 Indexing strategy

PostgreSQL:

- B-tree indexes for FKs and common filters
- partial indexes for published content
- unique official-identifier constraints where available

Search cluster:

- unified index with `entity_type`
- analyzer strategy for Korean search
- completion or search-as-you-type support
- keyword fields for district, specialty, treatment slug, and care level
- numeric fields for rating, trust, price, confidence, and evidence volume

## 4. Core systems design

### 4.1 Search system

#### Search objectives

- one search box for hospitals, doctors, specialties, and treatments
- fast autocomplete in Korean
- explicit filters for district, specialty, rating, and price
- explainable ranking

#### Index design

Use a unified search document with:

- `entity_type`
- `entity_id`
- `name`
- `aliases`
- `district`
- `care_level`
- `specialties`
- `treatments`
- `rating_score`
- `price_score`
- `trust_score`
- `confidence_score`
- `evidence_count`
- `freshness_days`
- `completion`
- `geo`

#### Ranking strategy

`search_rank = lexical_score * type_weight * evidence_weight * freshness_weight * confidence_weight * quality_weight`

Where:

- `lexical_score` is text-match quality
- `type_weight` avoids over-promoting weak entity classes
- `evidence_weight = log(1 + evidence_count)`
- `freshness_weight = exp(-lambda * freshness_days)`
- `confidence_weight = 0.5 + 0.5 * confidence_score`
- `quality_weight = 1 + 0.15 * recommendation_score`

### 4.2 Review system

#### Review structure

A review should support:

- structured rating dimensions
- specialty context
- optional treatment context
- free-text narrative
- optional quoted and paid prices
- evidence type

#### Trust scoring model

`trust(review) = sigmoid(b0 + b1*evidence + b2*account_age + b3*history + b4*text_specificity - b5*duplication - b6*burstiness - b7*network_risk - b8*high_risk_claim)`

Interpretation:

- reviews with evidence and specific service detail get more weight
- suspicious duplication, timing, or network patterns reduce trust
- clinically or legally risky claims can trigger moderation even if trust is not near zero

Institution-level trust:

`trust(hospital, specialty) = weighted_mean(review_trust_i, weights = visibility_i) * coverage_factor`

### 4.3 Price intelligence system

This remains the product differentiator, but the model must become more nuanced in hospital-wide scope.

#### 4.3.1 Comparability tiers

Each treatment is assigned a comparability tier:

- `tier_1`: covered services with relatively standard patient burden
- `tier_2`: high-comparability non-covered services
- `tier_3`: bundled or partially comparable services
- `tier_4`: low-comparability complex care where price scoring should not be published

This is the key design change forced by the new scope.

#### 4.3.2 Cohort model

`cohort = (treatment_id, specialty_slug, care_level_group, cohort_key)`

`cohort_key` is derived from treatment-specific normalization dimensions.

Examples:

- MRI: body region, contrast usage, hospital type
- health screening: package tier, fasting labs, imaging inclusion
- cataract surgery: lens class, bilateral or unilateral, bundled follow-up
- dermatology laser: device class, area, session count

#### 4.3.3 Distribution model

For comparable services, use normalized log-price:

`x_i = ln(normalized_price_i)`

Compute:

- `mu_C = mean(x_i)`
- `m_C = median(x_i)`
- `var_C = variance(x_i)`
- `MAD_C = median(|x_i - m_C|)`

For covered services with expected burden baseline:

`b_i = patient_paid_i / expected_patient_burden_i`

Use `ln(b_i)` instead of raw normalized price when that baseline exists.

#### 4.3.4 Outlier detection

`rz_i = (x_i - m_C) / (1.4826 * MAD_C + epsilon)`

Flagging:

- `rz_i > 3.5`: high-price outlier
- `rz_i < -3.5`: low-price outlier
- low metadata completeness plus moderate deviation: `suspicious`
- `tier_4`: `not_comparable`

#### 4.3.5 Price score

`fairness_i = exp(-0.5 * rz_i^2)`

`affordability_i = 1 - percentile_rank(x_i within C)`

`comparability_weight_i = comparability_score_i`

`price_score_i = comparability_weight_i * (0.7 * fairness_i + 0.3 * affordability_i)`

Institution-level price score:

`price_score(hospital, treatment) = weighted_mean(price_score_i, weights = evidence_weight_i * recency_weight_i)`

This prevents low-comparability services from pretending to be as analytically strong as well-normalized services.

#### 4.3.6 Suspicious pricing signals

Flag internal review when:

- quoted and paid amounts diverge upward repeatedly
- unusually low prices correlate with poor metadata completeness
- one institution is a persistent high-price outlier in the same cohort
- user posts repeatedly mention upselling after low initial quotes

### 4.4 Recommendation engine

The product should produce:

- best value
- best quality
- balanced option

#### Component definitions

Bayesian-smoothed rating:

`rating_component = ((v / (v + m)) * R) + ((m / (v + m)) * R_global)`

Price component:

`price_component = price_score(hospital, treatment_scope)`

Trust component:

`trust_component = trust(hospital, specialty_scope)`

Confidence component:

`confidence_component = min(1, w1*coverage + w2*source_diversity + w3*comparability + w4*freshness)`

#### Final scores

`base_balanced = 0.50 * rating_component + 0.25 * price_component + 0.25 * trust_component`

`base_value = 0.35 * rating_component + 0.45 * price_component + 0.20 * trust_component`

`base_quality = 0.70 * rating_component + 0.10 * price_component + 0.20 * trust_component`

Public scores:

- `S_balanced = confidence_component * base_balanced`
- `S_value = confidence_component * base_value`
- `S_quality = confidence_component * base_quality`

#### Weighting justification

- rating remains dominant because clinical quality and explanation quality are the main decision signals
- price matters strongly in value mode, but should not dominate quality mode
- trust remains a moderator on the quality of evidence
- confidence gates all three because hospital-wide scope makes evidence quality uneven

#### Bias risks

- digitally active specialties may be overrepresented
- larger hospitals may accumulate evidence faster
- affluent districts may appear unfairly expensive if specialty context is weak
- low-comparability services may still attract user attention even when scoring is suppressed

Mitigations:

- specialty-aware evidence thresholds
- confidence penalty
- explicit comparability labels
- score explanations and "insufficient evidence" states

## 5. API design

### 5.1 Principles

- REST for operational clarity
- canonical reads from PostgreSQL-backed services
- search reads from search-cluster-backed services
- every public entity uses stable UUIDs

### 5.2 Core endpoints

#### Search

`GET /api/v1/search?q=&entityType=&district=&specialty=&minRating=&priceBand=&page=`

#### Hospital detail

`GET /api/v1/hospitals/:hospitalId`

Return:

- institution metadata
- aggregate scores
- specialty breakdown
- AI summary
- recent reviews
- price distribution by selected treatment cohort

#### Specialty detail within hospital

`GET /api/v1/hospitals/:hospitalId/specialties/:specialtySlug`

Return:

- specialty-scoped scores
- top treatments
- evidence counts
- summary and confidence

#### Review creation

`POST /api/v1/reviews`

Required request concepts:

- hospital ID
- specialty slug
- optional doctor ID
- optional treatment slug
- ratings array
- review text
- optional quoted and paid prices
- evidence type

#### Price analytics

`GET /api/v1/hospitals/:hospitalId/prices?treatment=mri-brain-contrast`

Return:

- cohort stats
- source mix
- outlier status
- comparability label
- price score

#### Recommendations

`GET /api/v1/recommendations?specialty=ophthalmology&treatment=cataract-surgery&district=Gangnam-gu&mode=balanced`

Return:

- ranked institutions
- score breakdown
- confidence label
- evidence counts

#### Community

- `GET /api/v1/posts?hospitalId=&specialty=`
- `POST /api/v1/posts`
- `POST /api/v1/posts/:postId/comments`

### 5.3 Error handling strategy

Use a uniform envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least one rating is required.",
    "details": {
      "field": "ratings"
    },
    "requestId": "uuid"
  }
}
```

Error categories:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `MODERATION_REQUIRED`
- `DEPENDENCY_UNAVAILABLE`
- `INTERNAL_ERROR`

## 6. Example logic snippets

These are intentionally non-runnable pseudocode snippets.

### 6.1 Price comparability classification

```text
function classifyComparability(treatment, record):
  if treatment.comparabilityTier == "tier_4":
    return { score: 0, publicPriceScoring: false }

  metadataCompleteness = completeness(record.metadata, treatment.normalizationSchema)

  if treatment.coverageType == "covered":
    return { score: 0.7 * metadataCompleteness, publicPriceScoring: true }

  if treatment.comparabilityTier == "tier_2":
    return { score: 1.0 * metadataCompleteness, publicPriceScoring: true }

  return { score: 0.5 * metadataCompleteness, publicPriceScoring: true }
```

### 6.2 Review trust

```text
function computeReviewTrust(review, account, textSignals, networkSignals):
  features = {
    evidence: scoreEvidence(review.evidenceType),
    age: bucketizeAccountAge(account.createdAt),
    history: contributionQuality(account.id),
    specificity: textSignals.specificity,
    duplication: textSignals.duplicationRisk,
    burstiness: networkSignals.burstiness,
    networkRisk: networkSignals.sharedDeviceRisk,
    highRiskClaim: textSignals.highRiskClaim
  }

  return sigmoid(weightedSum(features))
```

### 6.3 Recommendation assembly

```text
function rankHospital(metrics, mode):
  rating = bayesianSmoothedRating(metrics)
  price = metrics.priceScore
  trust = metrics.trustScore
  confidence = metrics.confidenceScore

  base = chooseWeights(mode).rating * rating
       + chooseWeights(mode).price * price
       + chooseWeights(mode).trust * trust

  return confidence * base
```

## 7. File structure

```text
/apps
  /web
    /app
      /(public)
        /search/page.tsx
        /hospitals/[hospitalId]/page.tsx
        /hospitals/[hospitalId]/specialties/[specialtySlug]/page.tsx
        /treatments/[slug]/page.tsx
      /(auth)
        /login/page.tsx
      /reviews/new/page.tsx
      /community/page.tsx
    /components
    /lib
    /styles
  /api
    /src
      /modules
        /auth
        /search
        /hospitals
        /doctors
        /specialties
        /treatments
        /reviews
        /prices
        /recommendations
        /community
        /moderation
        /ingestion
        /queue
      /common
      /config
      /main.ts
  /analytics-service
    /app
      /summarization
      /sentiment
      /anomaly
      /shared
/libs
  /contracts
    /api
    /events
  /domain
    /entities
    /value-objects
    /policies
  /database
    /migrations
    /seeds
  /search
    /mappings
    /documents
  /observability
  /security
/infra
  /docker
    /web.Dockerfile
    /api.Dockerfile
    /analytics.Dockerfile
  /compose
    /docker-compose.yml
/docs
  research.md
  plan.md
```

## 8. Tradeoffs

### 8.1 Consistency versus performance

- PostgreSQL is the consistent source of truth
- search and aggregate caches are optimized read views

Decision:

- accept eventual consistency in search and recommendation views
- preserve strong consistency for writes, moderation state, and audits

### 8.2 OLTP versus search-index duplication

- duplicating data into a search engine increases operational burden
- but without it, search quality and speed will be materially worse

Decision:

- keep deliberate duplication with explicit reindexing discipline

### 8.3 Single-language simplicity versus best-tool heterogeneity

- one-language stacks are simpler to operate
- but forcing AI and analytics into the same runtime as the product surface is not always efficient

Decision:

- use TypeScript for product-facing systems
- use Python only where it materially improves analytics and AI iteration speed

### 8.4 Moderation versus freedom of speech

- stricter moderation lowers legal risk but may reduce community usefulness
- lighter moderation increases product richness but raises litigation risk

Decision:

- allow experience reporting
- suppress or review high-risk allegations and thinly evidenced claims

### 8.5 Transparency versus legal defensibility

- maximal transparency would expose more allegations and weak evidence
- defensible transparency requires confidence labels, source labels, and cautious language

Decision:

- optimize for explainable and defensible transparency, not maximal exposure

## 9. Implementation gate

No implementation code should be written until explicit user approval is given with `구현해`. When implementation begins, this plan should be updated incrementally with actual progress and any stack changes made during build-out.
