/**
 * CampusFind Relational Database Engine (node:sqlite DatabaseSync)
 * Implements all 13 required relational tables, password hashing (scrypt),
 * JWT authentication (HMAC-SHA256), status-transition validation,
 * automatic AI matching persistence, notifications, and audit logging.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCorpusModel, computePairSimilarity, DEFAULT_MULTIMODAL_WEIGHTS } from '../src/utils/matcher.js';
import {
  resolveImageBufferAndPath,
  computeClipImageEmbedding,
  withAiRetry,
} from './imageEmbedding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.CAMPUSFIND_DB_PATH || path.join(__dirname, 'campusfind.db');
const JWT_SECRET = process.env.CAMPUSFIND_JWT_SECRET || 'campusfind-outr-jwt-secret-key-2026-secure';

let dbInstance = null;

// --- Password Hashing (scrypt + salt, constant-time verify) ---
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, hashHex] = parts;
  const derived = crypto.scryptSync(String(password), salt, 64);
  const storedBuf = Buffer.from(hashHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

// --- JWT Signing & Verification (HMAC-SHA256) ---
function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const pad = 4 - (str.length % 4);
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/') + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function signJwt(payload, expiresInSeconds = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedBody, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedBody));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { expired: true };
    }
    return payload;
  } catch {
    return null;
  }
}

export function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = new DatabaseSync(DB_PATH);
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  initSchema(dbInstance);
  seedDatabaseIfNeeded(dbInstance);
  ensureImageEmbeddingsAndMultimodalMatches(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'staff', 'admin')),
      identifier TEXT NOT NULL,
      department TEXT DEFAULT '',
      course TEXT DEFAULT '',
      semester TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      avatar TEXT DEFAULT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notification_prefs TEXT NOT NULL DEFAULT '{"inApp":true,"emailAlerts":false,"matchThreshold":0.45}',
      reset_token TEXT DEFAULT NULL,
      reset_expires TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campus_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      building TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lost_items (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      description TEXT NOT NULL,
      color TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      lost_date TEXT NOT NULL,
      lost_time TEXT DEFAULT '',
      location TEXT NOT NULL,
      distinguishing_features TEXT DEFAULT '',
      additional_info TEXT DEFAULT '',
      photo TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Potential Match Found', 'Resolved', 'Closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS found_items (
      id TEXT PRIMARY KEY,
      report_code TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      description TEXT NOT NULL,
      color TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      found_date TEXT NOT NULL,
      found_time TEXT DEFAULT '',
      location TEXT NOT NULL,
      distinguishing_features TEXT DEFAULT '',
      additional_notes TEXT DEFAULT '',
      photo TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Claim Pending', 'Verified', 'Returned', 'Closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_images (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL CHECK (item_type IN ('lost', 'found')),
      item_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      image_path TEXT DEFAULT '',
      image_embedding_reference TEXT DEFAULT '',
      embedding_json TEXT DEFAULT NULL,
      file_name TEXT DEFAULT '',
      uploaded_at TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_matches (
      id TEXT PRIMARY KEY,
      lost_item_id TEXT NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
      found_item_id TEXT NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
      tfidf_score REAL NOT NULL DEFAULT 0,
      sbert_score REAL NOT NULL DEFAULT 0,
      clip_image_score REAL DEFAULT NULL,
      category_score REAL NOT NULL DEFAULT 0,
      location_score REAL NOT NULL DEFAULT 0,
      date_score REAL NOT NULL DEFAULT 0,
      contextual_score REAL NOT NULL DEFAULT 0,
      final_score REAL NOT NULL DEFAULT 0,
      confidence_label TEXT NOT NULL,
      matching_explanation TEXT NOT NULL DEFAULT '',
      matching_reasons TEXT NOT NULL DEFAULT '[]',
      matched_terms TEXT NOT NULL DEFAULT '[]',
      matched_concepts TEXT NOT NULL DEFAULT '[]',
      shared_attributes TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'relevant', 'not_my_item', 'incorrect', 'invalidated')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(lost_item_id, found_item_id)
    );

    CREATE TABLE IF NOT EXISTS match_feedback (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES ai_matches(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feedback_type TEXT NOT NULL CHECK (feedback_type IN ('relevant', 'not_my_item', 'incorrect')),
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      claim_code TEXT NOT NULL UNIQUE,
      found_item_id TEXT NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
      lost_item_id TEXT DEFAULT NULL,
      claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      claimant_name TEXT NOT NULL,
      identification_details TEXT NOT NULL,
      unique_features TEXT DEFAULT '',
      purchase_date TEXT DEFAULT '',
      supporting_info TEXT DEFAULT '',
      proof_photo TEXT DEFAULT NULL,
      claim_reason TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled')),
      admin_reason TEXT DEFAULT '',
      reviewed_by TEXT DEFAULT NULL,
      reviewed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS handover_records (
      id TEXT PRIMARY KEY,
      handover_code TEXT NOT NULL UNIQUE,
      claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      found_item_id TEXT NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id),
      owner_name TEXT NOT NULL,
      approved_date TEXT NOT NULL,
      handover_location TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT DEFAULT '11:00',
      completed_date TEXT DEFAULT NULL,
      receiver_id_type TEXT DEFAULT 'Student ID',
      receiver_id_number TEXT DEFAULT '',
      verification_qr_token TEXT NOT NULL,
      admin_remarks TEXT DEFAULT '',
      recorded_by TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Scheduled'
        CHECK (status IN ('Scheduled', 'Completed', 'Rescheduled', 'Cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT DEFAULT '/dashboard',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT DEFAULT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluation_dataset (
      id TEXT PRIMARY KEY,
      pair_code TEXT NOT NULL UNIQUE,
      lost_title TEXT NOT NULL,
      lost_description TEXT NOT NULL,
      lost_category TEXT NOT NULL,
      lost_color TEXT DEFAULT '',
      lost_brand TEXT DEFAULT '',
      lost_location TEXT DEFAULT '',
      found_title TEXT NOT NULL,
      found_description TEXT NOT NULL,
      found_category TEXT NOT NULL,
      found_color TEXT DEFAULT '',
      found_brand TEXT DEFAULT '',
      found_location TEXT DEFAULT '',
      is_ground_truth_match INTEGER NOT NULL DEFAULT 1,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matching_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lost_items_cat ON lost_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
    CREATE INDEX IF NOT EXISTS idx_found_items_cat ON found_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
    CREATE INDEX IF NOT EXISTS idx_ai_matches_final ON ai_matches(final_score DESC);
    CREATE INDEX IF NOT EXISTS idx_claims_found ON claims(found_item_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

  // Safe schema migrations for existing SQLite database
  const imgCols = new Set(db.prepare('PRAGMA table_info(item_images)').all().map((c) => c.name));
  if (!imgCols.has('image_path')) db.exec("ALTER TABLE item_images ADD COLUMN image_path TEXT DEFAULT ''");
  if (!imgCols.has('image_embedding_reference')) db.exec("ALTER TABLE item_images ADD COLUMN image_embedding_reference TEXT DEFAULT ''");
  if (!imgCols.has('embedding_json')) db.exec('ALTER TABLE item_images ADD COLUMN embedding_json TEXT DEFAULT NULL');
  if (!imgCols.has('uploaded_at')) db.exec("ALTER TABLE item_images ADD COLUMN uploaded_at TEXT DEFAULT ''");

  const matchCols = new Set(db.prepare('PRAGMA table_info(ai_matches)').all().map((c) => c.name));
  if (!matchCols.has('clip_image_score')) db.exec('ALTER TABLE ai_matches ADD COLUMN clip_image_score REAL DEFAULT NULL');
  if (!matchCols.has('category_score')) db.exec('ALTER TABLE ai_matches ADD COLUMN category_score REAL NOT NULL DEFAULT 0');
  if (!matchCols.has('location_score')) db.exec('ALTER TABLE ai_matches ADD COLUMN location_score REAL NOT NULL DEFAULT 0');
  if (!matchCols.has('date_score')) db.exec('ALTER TABLE ai_matches ADD COLUMN date_score REAL NOT NULL DEFAULT 0');
  if (!matchCols.has('matching_explanation')) db.exec("ALTER TABLE ai_matches ADD COLUMN matching_explanation TEXT NOT NULL DEFAULT ''");
}

export function getMatchingConfig(db) {
  const rows = db.prepare('SELECT key, value FROM matching_config').all();
  const cfg = {
    threshold: 0.30,
    notifyThreshold: 0.45,
    textWeight: 0.65,
    contextWeight: 0.35,
    sbertWeight: DEFAULT_MULTIMODAL_WEIGHTS.sbertWeight,
    tfidfWeight: DEFAULT_MULTIMODAL_WEIGHTS.tfidfWeight,
    clipWeight: DEFAULT_MULTIMODAL_WEIGHTS.clipWeight,
    categoryWeight: DEFAULT_MULTIMODAL_WEIGHTS.categoryWeight,
    locationWeight: DEFAULT_MULTIMODAL_WEIGHTS.locationWeight,
    dateWeight: DEFAULT_MULTIMODAL_WEIGHTS.dateWeight,
    defaultAlgorithm: 'sbert',
  };
  rows.forEach((r) => {
    if (r.key === 'defaultAlgorithm') cfg[r.key] = r.value;
    else cfg[r.key] = Number(r.value);
  });
  return cfg;
}

/**
 * Processes and stores one or more item photographs in `item_images`,
 * computes and caches their 512-d CLIP image embeddings, and returns the saved records.
 */
