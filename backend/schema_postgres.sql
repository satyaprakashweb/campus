-- =============================================================================
-- CampusFind – Smart Campus Lost and Found Portal with Multimodal AI Matching
-- Complete Relational Database Schema (PostgreSQL DDL)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'faculty', 'staff', 'admin')),
    identifier VARCHAR(64) NOT NULL,
    department VARCHAR(150) DEFAULT '',
    course VARCHAR(120) DEFAULT '',
    semester VARCHAR(64) DEFAULT '',
    phone VARCHAR(32) DEFAULT '',
    avatar_url TEXT,
    notification_prefs JSONB DEFAULT '{"inApp": true, "emailAlerts": false, "matchThreshold": 0.45}'::jsonb,
    reset_token TEXT,
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    label VARCHAR(120) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. CAMPUS_LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS campus_locations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    building VARCHAR(150) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. LOST_ITEMS TABLE
CREATE TABLE IF NOT EXISTS lost_items (
    id VARCHAR(64) PRIMARY KEY,
    report_code VARCHAR(32) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id),
    description TEXT NOT NULL,
    color VARCHAR(80) DEFAULT '',
    brand VARCHAR(120) DEFAULT '',
    lost_date DATE NOT NULL,
    lost_time VARCHAR(32) DEFAULT '',
    location VARCHAR(150) NOT NULL,
    distinguishing_features TEXT DEFAULT '',
    additional_info TEXT DEFAULT '',
    photo TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Potential Match Found', 'Claim Pending', 'Verified', 'Returned', 'Resolved', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. FOUND_ITEMS TABLE
CREATE TABLE IF NOT EXISTS found_items (
    id VARCHAR(64) PRIMARY KEY,
    report_code VARCHAR(32) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id),
    description TEXT NOT NULL,
    color VARCHAR(80) DEFAULT '',
    brand VARCHAR(120) DEFAULT '',
    found_date DATE NOT NULL,
    found_time VARCHAR(32) DEFAULT '',
    location VARCHAR(150) NOT NULL,
    distinguishing_features TEXT DEFAULT '',
    additional_notes TEXT DEFAULT '',
    photo TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Claim Pending', 'Verified', 'Returned', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. ITEM_IMAGES TABLE (WITH CLIP IMAGE EMBEDDING REFERENCE & CACHED VECTOR)
CREATE TABLE IF NOT EXISTS item_images (
    id VARCHAR(64) PRIMARY KEY,
    item_id VARCHAR(64) NOT NULL,
    item_type VARCHAR(16) NOT NULL CHECK (item_type IN ('lost', 'found')),
    image_path TEXT NOT NULL,
    image_embedding_reference VARCHAR(128) NOT NULL,
    embedding_json JSONB,
    file_name VARCHAR(255) DEFAULT '',
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. AI_MATCHES TABLE (MULTIMODAL: TF-IDF + SBERT + CLIP IMAGE + CONTEXTUAL)
CREATE TABLE IF NOT EXISTS ai_matches (
    id VARCHAR(128) PRIMARY KEY,
    lost_item_id VARCHAR(64) NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
    found_item_id VARCHAR(64) NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
    tfidf_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    sbert_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    clip_image_score NUMERIC(6, 4),
    category_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    location_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    date_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    contextual_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    final_score NUMERIC(6, 4) NOT NULL DEFAULT 0,
    confidence_label VARCHAR(40) NOT NULL DEFAULT 'Moderate Match',
    matching_explanation TEXT NOT NULL DEFAULT '',
    matching_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    matched_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
    matched_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    shared_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'relevant', 'not_my_item', 'incorrect', 'invalidated')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (lost_item_id, found_item_id)
);

-- 8. MATCH_FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS match_feedback (
    id VARCHAR(64) PRIMARY KEY,
    match_id VARCHAR(128) NOT NULL REFERENCES ai_matches(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(32) NOT NULL CHECK (feedback_type IN ('relevant', 'not_my_item', 'incorrect')),
    comment TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(64) PRIMARY KEY,
    claim_code VARCHAR(32) NOT NULL UNIQUE,
    found_item_id VARCHAR(64) NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
    lost_item_id VARCHAR(64) REFERENCES lost_items(id) ON DELETE SET NULL,
    claimant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claimant_name VARCHAR(150) NOT NULL,
    identification_details TEXT NOT NULL,
    unique_features TEXT DEFAULT '',
    purchase_date VARCHAR(64) DEFAULT '',
    supporting_info TEXT DEFAULT '',
    proof_photo TEXT,
    claim_reason TEXT DEFAULT '',
    contact VARCHAR(150) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled')),
    admin_reason TEXT DEFAULT '',
    reviewed_by VARCHAR(150),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. HANDOVER_RECORDS TABLE
CREATE TABLE IF NOT EXISTS handover_records (
    id VARCHAR(64) PRIMARY KEY,
    handover_code VARCHAR(32) NOT NULL UNIQUE,
    claim_id VARCHAR(64) REFERENCES claims(id) ON DELETE SET NULL,
    found_item_id VARCHAR(64) NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_name VARCHAR(150) NOT NULL,
    approved_date DATE NOT NULL,
    handover_location VARCHAR(200) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(32) DEFAULT '',
    completed_date DATE,
    receiver_id_type VARCHAR(64) DEFAULT 'Student ID',
    receiver_id_number VARCHAR(64) DEFAULT '',
    verification_qr_token VARCHAR(128) NOT NULL,
    admin_remarks TEXT DEFAULT '',
    recorded_by VARCHAR(150) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Scheduled'
        CHECK (status IN ('Scheduled', 'Completed', 'Rescheduled', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(48) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) DEFAULT '/dashboard',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64),
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. EVALUATION_DATASET TABLE
CREATE TABLE IF NOT EXISTS evaluation_dataset (
    id VARCHAR(64) PRIMARY KEY,
    pair_code VARCHAR(32) NOT NULL UNIQUE,
    lost_title VARCHAR(200) NOT NULL,
    lost_description TEXT NOT NULL,
    lost_category VARCHAR(64) NOT NULL,
    lost_color VARCHAR(64) DEFAULT '',
    lost_location VARCHAR(150) NOT NULL,
    lost_date DATE NOT NULL,
    found_title VARCHAR(200) NOT NULL,
    found_description TEXT NOT NULL,
    found_category VARCHAR(64) NOT NULL,
    found_color VARCHAR(64) DEFAULT '',
    found_location VARCHAR(150) NOT NULL,
    found_date DATE NOT NULL,
    is_relevant_ground_truth BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT DEFAULT ''
);

-- INDEXES FOR FAST MULTIMODAL SEARCH, FILTERING & JOIN OPERATIONS
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON lost_items(category_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON found_items(category_id);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_item_images_item ON item_images(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_item_images_embedding_ref ON item_images(image_embedding_reference);
CREATE INDEX IF NOT EXISTS idx_ai_matches_lost ON ai_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_found ON ai_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_score ON ai_matches(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_claims_found_item ON claims(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
