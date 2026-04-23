INSERT INTO specialties (slug, name, description) VALUES
  ('dermatology', 'Dermatology', 'Skin, laser, and outpatient procedural care.'),
  ('ophthalmology', 'Ophthalmology', 'Vision, cataract, and eye diagnostic care.'),
  ('orthopedics', 'Orthopedics', 'Joint, spine, and musculoskeletal care.'),
  ('health-screening', 'Health Screening', 'Checkups and package screening programs.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO treatments (id, slug, specialty_slug, name, service_class, coverage_type, comparability_tier, normalization_hints) VALUES
  ('trt_mri_brain_contrast', 'mri-brain-contrast', 'orthopedics', 'Brain MRI with Contrast', 'diagnostic', 'mixed', 'tier_2', '["body-region", "contrast", "care-level"]'::jsonb),
  ('trt_cataract', 'cataract-surgery', 'ophthalmology', 'Cataract Surgery', 'surgery', 'mixed', 'tier_2', '["lens-class", "laterality", "follow-up"]'::jsonb),
  ('trt_laser', 'laser-toning', 'dermatology', 'Laser Toning', 'procedure', 'non_covered', 'tier_2', '["device-class", "session-count", "area"]'::jsonb),
  ('trt_screening', 'premium-screening-package', 'health-screening', 'Premium Screening Package', 'screening', 'mixed', 'tier_3', '["package-tier", "imaging", "lab-panel"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospitals (id, name, district, care_level, address, lat, lon, specialties, aliases, summary) VALUES
  ('hos_gangnam_univ', 'Gangnam University Hospital', 'Gangnam-gu', 'tertiary_hospital', '372 Teheran-ro, Gangnam-gu, Seoul', 37.5012, 127.0396, '["ophthalmology", "orthopedics", "health-screening"]'::jsonb, '["GUH", "Gangnam Univ Hospital"]'::jsonb, 'Large tertiary center with strong specialty depth and broad diagnostic infrastructure.'),
  ('hos_mapo_skin', 'Mapo Skin Clinic', 'Mapo-gu', 'clinic', '128 World Cup-ro, Mapo-gu, Seoul', 37.5561, 126.9103, '["dermatology"]'::jsonb, '["Mapo Skin", "Mapo Dermatology"]'::jsonb, 'Specialty outpatient clinic focused on cosmetic and recurring skin procedures.'),
  ('hos_songpa_eye', 'Songpa Vision Hospital', 'Songpa-gu', 'specialty_hospital', '44 Olympic-ro, Songpa-gu, Seoul', 37.5156, 127.1001, '["ophthalmology"]'::jsonb, '["Songpa Vision"]'::jsonb, 'Eye-focused specialty hospital with high cataract procedure volume.'),
  ('hos_jongno_bone', 'Jongno Bone and Joint Hospital', 'Jongno-gu', 'hospital', '88 Jong-ro, Jongno-gu, Seoul', 37.5703, 126.9822, '["orthopedics", "health-screening"]'::jsonb, '["Jongno Bone"]'::jsonb, 'Mid-sized hospital with strong orthopedic outpatient and imaging service lines.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (
  id, hospital_id, specialty_slug, treatment_slug, title, body, visit_month, evidence_type, trust_score, moderation_status, ratings, quoted_price_krw, paid_price_krw
) VALUES
  ('rev_1', 'hos_gangnam_univ', 'ophthalmology', 'cataract-surgery', 'Detailed pre-op explanation and smooth process', 'The care team explained lens options clearly. Waiting time was long, but the discharge process was organized.', '2026-02-01', 'receipt', 0.91, 'published', '{"clinicalQuality":5,"priceFairness":4,"explanationClarity":5,"serviceExperience":4,"waitTime":3,"accessibility":4,"aftercare":5}'::jsonb, 2100000, 2250000),
  ('rev_2', 'hos_songpa_eye', 'ophthalmology', 'cataract-surgery', 'Fast scheduling but higher final invoice', 'Consultation moved quickly and staff were attentive, but final billing was above the initial quote after lens upgrade discussion.', '2026-01-01', 'receipt', 0.84, 'published', '{"clinicalQuality":4,"priceFairness":2,"explanationClarity":4,"serviceExperience":4,"waitTime":4,"accessibility":5,"aftercare":4}'::jsonb, 1700000, 2480000),
  ('rev_3', 'hos_mapo_skin', 'dermatology', 'laser-toning', 'Consistent sessions and transparent pricing', 'The package details were disclosed upfront and session pacing was realistic.', '2026-03-01', 'statement', 0.79, 'published', '{"clinicalQuality":4,"priceFairness":5,"explanationClarity":4,"serviceExperience":4,"waitTime":4,"accessibility":4,"aftercare":3}'::jsonb, 180000, 180000),
  ('rev_4', 'hos_jongno_bone', 'orthopedics', 'mri-brain-contrast', 'Well organized MRI booking', 'Imaging instructions were clear and appointment slots were available quickly.', '2026-02-01', 'receipt', 0.76, 'published', '{"clinicalQuality":4,"priceFairness":4,"explanationClarity":4,"serviceExperience":3,"waitTime":4,"accessibility":4,"aftercare":3}'::jsonb, 690000, 720000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO price_records (
  id, hospital_id, treatment_slug, coverage_type, source_type, amount_krw, normalized_amount_krw, observed_at, comparability_score, cohort_key
) VALUES
  ('pr_1', 'hos_gangnam_univ', 'cataract-surgery', 'mixed', 'ugc_receipt', 2250000, 2250000, '2026-02-10', 0.92, 'standard-monofocal-unilateral'),
  ('pr_2', 'hos_songpa_eye', 'cataract-surgery', 'mixed', 'ugc_receipt', 2480000, 2480000, '2026-01-18', 0.89, 'standard-monofocal-unilateral'),
  ('pr_3', 'hos_mapo_skin', 'laser-toning', 'non_covered', 'ugc_receipt', 180000, 180000, '2026-03-06', 0.96, 'device-a-single-session-face'),
  ('pr_4', 'hos_jongno_bone', 'mri-brain-contrast', 'mixed', 'ugc_receipt', 720000, 720000, '2026-02-21', 0.87, 'brain-contrast-hospital'),
  ('pr_5', 'hos_gangnam_univ', 'premium-screening-package', 'mixed', 'official_api', 1450000, 1450000, '2026-02-15', 0.62, 'premium-tier-a')
ON CONFLICT (id) DO NOTHING;

INSERT INTO community_posts (
  id, hospital_id, specialty_slug, title, body, author_name, created_at
) VALUES
  ('post_1', 'hos_songpa_eye', 'ophthalmology', 'Did anyone see a big lens upgrade gap here?', 'I am comparing cataract quotes and noticed a large final jump after premium lens discussion.', 'visionwatch', '2026-03-11T10:00:00.000Z'),
  ('post_2', 'hos_mapo_skin', 'dermatology', 'Session package transparency was better than expected', 'The clinic shared expected maintenance cycle and did not push a larger package.', 'mapolocal', '2026-03-14T09:30:00.000Z')
ON CONFLICT (id) DO NOTHING;