export function saveItemImagesWithEmbeddings(
  db,
  { itemId, itemType, photos = [], visualContext = '', replaceExisting = false }
) {
  const rawList = (Array.isArray(photos) ? photos : [photos]).filter(
    (p) => typeof p === 'string' && p.trim().length > 0
  );
  if (replaceExisting) {
    db.prepare('DELETE FROM item_images WHERE item_id = ? AND item_type = ?').run(itemId, itemType);
  }
  if (rawList.length === 0) return [];

  const now = new Date().toISOString();
  const savedRecords = [];

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO item_images (
      id, item_type, item_id, image_url, image_path, image_embedding_reference, embedding_json, file_name, uploaded_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rawList.slice(0, 5).forEach((photoInput, idx) => {
    const resolved = resolveImageBufferAndPath(photoInput, {
      persistUpload: true,
      itemHint: visualContext,
    });
    if (!resolved) return;

    const clipEmb = computeClipImageEmbedding(resolved.buffer, {
      hash: resolved.hash,
      visualContext: `${resolved.publicPath} ${visualContext}`,
    });

    const imgId = idx === 0 ? `img-${itemId}` : `img-${itemId}-${idx + 1}`;
    const fileName = path.basename(resolved.publicPath);

    insertStmt.run(
      imgId,
      itemType,
      itemId,
      resolved.publicPath,
      resolved.publicPath,
      clipEmb.embeddingReference,
      JSON.stringify(clipEmb.vector),
      fileName,
      now,
      now
    );

    savedRecords.push({
      id: imgId,
      itemId,
      itemType,
      imagePath: resolved.publicPath,
      imageUrl: resolved.publicPath,
      imageEmbeddingReference: clipEmb.embeddingReference,
      embedding: clipEmb.vector,
      uploadedAt: now,
    });
  });

  return savedRecords;
}

export { withAiRetry };

export function logAudit(db, { actorId = null, actorName = 'System', actorRole = 'system', action, entityType, entityId = '', details = '' }) {
  const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actorId, actorName, actorRole, action, entityType, entityId, details, now);
}

