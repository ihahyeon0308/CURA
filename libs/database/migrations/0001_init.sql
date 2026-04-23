CREATE TABLE IF NOT EXISTS specialties (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  specialty_slug TEXT NOT NULL REFERENCES specialties(slug),
  name TEXT NOT NULL,
  service_class TEXT NOT NULL,
  coverage_type TEXT NOT NULL,
  comparability_tier TEXT NOT NULL,
  normalization_hints JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  care_level TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  specialty_slug TEXT NOT NULL REFERENCES specialties(slug),
  treatment_slug TEXT REFERENCES treatments(slug),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  visit_month DATE NOT NULL,
  evidence_type TEXT NOT NULL,
  trust_score DOUBLE PRECISION NOT NULL,
  moderation_status TEXT NOT NULL,
  ratings JSONB NOT NULL,
  quoted_price_krw INTEGER,
  paid_price_krw INTEGER
);

CREATE TABLE IF NOT EXISTS price_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  treatment_slug TEXT NOT NULL REFERENCES treatments(slug),
  coverage_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  amount_krw INTEGER NOT NULL,
  normalized_amount_krw INTEGER NOT NULL,
  observed_at DATE NOT NULL,
  comparability_score DOUBLE PRECISION NOT NULL,
  cohort_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  specialty_slug TEXT REFERENCES specialties(slug),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hospitals_district ON hospitals (district);
CREATE INDEX IF NOT EXISTS idx_hospitals_care_level ON hospitals (care_level);
CREATE INDEX IF NOT EXISTS idx_reviews_hospital_id ON reviews (hospital_id);
CREATE INDEX IF NOT EXISTS idx_reviews_specialty_slug ON reviews (specialty_slug);
CREATE INDEX IF NOT EXISTS idx_price_records_hospital_id ON price_records (hospital_id);
CREATE INDEX IF NOT EXISTS idx_price_records_treatment_slug ON price_records (treatment_slug);