export function createNotification(db, { userId, type, title, message, link = '/dashboard' }) {
  if (!userId) return;
  const id = `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, userId, type, title, message, link, now);
}

/**
 * Normalizes a lost_items or found_items row into the unified item shape expected by the UI & matcher.
 */
export function formatItemRow(row, type, imageRecords = [], { includeEmbeddingVector = false } = {}) {
  if (!row) return null;
  const isLost = type === 'lost' || Boolean(row.lost_date);
  const formattedImages = imageRecords.map((img) => {
    let parsedVec = null;
    if (includeEmbeddingVector && img.embedding_json) {
      try {
        parsedVec = JSON.parse(img.embedding_json);
      } catch {
        parsedVec = null;
      }
    }
    return {
      id: img.id,
      itemId: img.item_id,
      itemType: img.item_type,
      imagePath: img.image_path || img.image_url,
      imageUrl: img.image_path || img.image_url,
      imageEmbeddingReference: img.image_embedding_reference || '',
      uploadedAt: img.uploaded_at || img.created_at,
      ...(includeEmbeddingVector ? { embedding: parsedVec } : {}),
    };
  });

  const primaryPhoto = formattedImages[0]?.imagePath || row.photo || null;
  const photosList = formattedImages.length > 0
    ? formattedImages.map((img) => img.imagePath)
    : primaryPhoto
    ? [primaryPhoto]
    : [];

  return {
    id: row.id,
    reportCode: row.report_code,
    type: isLost ? 'lost' : 'found',
    userId: row.user_id,
    title: row.title,
    category: row.category_id,
    description: row.description,
    color: row.color || '',
    brand: row.brand || '',
    date: isLost ? row.lost_date : row.found_date,
    time: (isLost ? row.lost_time : row.found_time) || '',
    location: row.location,
    distinguishingFeatures: row.distinguishing_features || '',
    additionalInfo: (isLost ? row.additional_info : row.additional_notes) || '',
    photo: primaryPhoto,
    photos: photosList,
    images: formattedImages,
    imageEmbeddingReference: formattedImages[0]?.imageEmbeddingReference || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllUnifiedItems(db, { includeEmbeddingVector = false } = {}) {
  const lostRows = db.prepare('SELECT * FROM lost_items ORDER BY created_at DESC').all();
  const foundRows = db.prepare('SELECT * FROM found_items ORDER BY created_at DESC').all();
  const allImageRows = db.prepare('SELECT * FROM item_images ORDER BY created_at ASC').all();

  const imgMap = new Map();
  allImageRows.forEach((img) => {
    const key = `${img.item_type}:${img.item_id}`;
    if (!imgMap.has(key)) imgMap.set(key, []);
    imgMap.get(key).push(img);
  });

  return [
    ...lostRows.map((r) =>
      formatItemRow(r, 'lost', imgMap.get(`lost:${r.id}`) || [], { includeEmbeddingVector })
    ),
    ...foundRows.map((r) =>
      formatItemRow(r, 'found', imgMap.get(`found:${r.id}`) || [], { includeEmbeddingVector })
    ),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/**
 * Recomputes Multimodal AI matches (TF-IDF + Sentence-BERT + CLIP ViT-B/32 Image + Context)
 * across active lost & found items and stores them in `ai_matches`.
 */
export function syncAiMatches(db, { triggeredByItemId = null, notify = false } = {}) {
  const cfg = getMatchingConfig(db);
  const allItems = getAllUnifiedItems(db, { includeEmbeddingVector: true });
  const lostItems = allItems.filter((i) => i.type === 'lost');
  const foundItems = allItems.filter((i) => i.type === 'found');

  if (lostItems.length === 0 || foundItems.length === 0) return [];

  const corpusModel = buildCorpusModel(allItems);
  const now = new Date().toISOString();

  // Preserve existing user feedback status on matches
  const existingRows = db.prepare('SELECT id, status FROM ai_matches').all();
  const feedbackStatusMap = new Map(existingRows.map((r) => [r.id, r.status]));

  const upsertStmt = db.prepare(`
    INSERT INTO ai_matches (
      id, lost_item_id, found_item_id,
      tfidf_score, sbert_score, clip_image_score,
      category_score, location_score, date_score, contextual_score,
      final_score, confidence_label, matching_explanation,
      matching_reasons, matched_terms, matched_concepts,
      shared_attributes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lost_item_id, found_item_id) DO UPDATE SET
      tfidf_score = excluded.tfidf_score,
      sbert_score = excluded.sbert_score,
      clip_image_score = excluded.clip_image_score,
      category_score = excluded.category_score,
      location_score = excluded.location_score,
      date_score = excluded.date_score,
      contextual_score = excluded.contextual_score,
      final_score = excluded.final_score,
      confidence_label = excluded.confidence_label,
      matching_explanation = excluded.matching_explanation,
      matching_reasons = excluded.matching_reasons,
      matched_terms = excluded.matched_terms,
      matched_concepts = excluded.matched_concepts,
      shared_attributes = excluded.shared_attributes,
      status = excluded.status,
      updated_at = excluded.updated_at
  `);

  const newMatchesForTrigger = [];

  lostItems.forEach((lost) => {
    const lostInactive = lost.status === 'Closed' || lost.status === 'Resolved';
    let bestScoreForLost = 0;

    foundItems.forEach((found) => {
      const foundInactive = found.status === 'Closed' || found.status === 'Returned';
      const matchId = `match-${lost.id}-${found.id}`;

      const sim = computePairSimilarity(lost, found, corpusModel, {
        algorithm: cfg.defaultAlgorithm || 'sbert',
        textWeight: cfg.textWeight,
        contextWeight: cfg.contextWeight,
        sbertWeight: cfg.sbertWeight,
        tfidfWeight: cfg.tfidfWeight,
        clipWeight: cfg.clipWeight,
        categoryWeight: cfg.categoryWeight,
        locationWeight: cfg.locationWeight,
        dateWeight: cfg.dateWeight,
      });

      if (sim.score < cfg.threshold && !feedbackStatusMap.has(matchId)) {
        return;
      }

      let status = feedbackStatusMap.get(matchId) || 'active';
      if (lostInactive || foundInactive) {
        status = 'invalidated';
      } else if (status === 'invalidated') {
        status = 'active';
      }

      if (!lostInactive && !foundInactive && sim.score >= cfg.threshold) {
        if (sim.score > bestScoreForLost) bestScoreForLost = sim.score;
      }

      upsertStmt.run(
        matchId,
        lost.id,
        found.id,
        sim.tfidfCosine,
        sim.sbertSimilarity,
        sim.clipImageScore,
        sim.categoryScore,
        sim.locationScore,
        sim.dateScore,
        sim.contextualScore,
        sim.score,
        sim.strengthLabel,
        sim.matchingExplanation || '',
        JSON.stringify(sim.matchingReasons),
        JSON.stringify(sim.matchedTerms),
        JSON.stringify(sim.matchedConcepts),
        JSON.stringify(sim.sharedAttributes),
        status,
        now,
        now
      );

      if (
        triggeredByItemId &&
        (lost.id === triggeredByItemId || found.id === triggeredByItemId) &&
        !lostInactive &&
        !foundInactive &&
        sim.score >= cfg.notifyThreshold
      ) {
        newMatchesForTrigger.push({
          matchId,
          lost,
          found,
          score: sim.score,
          clipImageScore: sim.clipImageScore,
          strengthLabel: sim.strengthLabel,
        });
      }
    });

    // Automatically promote Active lost report to 'Potential Match Found' when a strong match exists
    if (lost.status === 'Active' && bestScoreForLost >= cfg.notifyThreshold) {
      db.prepare('UPDATE lost_items SET status = ?, updated_at = ? WHERE id = ?').run(
        'Potential Match Found',
        now,
        lost.id
      );
    }
  });

  if (notify && newMatchesForTrigger.length > 0) {
    newMatchesForTrigger
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .forEach((m) => {
        createNotification(db, {
          userId: m.lost.userId,
          type: 'match',
          title: `Potential AI Match Found (${Math.round(m.score * 100)}%)`,
          message: `Multimodal AI matching identified "${m.found.title}" at ${m.found.location} as a ${m.strengthLabel.toLowerCase()} for your lost report "${m.lost.title}".`,
          link: `/matches/${m.lost.id}`,
        });
        if (m.found.userId !== m.lost.userId) {
          createNotification(db, {
            userId: m.found.userId,
            type: 'match',
            title: 'Your Found Report Matched a Lost Item',
            message: `"${m.found.title}" matched a campus lost report (${Math.round(m.score * 100)}% multimodal similarity).`,
            link: `/matches/${m.found.id}`,
          });
        }
      });
  }

  return newMatchesForTrigger;
}

/**
 * Ensures all seeded or existing items with photographs have cached 512-d CLIP embeddings
 * in `item_images` and up-to-date multimodal scores in `ai_matches`.
 */
function ensureImageEmbeddingsAndMultimodalMatches(db) {
  // Ensure seeded faculty account (u3) has a lost item report and notifications for complete faculty dashboard telemetry
  const u3Exists = db.prepare('SELECT id FROM users WHERE id = ?').get('u3');
  if (u3Exists) {
    const u3LostCount = db.prepare('SELECT COUNT(*) as c FROM lost_items WHERE user_id = ?').get('u3').c;
    if (u3LostCount === 0) {
      const now = '2026-11-20T09:15:00Z';
      db.prepare(`
        INSERT OR IGNORE INTO lost_items (
          id, report_code, user_id, title, category_id, description, color, brand,
          lost_date, lost_time, location, distinguishing_features, additional_info, photo, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'item-fac-lost-1',
        'LST-2026-0199',
        'u3',
        'Faculty Cabin & Locker Key Ring with Tan Leather Tag',
        'key',
        'Misplaced a silver key ring holding one cabin door key and two smaller departmental locker keys attached to a stitched tan leather tag near the Parking Area.',
        'Silver / Tan',
        'Europa',
        '2026-11-20',
        '08:00',
        'Parking Area',
        'Three keys (1 large cabin key, 2 small locker keys) on stitched tan leather tag',
        'Reported by Dr. Priyabrata Mohanty (Dept. of CSE)',
        '/images/keys.jpg',
        'Potential Match Found',
        now,
        now
      );
      db.prepare(`
        INSERT OR IGNORE INTO item_images (id, item_type, item_id, image_url, file_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('img-item-fac-lost-1', 'lost', 'item-fac-lost-1', '/images/keys.jpg', 'keys.jpg', now);
    }

    const u3ClaimCount = db.prepare('SELECT COUNT(*) as c FROM claims WHERE claimant_id = ?').get('u3').c;
    if (u3ClaimCount === 0) {
      const now = '2026-11-20T14:20:00Z';
      db.prepare(`
        INSERT OR IGNORE INTO claims (
          id, claim_code, found_item_id, lost_item_id, claimant_id, claimant_name,
          identification_details, unique_features, purchase_date, supporting_info,
          proof_photo, claim_reason, contact, status, admin_reason, reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'claim-fac-1',
        'CLM-2026-0399',
        'item-6',
        'item-fac-lost-1',
        'u3',
        'Dr. Priyabrata Mohanty',
        'Europa silver key ring holding CSE Cabin 204 key and two departmental locker keys on a stitched tan leather tag.',
        'Engraved tag code CSE-204 on the main key collar.',
        '2024-07-15',
        'Issued by CSE Departmental Office, OUTR.',
        '/images/keys.jpg',
        'Lost near the faculty bicycle/parking stand on Nov 20 morning.',
        'faculty@university.edu',
        'Approved',
        'Verified Faculty ID FAC-204 and CSE-204 key code against departmental register.',
        'admin1',
        '2026-11-21T10:30:00Z',
        now,
        '2026-11-21T10:30:00Z'
      );
      db.prepare(`
        INSERT OR IGNORE INTO handover_records (
          id, handover_code, claim_id, found_item_id, owner_id, owner_name,
          approved_date, handover_location, scheduled_date, scheduled_time, completed_date,
          receiver_id_type, receiver_id_number, verification_qr_token, admin_remarks, recorded_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'ho-fac-1',
        'HND-2026-0499',
        'claim-fac-1',
        'item-6',
        'u3',
        'Dr. Priyabrata Mohanty',
        '2026-11-21',
        'Student Services Office, OUTR, Bhubaneswar',
        '2026-11-25',
        '11:30',
        null,
        'Faculty ID',
        'FAC-204',
        'QR-OUTR-HND-0499-FAC204',
        'Faculty ownership verified; scheduled for pickup at Student Services counter.',
        'OUTR Campus Administrator',
        'Scheduled',
        '2026-11-21T10:35:00Z',
        '2026-11-21T10:35:00Z'
      );
    }

    const u3NotifCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?').get('u3').c;
    if (u3NotifCount === 0) {
      createNotification(db, {
        userId: 'u3',
        type: 'match',
        title: 'Multimodal AI Match Identified (92% Confidence)',
        message: 'Sentence-BERT + CLIP ViT-B/32 matched your lost "Faculty Cabin & Locker Key Ring" with a found key ring report at Parking Area.',
        link: '/faculty/ai-matches',
      });
      createNotification(db, {
        userId: 'u3',
        type: 'claim_submitted',
        title: 'Claim Submitted on Your Found Report (FND-2026-0202)',
        message: 'Student Shyam Sundar Soren submitted ownership claim CLM-2026-0302 for "Android Phone Left on Cafeteria Table".',
        link: '/faculty/claims',
      });
      createNotification(db, {
        userId: 'u3',
        type: 'announcement',
        title: 'Faculty Portal & Department Oversight Active',
        message: 'You can track lost/found items across the Computer Science & Engineering department and review multimodal AI matches.',
        link: '/faculty/dashboard',
      });
    }
  }

  // Ensure any phone item pointing to missing upload or black mobile has the dedicated /images/mobile-black.jpg photo
  db.prepare(`
    UPDATE lost_items
    SET photo = '/images/mobile-black.jpg'
    WHERE id = 'item-1795408914209' OR (category_id = 'phone' AND (photo IS NULL OR photo = '' OR photo LIKE '%bcc43bf4b435eb1e79b0%'))
  `).run();
  db.prepare(`
    UPDATE item_images
    SET image_url = '/images/mobile-black.jpg', image_path = '/images/mobile-black.jpg', file_name = 'mobile-black.jpg', embedding_json = NULL, image_embedding_reference = ''
    WHERE item_id = 'item-1795408914209' OR image_url LIKE '%bcc43bf4b435eb1e79b0%'
  `).run();

  const missingEmbRows = db
    .prepare("SELECT * FROM item_images WHERE embedding_json IS NULL OR image_embedding_reference = ''")
    .all();

  if (missingEmbRows.length > 0) {
    missingEmbRows.forEach((imgRow) => {
      const table = imgRow.item_type === 'lost' ? 'lost_items' : 'found_items';
      const itemRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(imgRow.item_id);
      const visualContext = itemRow
        ? `${itemRow.category_id} ${itemRow.color || ''} ${itemRow.brand || ''} ${itemRow.title} ${itemRow.description}`
        : '';
      const photoPath = imgRow.image_path || imgRow.image_url;
      const resolved = resolveImageBufferAndPath(photoPath, {
        persistUpload: false,
        itemHint: visualContext,
      });
      if (resolved) {
        const clipEmb = computeClipImageEmbedding(resolved.buffer, {
          hash: resolved.hash,
          visualContext: `${resolved.publicPath} ${visualContext}`,
        });
        db.prepare(`
          UPDATE item_images
          SET image_path = ?, image_embedding_reference = ?, embedding_json = ?, uploaded_at = COALESCE(NULLIF(uploaded_at, ''), created_at)
          WHERE id = ?
        `).run(
          resolved.publicPath,
          clipEmb.embeddingReference,
          JSON.stringify(clipEmb.vector),
          imgRow.id
        );
      }
    });
    syncAiMatches(db, { notify: false });
  } else {
    const missingClipScore = db
      .prepare("SELECT COUNT(*) as c FROM ai_matches WHERE matching_explanation = ''")
      .get().c;
    if (missingClipScore > 0) {
      syncAiMatches(db, { notify: false });
    }
  }
}

function seedDatabaseIfNeeded(db) {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return;

  const now = '2026-11-18T10:00:00Z';

  // 1. Seed default matching configuration
  const cfgStmt = db.prepare('INSERT INTO matching_config (key, value, updated_at) VALUES (?, ?, ?)');
  cfgStmt.run('threshold', '0.30', now);
  cfgStmt.run('notifyThreshold', '0.45', now);
  cfgStmt.run('textWeight', '0.65', now);
  cfgStmt.run('contextWeight', '0.35', now);
  cfgStmt.run('defaultAlgorithm', 'sbert', now);

  // 2. Seed users (Student, Faculty, Staff, Admin) with hashed passwords
  const userStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, identifier, department, course, semester, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  userStmt.run('u1', 'Satyaprakash Naik', 'satya@university.edu', hashPassword('student123'), 'student', '23110307', 'Computer Science & Engineering', 'B.Tech', '7th Semester', '9861002307', now, now);
  userStmt.run('u2', 'Shyam Sundar Soren', 'shyam@university.edu', hashPassword('student123'), 'student', '2311030', 'Computer Science & Engineering', 'B.Tech', '7th Semester', '9861002330', now, now);
  userStmt.run('u3', 'Dr. Priyabrata Mohanty', 'faculty@university.edu', hashPassword('faculty123'), 'faculty', 'FAC-204', 'Computer Science & Engineering', 'B.Tech / M.Tech', 'Faculty', '9437001122', now, now);
  userStmt.run('u4', 'Ramesh Chandra Behera', 'staff@university.edu', hashPassword('staff123'), 'staff', 'STF-104', 'Academic & Library Services', 'Administration', 'Staff', '9437003344', now, now);
  userStmt.run('admin1', 'OUTR Campus Administrator', 'admin@university.edu', hashPassword('admin123'), 'admin', 'ADM-001', 'Student Services Office', 'Administration', 'Admin', '0674-2386075', now, now);

  // 3. Seed Categories
  const categories = [
    ['id-card', 'ID Cards & Wallets', 'University ID cards, ATM/debit cards, wallets, purses, and lanyards'],
    ['phone', 'Phones & Electronics', 'Smartphones, tablets, calculators, chargers, and power banks'],
    ['book', 'Books & Notes', 'Textbooks, reference manuals, notebooks, and lab records'],
    ['key', 'Keys & Access Tags', 'Hostel room keys, locker keys, vehicle keyrings, and key fobs'],
    ['bag', 'Bags & Backpacks', 'Laptop backpacks, tote bags, pouches, and luggage'],
    ['other', 'Earbuds, Bottles & Others', 'Wireless earbuds, water bottles, watches, spectacles, and umbrellas'],
  ];
  const catStmt = db.prepare('INSERT INTO categories (id, label, description, created_at) VALUES (?, ?, ?, ?)');
  categories.forEach(([id, label, desc]) => catStmt.run(id, label, desc, now));

  // 4. Seed Configurable Campus Locations
  const locations = [
    ['loc-1', 'Main Library', 'Central Library Building'],
    ['loc-2', 'Central Cafeteria', 'Student Dining & Canteen Block'],
    ['loc-3', 'Computer Lab', 'CSE & IT Lab Complex'],
    ['loc-4', 'Auditorium', 'Main University Auditorium'],
    ['loc-5', 'Parking Area', 'Two-Wheeler & Main Gate Parking'],
    ['loc-6', 'Student Center', 'Student Activity & Kiosk Center'],
    ['loc-7', 'Academic Block', 'Main Lecture Theatre Block'],
    ['loc-8', 'Administrative Building', 'Student Services & Registrar Office'],
    ['loc-9', 'Department Building', 'Engineering Departmental Block'],
    ['loc-10', 'Hostel Block', 'Campus Residential Hostels'],
    ['loc-11', 'Playground', 'University Sports Complex & Ground'],
    ['loc-12', 'Other', 'Other Campus Area'],
  ];
  const locStmt = db.prepare('INSERT INTO campus_locations (id, name, building, created_at) VALUES (?, ?, ?, ?)');
  locations.forEach(([id, name, building]) => locStmt.run(id, name, building, now));

  // 5. Seed Lost Items
  const lostStmt = db.prepare(`
    INSERT INTO lost_items (
      id, report_code, user_id, title, category_id, description, color, brand,
      lost_date, lost_time, location, distinguishing_features, additional_info, photo, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const lostSeeds = [
    [
      'item-1', 'LST-2026-0101', 'u1',
      'University Student Identity Card (Blue Lanyard)', 'id-card',
      'Misplaced my student ID card near the reading room on the second floor of the Main Library. It is held in a clear sleeve attached to a woven blue lanyard.',
      'Blue', 'OUTR Institutional', '2026-11-18', '14:30', 'Main Library',
      'Clear plastic sleeve with woven blue OUTR lanyard and brass clip', 'Lost after afternoon study hour',
      '/images/id-card.jpg', 'Potential Match Found', '2026-11-18T14:30:00Z', '2026-11-18T16:10:00Z',
    ],
    [
      'item-3', 'LST-2026-0102', 'u2',
      'Matte Black Smartphone in Navy Silicone Case', 'phone',
      'Left my black Android smartphone on a corner table in the Central Cafeteria after lunch. The phone has a navy blue matte silicone case and a small scuff near the camera rim.',
      'Black / Navy Blue', 'Samsung Galaxy', '2026-11-17', '12:45', 'Central Cafeteria',
      'Navy blue matte silicone cover, slight scuff near top camera ring', 'Screen lock wallpaper shows a mountain landscape',
      '/images/phone.jpg', 'Potential Match Found', '2026-11-17T12:45:00Z', '2026-11-17T13:40:00Z',
    ],
    [
      'item-5', 'LST-2026-0103', 'u1',
      'Introduction to Algorithms Textbook (CLRS)', 'book',
      'Forgot my paperback algorithms reference book in the Computer Lab after the afternoon session. It has pastel index tabs on chapters 6 and 15 and light pencil notes on the flyleaf.',
      'White / Multicolor', 'MIT Press (CLRS)', '2026-11-19', '10:15', 'Computer Lab',
      'Pastel sticky index tabs on chapters 6 and 15, pencil notes inside front flyleaf', '3rd Edition paperback',
      '/images/book.jpg', 'Potential Match Found', '2026-11-19T10:15:00Z', '2026-11-19T15:10:00Z',
    ],
    [
      'item-7', 'LST-2026-0104', 'u2',
      'Charcoal Grey Laptop Backpack', 'bag',
      'Left a charcoal grey canvas laptop backpack in row G of the Auditorium after the seminar. Contains a steel water bottle, a lined notebook, and a pen pouch.',
      'Charcoal Grey', 'Wildcraft', '2026-11-16', '17:00', 'Auditorium',
      'Stitched initials inside front zip pocket; holds brushed steel water flask', 'Handed back after verification',
      '/images/backpack.jpg', 'Resolved', '2026-11-16T17:00:00Z', '2026-11-17T11:30:00Z',
    ],
    [
      'item-9', 'LST-2026-0105', 'u1',
      'Compact White Wireless Earbuds Charging Case', 'other',
      'Dropped a small pebble-shaped white charging case for wireless earphones near the notice kiosk in the Student Center. Left earbud was inside the case.',
      'Matte White', 'boAt Airdopes', '2026-11-21', '11:00', 'Student Center',
      'Small scuff on the hinge; left earbud inside the charging dock', 'Reward of gratitude upon return',
      '/images/earbuds.jpg', 'Active', '2026-11-21T11:00:00Z', '2026-11-21T11:00:00Z',
    ],
  ];
  lostSeeds.forEach((args) => lostStmt.run(...args));

  // 6. Seed Found Items
  const foundStmt = db.prepare(`
    INSERT INTO found_items (
      id, report_code, user_id, title, category_id, description, color, brand,
      found_date, found_time, location, distinguishing_features, additional_notes, photo, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const foundSeeds = [
    [
      'item-2', 'FND-2026-0201', 'u4',
      'Student ID Card Found Outside Library Entrance', 'id-card',
      'Found a university student ID card in a transparent holder with a blue strap on the stone bench just outside the Main Library steps. Deposited safely for claim verification.',
      'Blue', 'OUTR Institutional', '2026-11-18', '16:00', 'Main Library',
      'Transparent badge sleeve with blue strap found on stone bench', 'Kept at Library circulation desk / Student Services',
      '/images/id-card.jpg', 'Verified', '2026-11-18T16:00:00Z', '2026-11-19T10:00:00Z',
    ],
    [
      'item-4', 'FND-2026-0202', 'u3',
      'Android Phone Left on Cafeteria Table', 'phone',
      'Picked up a locked black smartphone inside a dark blue soft cover near the north window of the Central Cafeteria. Handed over to the campus lost-and-found desk.',
      'Black / Dark Blue', 'Samsung', '2026-11-17', '13:30', 'Central Cafeteria',
      'Dark blue soft silicone cover, locked screen', 'Deposited at Student Services Office',
      '/images/phone.jpg', 'Claim Pending', '2026-11-17T13:30:00Z', '2026-11-18T09:15:00Z',
    ],
    [
      'item-6', 'FND-2026-0203', 'u4',
      'Key Ring with Three Keys & Leather Tag', 'key',
      'Found a silver key ring holding one hostel room key and two smaller locker keys with a tan leather tag near the bicycle stand at the Parking Area.',
      'Silver / Tan', 'Europa', '2026-11-20', '08:20', 'Parking Area',
      'Three keys (1 large room key, 2 small locker keys) on stitched tan leather tag', 'Available at security desk',
      '/images/keys.jpg', 'Active', '2026-11-20T08:20:00Z', '2026-11-20T08:20:00Z',
    ],
    [
      'item-8', 'FND-2026-0204', 'u1',
      'Grey Canvas Backpack Found in Auditorium', 'bag',
      'Found a dark grey laptop backpack under a seat in the Auditorium following the evening talk. Holds a metal water flask and stationery.',
      'Dark Grey', 'Wildcraft', '2026-11-16', '18:30', 'Auditorium',
      'Dark grey canvas bag containing metal water flask and spiral notebook', 'Handed over to Student Services Office',
      '/images/backpack.jpg', 'Returned', '2026-11-16T18:30:00Z', '2026-11-17T11:30:00Z',
    ],
    [
      'item-10', 'FND-2026-0205', 'u3',
      'Algorithms Textbook Left on Lab Workstation', 'book',
      'Found an Introduction to Algorithms textbook with colored page tabs on workstation 14 in the Computer Lab at the end of the lab hour.',
      'White / Multicolor', 'MIT Press (CLRS)', '2026-11-19', '15:00', 'Computer Lab',
      'Colored sticky page tabs attached to chapters, found at workstation 14', 'With Lab In-Charge',
      '/images/book.jpg', 'Active', '2026-11-19T15:00:00Z', '2026-11-19T15:00:00Z',
    ],
  ];
  foundSeeds.forEach((args) => foundStmt.run(...args));

  // 7. Seed item_images
  const imgStmt = db.prepare('INSERT INTO item_images (id, item_type, item_id, image_url, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  lostSeeds.forEach((l) => imgStmt.run(`img-${l[0]}`, 'lost', l[0], l[13], path.basename(l[13]), l[15]));
  foundSeeds.forEach((f) => imgStmt.run(`img-${f[0]}`, 'found', f[0], f[13], path.basename(f[13]), f[15]));

  // 8. Compute & store initial AI Matches
  syncAiMatches(db, { notify: false });

  // 9. Seed Claims
  const claimStmt = db.prepare(`
    INSERT INTO claims (
      id, claim_code, found_item_id, lost_item_id, claimant_id, claimant_name,
      identification_details, unique_features, purchase_date, supporting_info,
      proof_photo, claim_reason, contact, status, admin_reason, reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  claimStmt.run(
    'claim-1', 'CLM-2026-0301', 'item-2', 'item-1', 'u1', 'Satyaprakash Naik',
    'Student ID number ends in 0307 with name Satyaprakash Naik (7th Semester CSE).',
    'Blue woven OUTR lanyard has a small brass lobster clasp and clear badge holder.',
    '2023-08-10', 'Issued by OUTR academic section during B.Tech admission.',
    null, 'This is my official university identity card lost outside the Main Library.',
    'satya@university.edu', 'Approved',
    'Verified student roll number 23110307 and lanyard clasp description against physical card.',
    'admin1', '2026-11-19T10:00:00Z', '2026-11-18T16:30:00Z', '2026-11-19T10:00:00Z'
  );
  claimStmt.run(
    'claim-2', 'CLM-2026-0302', 'item-4', 'item-3', 'u2', 'Shyam Sundar Soren',
    'Black Samsung Galaxy smartphone in a navy blue matte silicone case. Last 4 digits of IMEI are 7842.',
    'Small scuff near the upper camera ring; lock screen displays a mountain landscape photograph.',
    '2025-05-14', 'Can unlock device in person and show invoice box with matching IMEI.',
    null, 'Left on corner table in Central Cafeteria after lunch on Nov 17.',
    'shyam@university.edu', 'Pending',
    '', null, null, '2026-11-18T09:15:00Z', '2026-11-18T09:15:00Z'
  );
  claimStmt.run(
    'claim-3', 'CLM-2026-0303', 'item-8', 'item-7', 'u2', 'Shyam Sundar Soren',
    'Charcoal grey Wildcraft laptop backpack containing a brushed steel water bottle and spiral notebook.',
    'Initials S.S.S stitched inside the front zipper compartment.',
    '2025-01-20', 'Attended the Auditorium seminar in row G on Nov 16.',
    null, 'Forgot backpack under seat in row G of the Auditorium after seminar.',
    'shyam@university.edu', 'Approved',
    'Verified embroidered initials S.S.S and contents in person.',
    'admin1', '2026-11-17T10:00:00Z', '2026-11-17T08:00:00Z', '2026-11-17T11:30:00Z'
  );

  // 10. Seed Handover Records (1 Scheduled for claim-1, 1 Completed for claim-3)
  const hoStmt = db.prepare(`
    INSERT INTO handover_records (
      id, handover_code, claim_id, found_item_id, owner_id, owner_name,
      approved_date, handover_location, scheduled_date, scheduled_time, completed_date,
      receiver_id_type, receiver_id_number, verification_qr_token, admin_remarks, recorded_by, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  hoStmt.run(
    'ho-1', 'HND-2026-0401', 'claim-1', 'item-2', 'u1', 'Satyaprakash Naik',
    '2026-11-19', 'Student Services Office, OUTR, Bhubaneswar', '2026-11-24', '11:00', null,
    'Student ID', '23110307', 'QR-OUTR-HND-0401-9A2F',
    'Claim approved; student scheduled to collect ID card from Student Services counter.',
    'OUTR Campus Administrator', 'Scheduled', '2026-11-19T10:05:00Z', '2026-11-19T10:05:00Z'
  );
  hoStmt.run(
    'ho-2', 'HND-2026-0402', 'claim-3', 'item-8', 'u2', 'Shyam Sundar Soren',
    '2026-11-17', 'Student Services Office, OUTR, Bhubaneswar', '2026-11-17', '11:30', '2026-11-17',
    'Student ID', '2311030', 'QR-OUTR-HND-0402-7C8E',
    'Verified contents and student ID in person. Item handed over and logged.',
    'OUTR Campus Administrator', 'Completed', '2026-11-17T10:15:00Z', '2026-11-17T11:30:00Z'
  );

  // 11. Seed Notifications
  createNotification(db, {
    userId: 'u1',
    type: 'match',
    title: 'High-Confidence AI Match Found',
    message: 'Sentence-BERT matched your lost "University Student Identity Card" with a found report at Main Library.',
    link: '/matches/item-1',
  });
  createNotification(db, {
    userId: 'u1',
    type: 'claim_approved',
    title: 'Ownership Claim Approved (CLM-2026-0301)',
    message: 'Your claim for "Student ID Card Found Outside Library Entrance" is approved. Handover is scheduled at Student Services Office.',
    link: '/claims/claim-1',
  });
  createNotification(db, {
    userId: 'u2',
    type: 'claim_submitted',
    title: 'Claim Under Administrative Review (CLM-2026-0302)',
    message: 'Your ownership claim for "Android Phone Left on Cafeteria Table" is queued for verification.',
    link: '/claims/claim-2',
  });
  createNotification(db, {
    userId: 'admin1',
    type: 'admin_claim',
    title: 'Pending Ownership Claim Requires Review',
    message: 'Shyam Sundar Soren submitted claim CLM-2026-0302 for "Android Phone Left on Cafeteria Table".',
    link: '/admin',
  });

  // 12. Seed Audit Logs
  logAudit(db, {
    actorId: 'admin1',
    actorName: 'OUTR Campus Administrator',
    actorRole: 'admin',
    action: 'CLAIM_APPROVED',
    entityType: 'claim',
    entityId: 'claim-3',
    details: 'Approved claim CLM-2026-0303 for Grey Canvas Backpack after verifying initials S.S.S.',
  });
  logAudit(db, {
    actorId: 'admin1',
    actorName: 'OUTR Campus Administrator',
    actorRole: 'admin',
    action: 'HANDOVER_COMPLETED',
    entityType: 'handover',
    entityId: 'ho-2',
    details: 'Completed handover HND-2026-0402 to Shyam Sundar Soren (Student ID 2311030). Marked item-8 Returned.',
  });
  logAudit(db, {
    actorId: 'admin1',
    actorName: 'OUTR Campus Administrator',
    actorRole: 'admin',
    action: 'CLAIM_APPROVED',
    entityType: 'claim',
    entityId: 'claim-1',
    details: 'Approved claim CLM-2026-0301 for Student ID Card Found Outside Library Entrance and scheduled handover HND-2026-0401.',
  });

  // 13. Seed Manually Labeled Academic Evaluation Dataset (12 realistic campus pairs)
  const evalStmt = db.prepare(`
    INSERT INTO evaluation_dataset (
      id, pair_code, lost_title, lost_description, lost_category, lost_color, lost_brand, lost_location,
      found_title, found_description, found_category, found_color, found_brand, found_location,
      is_ground_truth_match, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const evalPairs = [
    [
      'ev-1', 'EVAL-01',
      'Black Leather Wallet with ATM & College ID',
      'Black leather wallet containing an ATM card and college ID lost near the reading room.',
      'id-card', 'Black', 'Titan', 'Main Library',
      'Dark Black Purse with Identification Cards',
      'Found a dark black purse near the university library with some identification cards and bank debit pass.',
      'id-card', 'Black', 'Unknown', 'Main Library',
      'Paraphrased semantic pair: wallet <-> purse, ATM & college ID <-> identification cards.',
    ],
    [
      'ev-2', 'EVAL-02',
      'University Student Identity Card on Blue Lanyard',
      'Misplaced my student ID card in a clear plastic sleeve attached to a woven blue lanyard.',
      'id-card', 'Blue', 'OUTR', 'Main Library',
      'College Badge Holder with Blue Neck Strap',
      'Found a transparent student badge holder with a blue strap on the stone bench outside library entrance.',
      'id-card', 'Blue', 'OUTR', 'Main Library',
      'Semantic equivalence: ID card/sleeve/lanyard <-> badge holder/neck strap.',
    ],
    [
      'ev-3', 'EVAL-03',
      'Matte Black Android Smartphone in Navy Silicone Case',
      'Left my black Samsung Galaxy mobile phone with a navy blue soft silicone protective case at lunch.',
      'phone', 'Navy Blue', 'Samsung', 'Central Cafeteria',
      'Locked Mobile Handset in Dark Blue Cover',
      'Picked up a locked black cellphone inside a dark blue rubber backcover on a dining table in the canteen.',
      'phone', 'Dark Blue', 'Samsung', 'Central Cafeteria',
      'Semantic equivalence: smartphone/silicone case/cafeteria <-> mobile handset/backcover/canteen.',
    ],
    [
      'ev-4', 'EVAL-04',
      'Introduction to Algorithms Textbook (CLRS)',
      'Forgot my paperback algorithms reference book in the Computer Lab with pastel sticky index tabs on chapters.',
      'book', 'White', 'MIT Press', 'Computer Lab',
      'Algorithms Reference Manual with Colored Bookmarks',
      'Found an algorithms textbook with colored page bookmark tabs on workstation 14 in the laboratory.',
      'book', 'White', 'MIT Press', 'Computer Lab',
      'Shared domain terminology + semantic bookmark/tab equivalence.',
    ],
    [
      'ev-5', 'EVAL-05',
      'Charcoal Grey Laptop Backpack with Steel Water Bottle',
      'Left a charcoal grey canvas laptop rucksack in the auditorium row G containing a steel water bottle and notebook.',
      'bag', 'Charcoal Grey', 'Wildcraft', 'Auditorium',
      'Dark Grey Knapsack with Metal Thermos Flask',
      'Found a dark grey laptop daypack under an auditorium seat holding a metal hydration flask and spiral pad.',
      'bag', 'Dark Grey', 'Wildcraft', 'Auditorium',
      'Semantic paraphrase: backpack/steel water bottle/notebook <-> knapsack/metal thermos flask/spiral pad.',
    ],
    [
      'ev-6', 'EVAL-06',
      'Hostel Room Keyring with Tan Leather Tag',
      'Dropped a silver key ring with one hostel room key and two small locker keys attached to a stitched tan leather fob.',
      'key', 'Silver / Tan', 'Europa', 'Parking Area',
      'Set of Three Keys on Brown Leather Keychain',
      'Found three metal keys for a room and padlock on a camel brown leather keychain near the bicycle stand.',
      'key', 'Brown / Silver', 'Europa', 'Parking Area',
      'Semantic equivalence: keyring/tan tag/locker <-> keychain/camel brown/padlock.',
    ],
    [
      'ev-7', 'EVAL-07',
      'White Wireless Earbuds Charging Case',
      'Lost a compact white pebble-shaped Bluetooth earphone charging pod near the student kiosk.',
      'other', 'White', 'boAt', 'Student Center',
      'Small White Bluetooth Airpods Dock',
      'Picked up a white oval wireless headset charging case with one earbud inside at the student lounge.',
      'other', 'White', 'boAt', 'Student Center',
      'Semantic equivalence: earbuds charging pod <-> wireless headset charging case.',
    ],
    [
      'ev-8', 'EVAL-08',
      'Casio Scientific Calculator FX-991EX',
      'Forgot my black scientific calculator with a slide-on hard cover after the engineering mathematics exam.',
      'phone', 'Black', 'Casio', 'Academic Block',
      'Engineering Calculator Left in Lecture Hall Desk',
      'Found a dark grey Casio scientific calculator with protective shell inside lecture theatre 3.',
      'phone', 'Grey', 'Casio', 'Academic Block',
      'Exact brand & category match with lecture hall / classroom context.',
    ],
    [
      'ev-9', 'EVAL-09',
      'Brushed Steel Insulated Water Bottle',
      'Left my silver stainless steel Milton thermos bottle near the basketball court bench.',
      'other', 'Silver', 'Milton', 'Playground',
      'Metallic Hydration Flask Found at Sports Ground',
      'Found a chrome metal insulated water sipper beside the playground seating area.',
      'other', 'Silver', 'Milton', 'Playground',
      'Paraphrased hydration terms: stainless steel thermos bottle <-> chrome metal insulated sipper.',
    ],
    [
      'ev-10', 'EVAL-10',
      'Black Rectangular Prescription Spectacles',
      'Misplaced my black full-rim eyeglasses inside a brown leatherette hard case in the reading room.',
      'other', 'Black / Brown', 'Titan Eye+', 'Main Library',
      'Eyeglasses in Brown Case on Library Study Table',
      'Found a pair of dark-framed prescription glasses stored in a tan hard shell box on the second floor study desk.',
      'other', 'Black / Tan', 'Titan', 'Main Library',
      'Semantic equivalence: spectacles/leatherette case <-> eyeglasses/tan hard shell.',
    ],
    [
      'ev-11', 'EVAL-11',
      'Spiral Bound Operating Systems Handwritten Notebook',
      'Lost my A4 spiral register containing handwritten OS lecture notes and diagrams in the department corridor.',
      'book', 'Blue', 'Classmate', 'Department Building',
      'Classmate Spiral Diary with Computer Science Notes',
      'Found a blue spiral-bound notebook filled with handwritten lecture notes on processes and memory management.',
      'book', 'Blue', 'Classmate', 'Department Building',
      'Semantic match across notebook/register/diary + course note context.',
    ],
    [
      'ev-12', 'EVAL-12',
      '65W USB-C Laptop Fast Charger & Braided Cable',
      'Forgot my white USB Type-C power adapter brick and braided charging cord plugged into the lab wall socket.',
      'phone', 'White', 'Dell / Anker', 'Computer Lab',
      'White Type-C Power Brick and Cord in Lab',
      'Found a white laptop charging adapter with a USB-C cable near workstation row 3 in the computer laboratory.',
      'phone', 'White', 'Anker', 'Computer Lab',
      'Lexical and semantic alignment on charger/adapter/cable/lab.',
    ],
  ];
  evalPairs.forEach((p) => evalStmt.run(...p, now));
}

export default getDb;
