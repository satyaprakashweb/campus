/**
 * CampusFind Full-Stack REST API Router
 * Connects every frontend feature to the relational SQLite database (backend/db.js).
 * Can be mounted inside Vite's dev/preview server AND standalone Node HTTP server.
 */

import crypto from 'node:crypto';
import {
  getDb,
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  getMatchingConfig,
  logAudit,
  createNotification,
  formatItemRow,
  getAllUnifiedItems,
  syncAiMatches,
  saveItemImagesWithEmbeddings,
  withAiRetry,
} from './db.js';
import { rankMatches, evaluateBenchmarkDataset } from '../src/utils/matcher.js';

const LOST_VALID_STATUSES = ['Active', 'Potential Match Found', 'Resolved', 'Closed'];
const FOUND_VALID_STATUSES = ['Active', 'Claim Pending', 'Verified', 'Returned', 'Closed'];
const HANDOVER_VALID_STATUSES = ['Scheduled', 'Completed', 'Rescheduled', 'Cancelled'];

function sanitizeUser(row) {
  if (!row) return null;
  let notificationPrefs = { inApp: true, emailAlerts: false, matchThreshold: 0.45 };
  try {
    if (row.notification_prefs) notificationPrefs = JSON.parse(row.notification_prefs);
  } catch {
    // keep default
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    identifier: row.identifier,
    department: row.department || '',
    course: row.course || '',
    semester: row.semester || '',
    phone: row.phone || '',
    avatar: row.avatar || null,
    isActive: Boolean(row.is_active),
    notificationPrefs,
    createdAt: row.created_at,
  };
}

function publicReporterMap(db) {
  const rows = db.prepare('SELECT id, name, role, department FROM users').all();
  return new Map(
    rows.map((u) => [
      u.id,
      { id: u.id, name: u.name, role: u.role, department: u.department || '' },
    ])
  );
}

function formatClaimRow(row, db) {
  if (!row) return null;
  const ho = db
    .prepare('SELECT * FROM handover_records WHERE claim_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(row.id);

  return {
    id: row.id,
    claimCode: row.claim_code,
    itemId: row.found_item_id,
    foundItemId: row.found_item_id,
    lostItemId: row.lost_item_id || null,
    claimantId: row.claimant_id,
    claimantName: row.claimant_name,
    identifyingDetails: row.identification_details,
    identificationDetails: row.identification_details,
    uniqueFeatures: row.unique_features || '',
    purchaseDate: row.purchase_date || '',
    supportingInfo: row.supporting_info || '',
    proofPhoto: row.proof_photo || null,
    claimReason: row.claim_reason || '',
    contact: row.contact || '',
    status: row.status,
    adminReason: row.admin_reason || '',
    verifiedBy: row.reviewed_by || null,
    verifiedAt: row.reviewed_at || null,
    submittedAt: row.created_at,
    updatedAt: row.updated_at,
    handover: ho
      ? {
          id: ho.id,
          handoverCode: ho.handover_code,
          claimId: ho.claim_id,
          foundItemId: ho.found_item_id,
          ownerId: ho.owner_id,
          ownerName: ho.owner_name,
          approvedDate: ho.approved_date,
          location: ho.handover_location,
          scheduledDate: ho.scheduled_date,
          date: ho.completed_date || ho.scheduled_date,
          time: ho.scheduled_time,
          completedDate: ho.completed_date,
          receiverIdType: ho.receiver_id_type,
          receiverId: ho.receiver_id_number,
          qrToken: ho.verification_qr_token,
          notes: ho.admin_remarks,
          recordedBy: ho.recorded_by,
          status: ho.status,
        }
      : null,
  };
}

function formatPersistedMatchRow(row, itemMap) {
  const lostItem = itemMap.get(row.lost_item_id);
  const foundItem = itemMap.get(row.found_item_id);
  if (!lostItem || !foundItem) return null;

  const parseJson = (str, fallback = []) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const clipScore =
    row.clip_image_score !== null && row.clip_image_score !== undefined
      ? Number(row.clip_image_score)
      : null;

  return {
    id: row.id,
    lostItemId: row.lost_item_id,
    foundItemId: row.found_item_id,
    lostItem,
    foundItem,
    matchedItem: foundItem,
    score: Number(row.final_score),
    finalScore: Number(row.final_score),
    tfidfCosine: Number(row.tfidf_score),
    sbertSimilarity: Number(row.sbert_score),
    clipImageScore: clipScore,
    categoryScore: Number(row.category_score ?? 0),
    locationScore: Number(row.location_score ?? 0),
    dateScore: Number(row.date_score ?? 0),
    contextualScore: Number(row.contextual_score),
    textScore: Math.round(Number(row.sbert_score) * 100),
    imageScore: clipScore !== null ? Math.round(clipScore * 100) : null,
    metadataScore: Math.round(Number(row.contextual_score) * 100),
    hasVisualMatch: clipScore !== null,
    strengthLabel: row.confidence_label,
    matchingExplanation: row.matching_explanation || '',
    matchingReasons: parseJson(row.matching_reasons),
    matchedTerms: parseJson(row.matched_terms),
    matchedConcepts: parseJson(row.matched_concepts),
    sharedAttributes: parseJson(row.shared_attributes),
    status: row.status,
    method: clipScore !== null
      ? 'Multimodal (SBERT + TF-IDF + CLIP + Context)'
      : 'Sentence-BERT + Contextual Filters',
    algorithm: 'sbert',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAuthenticatedUser(req, db) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const decoded = verifyJwt(token);
  if (!decoded || decoded.expired || !decoded.id) return null;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!row || !row.is_active) return null;
  return sanitizeUser(row);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload exceeds 10 MB limit.'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON request payload.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function validateUniversityEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export async function handleApiRequest(req, res) {
  const db = getDb();
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const currentUser = getAuthenticatedUser(req, db);

  try {
    // =========================================================================
    // 1. AUTHENTICATION & PROFILE ENDPOINTS
    // =========================================================================

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readJsonBody(req);
      const {
        name,
        email,
        password,
        role = 'student',
        identifier,
        department = '',
        course = '',
        semester = '',
        phone = '',
      } = body;

      if (role === 'admin') {
        return sendJson(res, 403, {
          error: 'Users cannot self-register as administrators.',
        });
      }
      if (!['student', 'faculty', 'staff'].includes(role)) {
        return sendJson(res, 400, { error: 'Invalid role selected.' });
      }
      if (!name || !String(name).trim()) {
        return sendJson(res, 400, { error: 'Full name is required.' });
      }
      if (!validateUniversityEmail(email)) {
        return sendJson(res, 400, { error: 'Please enter a valid university email address.' });
      }
      if (!identifier || !String(identifier).trim()) {
        return sendJson(res, 400, { error: 'Student ID or Employee ID is required.' });
      }
      if (!password || String(password).length < 8) {
        return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail);
      if (existing) {
        return sendJson(res, 409, {
          error: 'An account with this university email is already registered.',
        });
      }

      const id = `u-${Date.now()}`;
      const now = new Date().toISOString();
      const pwHash = hashPassword(password);

      db.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, role, identifier, department, course, semester, phone, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        name.trim(),
        normalizedEmail,
        pwHash,
        role,
        String(identifier).trim(),
        String(department).trim(),
        String(course).trim(),
        String(semester).trim(),
        String(phone).trim(),
        now,
        now
      );

      createNotification(db, {
        userId: id,
        type: 'welcome',
        title: 'Welcome to CampusFind Portal',
        message: 'Your campus account is active. You can now report lost or found items and receive automatic AI match alerts.',
        link: '/dashboard',
      });

      logAudit(db, {
        actorId: id,
        actorName: name.trim(),
        actorRole: role,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: id,
        details: `Registered ${role} account (${normalizedEmail}, ID: ${identifier}).`,
      });

      const createdRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      const user = sanitizeUser(createdRow);
      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      return sendJson(res, 201, { user, token });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJsonBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);

      if (!row || !verifyPassword(password, row.password_hash)) {
        return sendJson(res, 401, { error: 'Invalid email or password. Please try again.' });
      }
      if (!row.is_active) {
        return sendJson(res, 403, {
          error: 'This account has been deactivated by an administrator.',
        });
      }

      const user = sanitizeUser(row);
      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      logAudit(db, {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: `${user.role} signed in.`,
      });
      return sendJson(res, 200, { user, token });
    }

    if (pathname === '/api/auth/faculty-login' && method === 'POST') {
      const body = await readJsonBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Faculty email and password are required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);

      if (!row || !verifyPassword(password, row.password_hash)) {
        return sendJson(res, 401, { error: 'Invalid faculty credentials. Please verify your email and password.' });
      }
      if (!['faculty', 'staff'].includes(row.role)) {
        return sendJson(res, 403, {
          error: 'Access denied: Only Faculty and Departmental Staff accounts can sign in via the Faculty Portal.',
        });
      }
      if (!row.is_active) {
        return sendJson(res, 403, { error: 'This faculty account is currently deactivated.' });
      }

      const user = sanitizeUser(row);
      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      logAudit(db, {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'FACULTY_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: `Faculty portal login (${user.department || 'Academic Department'}).`,
      });
      return sendJson(res, 200, { user, token });
    }

    if (pathname === '/api/faculty/dashboard' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required to access the Faculty Dashboard.' });
      }
      if (!['faculty', 'staff'].includes(currentUser.role)) {
        return sendJson(res, 403, {
          error: 'Access denied: Faculty role is required to access Faculty Dashboard statistics and records.',
        });
      }

      const reporterMap = publicReporterMap(db);
      const allItems = getAllUnifiedItems(db).map((i) => ({
        ...i,
        reporter: reporterMap.get(i.userId) || null,
      }));
      const itemMap = new Map(allItems.map((i) => [i.id, i]));

      const myItems = allItems.filter((i) => i.userId === currentUser.id);
      const myItemIds = new Set(myItems.map((i) => i.id));
      const deptItems = currentUser.department
        ? allItems.filter((i) => i.reporter?.department === currentUser.department)
        : myItems;

      const allMatchRows = db
        .prepare("SELECT * FROM ai_matches WHERE status != 'invalidated' ORDER BY final_score DESC")
        .all();
      const formattedMatches = allMatchRows
        .map((r) => formatPersistedMatchRow(r, itemMap))
        .filter(Boolean);

      const myMatches = formattedMatches.filter(
        (m) => myItemIds.has(m.lostItemId) || myItemIds.has(m.foundItemId)
      );

      const allClaims = db
        .prepare('SELECT * FROM claims ORDER BY created_at DESC')
        .all()
        .map((r) => formatClaimRow(r, db));
      const myClaims = allClaims.filter(
        (c) =>
          c.claimantId === currentUser.id ||
          myItemIds.has(c.foundItemId) ||
          myItemIds.has(c.lostItemId)
      );

      const myNotifications = db
        .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
        .all(currentUser.id)
        .map((n) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
        }));

      const recoveredRelevant = deptItems.filter(
        (i) => i.status === 'Resolved' || i.status === 'Returned'
      );

      return sendJson(res, 200, {
        faculty: currentUser,
        stats: {
          totalItemsReported: myItems.length,
          lostItemsCount: myItems.filter((i) => i.type === 'lost').length,
          foundItemsCount: myItems.filter((i) => i.type === 'found').length,
          activeAiMatchesCount: myMatches.length,
          pendingClaimsCount: myClaims.filter((c) => c.status === 'Pending').length,
          recoveredItemsCount: recoveredRelevant.length,
          departmentItemsCount: deptItems.length,
        },
        myItems,
        departmentItems: deptItems,
        matches: myMatches,
        claims: myClaims,
        notifications: myNotifications,
      });
    }

    if (pathname === '/api/student/dashboard' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required to access the Student Dashboard.' });
      }
      if (currentUser.role !== 'student') {
        return sendJson(res, 403, {
          error: 'Access denied: Student role is required to access Student Dashboard records.',
        });
      }

      const allItems = getAllUnifiedItems(db);
      const myItems = allItems.filter((i) => i.userId === currentUser.id);
      return sendJson(res, 200, {
        student: currentUser,
        stats: {
          totalItemsReported: myItems.length,
          lostItemsCount: myItems.filter((i) => i.type === 'lost').length,
          foundItemsCount: myItems.filter((i) => i.type === 'found').length,
        },
        myItems,
      });
    }

    if (pathname === '/api/auth/admin-login' && method === 'POST') {
      const body = await readJsonBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Administrator email and password are required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);

      if (!row || row.role !== 'admin' || !verifyPassword(password, row.password_hash)) {
        return sendJson(res, 401, { error: 'Invalid administrator credentials.' });
      }
      if (!row.is_active) {
        return sendJson(res, 403, { error: 'Administrator account is inactive.' });
      }

      const user = sanitizeUser(row);
      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      logAudit(db, {
        actorId: user.id,
        actorName: user.name,
        actorRole: 'admin',
        action: 'ADMIN_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: 'Administrator signed in to control panel.',
      });
      return sendJson(res, 200, { user, token });
    }

    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const body = await readJsonBody(req);
      const { email } = body;
      if (!validateUniversityEmail(email)) {
        return sendJson(res, 400, { error: 'Please enter a valid university email address.' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);
      if (!row) {
        return sendJson(res, 404, { error: 'No campus account found with that email address.' });
      }

      const resetToken = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ?, updated_at = ? WHERE id = ?').run(
        resetToken,
        expires,
        new Date().toISOString(),
        row.id
      );

      createNotification(db, {
        userId: row.id,
        type: 'security',
        title: 'Password Reset Requested',
        message: `A password reset verification code (${resetToken}) was generated for your account.`,
        link: '/profile',
      });

      return sendJson(res, 200, {
        message: 'Verification code generated. Enter the 6-digit code below to set a new password.',
        demoResetToken: resetToken,
        expiresAt: expires,
      });
    }

    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const body = await readJsonBody(req);
      const { email, resetToken, newPassword } = body;
      if (!email || !resetToken || !newPassword) {
        return sendJson(res, 400, { error: 'Email, verification code, and new password are required.' });
      }
      if (String(newPassword).length < 8) {
        return sendJson(res, 400, { error: 'New password must be at least 8 characters long.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);
      if (!row || !row.reset_token || row.reset_token !== String(resetToken).trim()) {
        return sendJson(res, 400, { error: 'Invalid or expired password reset verification code.' });
      }
      if (row.reset_expires && new Date(row.reset_expires) < new Date()) {
        return sendJson(res, 400, { error: 'Verification code has expired. Please request a new one.' });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = ?
        WHERE id = ?
      `).run(hashPassword(newPassword), now, row.id);

      logAudit(db, {
        actorId: row.id,
        actorName: row.name,
        actorRole: row.role,
        action: 'PASSWORD_RESET',
        entityType: 'user',
        entityId: row.id,
        details: 'Password reset completed via verification code.',
      });

      return sendJson(res, 200, { message: 'Password has been reset successfully. You may now sign in.' });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      return sendJson(res, 200, { user: currentUser });
    }

    if (pathname === '/api/auth/profile' && method === 'PATCH') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const body = await readJsonBody(req);
      const {
        name = currentUser.name,
        department = currentUser.department,
        course = currentUser.course,
        semester = currentUser.semester,
        phone = currentUser.phone,
        avatar = currentUser.avatar,
        notificationPrefs = currentUser.notificationPrefs,
      } = body;

      if (!String(name).trim()) {
        return sendJson(res, 400, { error: 'Name cannot be empty.' });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET name = ?, department = ?, course = ?, semester = ?, phone = ?, avatar = ?, notification_prefs = ?, updated_at = ?
        WHERE id = ?
      `).run(
        String(name).trim(),
        String(department).trim(),
        String(course).trim(),
        String(semester).trim(),
        String(phone).trim(),
        avatar || null,
        JSON.stringify(notificationPrefs || { inApp: true, emailAlerts: false }),
        now,
        currentUser.id
      );

      const updated = sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id));
      logAudit(db, {
        actorId: updated.id,
        actorName: updated.name,
        actorRole: updated.role,
        action: 'PROFILE_UPDATED',
        entityType: 'user',
        entityId: updated.id,
        details: 'Updated account profile settings.',
      });
      return sendJson(res, 200, { user: updated });
    }

    if (pathname === '/api/auth/change-password' && method === 'POST') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const body = await readJsonBody(req);
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return sendJson(res, 400, { error: 'Current password and new password are required.' });
      }
      if (String(newPassword).length < 8) {
        return sendJson(res, 400, { error: 'New password must be at least 8 characters long.' });
      }

      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
      if (!verifyPassword(currentPassword, row.password_hash)) {
        return sendJson(res, 401, { error: 'Current password is incorrect.' });
      }

      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
        hashPassword(newPassword),
        new Date().toISOString(),
        currentUser.id
      );

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entityId: currentUser.id,
        details: 'Changed account password.',
      });

      return sendJson(res, 200, { message: 'Password updated successfully.' });
    }

    // =========================================================================
    // 2. BOOTSTRAP & REFERENCE DATA
    // =========================================================================

    if (pathname === '/api/bootstrap' && method === 'GET') {
      const reporterMap = publicReporterMap(db);
      const allItems = getAllUnifiedItems(db).map((item) => ({
        ...item,
        reporter: reporterMap.get(item.userId) || { name: 'Campus Member', role: 'student' },
      }));
      const itemMap = new Map(allItems.map((i) => [i.id, i]));

      const categories = db.prepare('SELECT id, label, description FROM categories ORDER BY rowid ASC').all();
      const locations = db.prepare('SELECT id, name, building FROM campus_locations ORDER BY rowid ASC').all();
      const matchingConfig = getMatchingConfig(db);

      const matchRows = db
        .prepare("SELECT * FROM ai_matches WHERE status != 'invalidated' ORDER BY final_score DESC")
        .all();
      const aiMatches = matchRows.map((r) => formatPersistedMatchRow(r, itemMap)).filter(Boolean);

      let claims = [];
      let notifications = [];
      let handovers = [];
      let users = [];
      let auditLogs = [];

      if (currentUser) {
        const notifRows = db
          .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
          .all(currentUser.id);
        notifications = notifRows.map((n) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
        }));

        if (currentUser.role === 'admin') {
          claims = db
            .prepare('SELECT * FROM claims ORDER BY created_at DESC')
            .all()
            .map((c) => formatClaimRow(c, db));
          handovers = db
            .prepare('SELECT * FROM handover_records ORDER BY created_at DESC')
            .all()
            .map((ho) => ({
              id: ho.id,
              handoverCode: ho.handover_code,
              claimId: ho.claim_id,
              foundItemId: ho.found_item_id,
              ownerId: ho.owner_id,
              ownerName: ho.owner_name,
              approvedDate: ho.approved_date,
              location: ho.handover_location,
              scheduledDate: ho.scheduled_date,
              scheduledTime: ho.scheduled_time,
              completedDate: ho.completed_date,
              receiverIdType: ho.receiver_id_type,
              receiverIdNumber: ho.receiver_id_number,
              qrToken: ho.verification_qr_token,
              adminRemarks: ho.admin_remarks,
              recordedBy: ho.recorded_by,
              status: ho.status,
              createdAt: ho.created_at,
            }));
          users = db
            .prepare('SELECT * FROM users ORDER BY created_at ASC')
            .all()
            .map(sanitizeUser);
          auditLogs = db
            .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
            .all()
            .map((a) => ({
              id: a.id,
              actorId: a.actor_id,
              actorName: a.actor_name,
              actorRole: a.actor_role,
              action: a.action,
              entityType: a.entity_type,
              entityId: a.entity_id,
              details: a.details,
              createdAt: a.created_at,
            }));
        } else {
          // Regular users receive their own claims, and faculty also see claims filed on items they found
          claims = db
            .prepare(`
              SELECT * FROM claims
              WHERE claimant_id = ?
                 OR found_item_id IN (SELECT id FROM found_items WHERE user_id = ?)
              ORDER BY created_at DESC
            `)
            .all(currentUser.id, currentUser.id)
            .map((c) => formatClaimRow(c, db));
          handovers = db
            .prepare('SELECT * FROM handover_records WHERE owner_id = ? ORDER BY created_at DESC')
            .all(currentUser.id)
            .map((ho) => ({
              id: ho.id,
              handoverCode: ho.handover_code,
              claimId: ho.claim_id,
              foundItemId: ho.found_item_id,
              ownerId: ho.owner_id,
              ownerName: ho.owner_name,
              approvedDate: ho.approved_date,
              location: ho.handover_location,
              scheduledDate: ho.scheduled_date,
              scheduledTime: ho.scheduled_time,
              completedDate: ho.completed_date,
              receiverIdType: ho.receiver_id_type,
              receiverIdNumber: ho.receiver_id_number,
              qrToken: ho.verification_qr_token,
              adminRemarks: ho.admin_remarks,
              recordedBy: ho.recorded_by,
              status: ho.status,
              createdAt: ho.created_at,
            }));
          // Public reporter lookup for ItemDetail (only public name/role, no email/phone/ID)
          users = Array.from(reporterMap.values());
        }
      } else {
        users = Array.from(reporterMap.values());
      }

      // Compute summary counts from database tables
      const totalLostReports = db.prepare('SELECT COUNT(*) as c FROM lost_items').get().c;
      const totalFoundReports = db.prepare('SELECT COUNT(*) as c FROM found_items').get().c;
      const lostImageCount = db.prepare("SELECT COUNT(*) as c FROM item_images WHERE item_type = 'lost'").get().c;
      const foundImageCount = db.prepare("SELECT COUNT(*) as c FROM item_images WHERE item_type = 'found'").get().c;

      const stats = {
        totalStudents: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c,
        totalStaff: db.prepare("SELECT COUNT(*) as c FROM users WHERE role IN ('staff', 'faculty')").get().c,
        totalLostReports,
        totalFoundReports,
        totalAiMatches: aiMatches.length,
        totalTextComparisons: totalLostReports * totalFoundReports,
        totalImageComparisons: lostImageCount * foundImageCount,
        potentialVisualMatches: aiMatches.filter((m) => m.clipImageScore !== null && m.clipImageScore >= 0.45).length,
        highRankingMatches: aiMatches.filter((m) => m.score >= 0.70).length,
        pendingClaims: db.prepare("SELECT COUNT(*) as c FROM claims WHERE status IN ('Pending', 'Under Review')").get().c,
        approvedClaims: db.prepare("SELECT COUNT(*) as c FROM claims WHERE status = 'Approved'").get().c,
        returnedItems: db.prepare("SELECT COUNT(*) as c FROM found_items WHERE status = 'Returned'").get().c,
      };

      return sendJson(res, 200, {
        items: allItems,
        categories,
        locations: locations.map((l) => l.name),
        locationObjects: locations,
        matchingConfig,
        aiMatches,
        claims,
        handovers,
        notifications,
        users,
        auditLogs,
        stats,
      });
    }

    // =========================================================================
    // 3. LOST & FOUND ITEM REPORTS
    // =========================================================================

    if (pathname === '/api/items' && method === 'GET') {
      const reporterMap = publicReporterMap(db);
      const items = getAllUnifiedItems(db).map((i) => ({
        ...i,
        reporter: reporterMap.get(i.userId) || { name: 'Campus Member', role: 'student' },
      }));
      return sendJson(res, 200, items);
    }

    if (pathname === '/api/items' && method === 'POST') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Please sign in to submit a lost or found report.' });
      }
      const body = await readJsonBody(req);
      const {
        type = 'lost',
        title,
        category,
        description,
        color = '',
        brand = '',
        date,
        time = '',
        location,
        distinguishingFeatures = '',
        additionalInfo = '',
        photo = null,
        photos = [],
      } = body;

      if (!['lost', 'found'].includes(type)) {
        return sendJson(res, 400, { error: 'Report type must be lost or found.' });
      }
      if (!title || String(title).trim().length < 4) {
        return sendJson(res, 400, { error: 'Item name must be at least 4 characters.' });
      }
      if (!category) {
        return sendJson(res, 400, { error: 'Item category is required.' });
      }
      if (!description || String(description).trim().length < 15) {
        return sendJson(res, 400, { error: 'Detailed description must be at least 15 characters.' });
      }
      if (!location) {
        return sendJson(res, 400, { error: 'Campus location is required.' });
      }
      if (!date) {
        return sendJson(res, 400, { error: 'Date is required.' });
      }

      // Duplicate submission guard (same user, same title & type within 2 minutes)
      const table = type === 'lost' ? 'lost_items' : 'found_items';
      const recentDup = db
        .prepare(`SELECT id, created_at FROM ${table} WHERE user_id = ? AND lower(title) = ? ORDER BY created_at DESC LIMIT 1`)
        .get(currentUser.id, String(title).trim().toLowerCase());

      if (recentDup && Date.now() - new Date(recentDup.created_at).getTime() < 120000) {
        return sendJson(res, 409, {
          error: 'A report with this exact item name was just submitted. Please check My Dashboard.',
        });
      }

      const id = `item-${Date.now()}`;
      const countRow = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
      const seq = String((countRow?.c || 0) + 101).padStart(4, '0');
      const reportCode = `${type === 'lost' ? 'LST' : 'FND'}-2026-${seq}`;
      const now = new Date().toISOString();

      const incomingPhotos = Array.isArray(photos) && photos.length > 0
        ? photos.filter(Boolean)
        : photo
        ? [photo]
        : [];
      const visualContext = `${category} ${color} ${brand} ${title} ${description} ${distinguishingFeatures}`;

      // Process & validate uploaded photographs and generate 512-d CLIP embeddings with retry
      let savedImages = [];
      if (incomingPhotos.length > 0) {
        savedImages = await withAiRetry(() =>
          saveItemImagesWithEmbeddings(db, {
            itemId: id,
            itemType: type,
            photos: incomingPhotos,
            visualContext,
            replaceExisting: true,
          })
        );
      }
      const primarySavedPhoto = savedImages[0]?.imagePath || photo || null;

      if (type === 'lost') {
        db.prepare(`
          INSERT INTO lost_items (
            id, report_code, user_id, title, category_id, description, color, brand,
            lost_date, lost_time, location, distinguishing_features, additional_info, photo, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
        `).run(
          id,
          reportCode,
          currentUser.id,
          String(title).trim(),
          category,
          String(description).trim(),
          String(color).trim(),
          String(brand).trim(),
          date,
          String(time).trim(),
          location,
          String(distinguishingFeatures).trim(),
          String(additionalInfo).trim(),
          primarySavedPhoto,
          now,
          now
        );
      } else {
        db.prepare(`
          INSERT INTO found_items (
            id, report_code, user_id, title, category_id, description, color, brand,
            found_date, found_time, location, distinguishing_features, additional_notes, photo, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
        `).run(
          id,
          reportCode,
          currentUser.id,
          String(title).trim(),
          category,
          String(description).trim(),
          String(color).trim(),
          String(brand).trim(),
          date,
          String(time).trim(),
          location,
          String(distinguishingFeatures).trim(),
          String(additionalInfo).trim(),
          primarySavedPhoto,
          now,
          now
        );
      }

      // Confirmation notification
      createNotification(db, {
        userId: currentUser.id,
        type: 'report_submitted',
        title: `${type === 'lost' ? 'Lost' : 'Found'} Report Submitted (${reportCode})`,
        message: `Your report "${String(title).trim()}" at ${location} is now active. Multimodal AI matching (Text + CLIP Image) has been executed.`,
        link: `/items/${id}`,
      });

      // Trigger Automatic AI Matching & notifications
      const triggeredMatches = syncAiMatches(db, { triggeredByItemId: id, notify: true });

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: `${type.toUpperCase()}_ITEM_REPORTED`,
        entityType: `${type}_item`,
        entityId: id,
        details: `Created ${reportCode} ("${String(title).trim()}" at ${location}, images=${savedImages.length}). AI matches triggered: ${triggeredMatches.length}.`,
      });

      const allItemsWithVecs = getAllUnifiedItems(db, { includeEmbeddingVector: true });
      const formattedWithVec = allItemsWithVecs.find((i) => i.id === id);
      const cfg = getMatchingConfig(db);
      const liveMatches = rankMatches(formattedWithVec, allItemsWithVecs, {
        algorithm: cfg.defaultAlgorithm || 'sbert',
        threshold: cfg.threshold,
        textWeight: cfg.textWeight,
        contextWeight: cfg.contextWeight,
        sbertWeight: cfg.sbertWeight,
        tfidfWeight: cfg.tfidfWeight,
        clipWeight: cfg.clipWeight,
        categoryWeight: cfg.categoryWeight,
        locationWeight: cfg.locationWeight,
        dateWeight: cfg.dateWeight,
      });

      const allItemsClean = getAllUnifiedItems(db);
      const formattedClean = allItemsClean.find((i) => i.id === id);

      return sendJson(res, 201, {
        item: formattedClean,
        matchCount: liveMatches.length,
        matches: liveMatches,
      });
    }

    const itemMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch) {
      const itemId = decodeURIComponent(itemMatch[1]);
      let row = db.prepare('SELECT * FROM lost_items WHERE id = ?').get(itemId);
      let type = 'lost';
      if (!row) {
        row = db.prepare('SELECT * FROM found_items WHERE id = ?').get(itemId);
        type = 'found';
      }
      if (!row) {
        return sendJson(res, 404, { error: 'Item report not found.' });
      }

      if (method === 'GET') {
        const reporterMap = publicReporterMap(db);
        const item = {
          ...formatItemRow(row, type),
          reporter: reporterMap.get(row.user_id) || { name: 'Campus Member', role: 'student' },
        };
        return sendJson(res, 200, item);
      }

      if (method === 'PATCH') {
        if (!currentUser) {
          return sendJson(res, 401, { error: 'Authentication required.' });
        }
        const isOwner = row.user_id === currentUser.id;
        const isAdmin = currentUser.role === 'admin';
        if (!isOwner && !isAdmin) {
          return sendJson(res, 403, { error: 'You are not authorized to modify this report.' });
        }

        const body = await readJsonBody(req);
        const table = type === 'lost' ? 'lost_items' : 'found_items';
        const validStatuses = type === 'lost' ? LOST_VALID_STATUSES : FOUND_VALID_STATUSES;

        let nextStatus = body.status ?? row.status;
        // Map legacy lowercase status strings if passed
        const statusLookup = {
          active: 'Active',
          lost: 'Active',
          found: 'Active',
          matched: type === 'lost' ? 'Potential Match Found' : 'Active',
          'potential match found': 'Potential Match Found',
          'claim-pending': 'Claim Pending',
          'claim pending': 'Claim Pending',
          verified: 'Verified',
          returned: 'Returned',
          resolved: 'Resolved',
          closed: 'Closed',
        };
        if (statusLookup[String(nextStatus).toLowerCase()]) {
          nextStatus = statusLookup[String(nextStatus).toLowerCase()];
        }
        if (!validStatuses.includes(nextStatus)) {
          return sendJson(res, 400, {
            error: `Invalid status "${nextStatus}" for ${type} report. Allowed: ${validStatuses.join(', ')}.`,
          });
        }

        // Prevent non-admin from marking a found item as Verified or Returned directly
        if (!isAdmin && type === 'found' && (nextStatus === 'Verified' || nextStatus === 'Returned')) {
          return sendJson(res, 403, {
            error: 'Only administrators can mark a found item as Verified or Returned.',
          });
        }

        const nextTitle = body.title !== undefined ? String(body.title).trim() : row.title;
        const nextDesc = body.description !== undefined ? String(body.description).trim() : row.description;
        const nextCategory = body.category !== undefined ? body.category : row.category_id;
        const nextColor = body.color !== undefined ? String(body.color).trim() : row.color;
        const nextBrand = body.brand !== undefined ? String(body.brand).trim() : row.brand;
        const nextLocation = body.location !== undefined ? body.location : row.location;
        const nextFeatures =
          body.distinguishingFeatures !== undefined
            ? String(body.distinguishingFeatures).trim()
            : row.distinguishing_features;
        let nextPhoto = body.photo !== undefined ? body.photo : row.photo;
        const now = new Date().toISOString();

        if (body.photos !== undefined || body.photo !== undefined) {
          const incomingPhotos = Array.isArray(body.photos)
            ? body.photos.filter(Boolean)
            : nextPhoto
            ? [nextPhoto]
            : [];
          const visualContext = `${nextCategory} ${nextColor} ${nextBrand} ${nextTitle} ${nextDesc} ${nextFeatures}`;
          const savedImgs = await withAiRetry(() =>
            saveItemImagesWithEmbeddings(db, {
              itemId,
              itemType: type,
              photos: incomingPhotos,
              visualContext,
              replaceExisting: true,
            })
          );
          nextPhoto = savedImgs[0]?.imagePath || null;
        }

        db.prepare(`
          UPDATE ${table}
          SET title = ?, category_id = ?, description = ?, color = ?, brand = ?,
              location = ?, distinguishing_features = ?, photo = ?, status = ?, updated_at = ?
          WHERE id = ?
        `).run(
          nextTitle,
          nextCategory,
          nextDesc,
          nextColor,
          nextBrand,
          nextLocation,
          nextFeatures,
          nextPhoto,
          nextStatus,
          now,
          itemId
        );

        syncAiMatches(db, { notify: false });

        logAudit(db, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'ITEM_UPDATED',
          entityType: `${type}_item`,
          entityId: itemId,
          details: `Updated ${row.report_code} (status: ${nextStatus}).`,
        });

        const updatedItem = getAllUnifiedItems(db).find((i) => i.id === itemId);
        return sendJson(res, 200, { item: updatedItem });
      }

      if (method === 'DELETE') {
        if (!currentUser) {
          return sendJson(res, 401, { error: 'Authentication required.' });
        }
        if (currentUser.role !== 'admin' && row.user_id !== currentUser.id) {
          return sendJson(res, 403, { error: 'Only administrators or the report owner can delete a report.' });
        }
        const table = type === 'lost' ? 'lost_items' : 'found_items';
        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(itemId);
        logAudit(db, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'ITEM_DELETED',
          entityType: `${type}_item`,
          entityId: itemId,
          details: `Deleted report ${row.report_code} ("${row.title}").`,
        });
        return sendJson(res, 200, { deleted: true, id: itemId });
      }
    }

    // =========================================================================
    // 4. AI AUTOMATIC MATCHING, FEEDBACK & EVALUATION
    // =========================================================================

    if (pathname === '/api/match' && method === 'POST') {
      const body = await readJsonBody(req);
      const {
        itemId,
        algorithm = 'sbert',
        categoryMode = 'all',
        locationMode = 'all',
        timeWindowDays = 'any',
      } = body;

      const allItems = getAllUnifiedItems(db, { includeEmbeddingVector: true });
      const target = allItems.find((i) => i.id === itemId);
      if (!target) {
        return sendJson(res, 404, { error: 'Source item report not found.' });
      }
      const cfg = getMatchingConfig(db);
      const ranked = rankMatches(target, allItems, {
        algorithm,
        categoryMode,
        locationMode,
        timeWindowDays,
        threshold: cfg.threshold,
        textWeight: cfg.textWeight,
        contextWeight: cfg.contextWeight,
        sbertWeight: cfg.sbertWeight,
        tfidfWeight: cfg.tfidfWeight,
        clipWeight: cfg.clipWeight,
        categoryWeight: cfg.categoryWeight,
        locationWeight: cfg.locationWeight,
        dateWeight: cfg.dateWeight,
      });

      // Attach any existing user feedback status from ai_matches
      const feedbackRows = db.prepare('SELECT id, status FROM ai_matches').all();
      const statusMap = new Map(feedbackRows.map((r) => [r.id, r.status]));
      const enriched = ranked.map((m) => ({
        ...m,
        status: statusMap.get(`match-${m.lostItemId}-${m.foundItemId}`) || 'active',
      }));

      return sendJson(res, 200, enriched);
    }

    if (pathname === '/api/matches' && method === 'GET') {
      const allItems = getAllUnifiedItems(db);
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      const rows = db
        .prepare("SELECT * FROM ai_matches WHERE status != 'invalidated' ORDER BY final_score DESC")
        .all();
      const matches = rows.map((r) => formatPersistedMatchRow(r, itemMap)).filter(Boolean);
      return sendJson(res, 200, matches);
    }

    const feedbackMatch = pathname.match(/^\/api\/matches\/([^/]+)\/feedback$/);
    if (feedbackMatch && method === 'POST') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Please sign in to record match feedback.' });
      }
      const matchId = decodeURIComponent(feedbackMatch[1]);
      const body = await readJsonBody(req);
      const { feedbackType: rawFbType, comment = '', lostItemId, foundItemId } = body;
      const fbMap = {
        relevant: 'relevant',
        approved: 'relevant',
        not_my_item: 'not_my_item',
        incorrect: 'incorrect',
        rejected: 'incorrect',
        active: 'active',
      };
      const feedbackType = fbMap[String(rawFbType || '').toLowerCase()];
      if (!feedbackType) {
        return sendJson(res, 400, {
          error: 'Feedback type must be relevant, approved, not_my_item, incorrect, or rejected.',
        });
      }

      const canonicalId =
        lostItemId && foundItemId ? `match-${lostItemId}-${foundItemId}` : matchId.replace(/-(sbert|tfidf)$/, '');

      const matchRow = db.prepare('SELECT id FROM ai_matches WHERE id = ?').get(canonicalId);
      if (matchRow) {
        const now = new Date().toISOString();
        db.prepare('UPDATE ai_matches SET status = ?, updated_at = ? WHERE id = ?').run(
          feedbackType,
          now,
          canonicalId
        );
        db.prepare(`
          INSERT INTO match_feedback (id, match_id, user_id, feedback_type, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(`fb-${Date.now()}`, canonicalId, currentUser.id, feedbackType, String(comment).trim(), now);
      }

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'MATCH_FEEDBACK_RECORDED',
        entityType: 'ai_match',
        entityId: canonicalId,
        details: `Marked match ${canonicalId} as "${feedbackType}".`,
      });

      return sendJson(res, 200, { matchId: canonicalId, status: feedbackType });
    }

    if (pathname === '/api/evaluation' && method === 'GET') {
      const pairs = db.prepare('SELECT * FROM evaluation_dataset ORDER BY pair_code ASC').all();
      const evaluation = evaluateBenchmarkDataset(pairs);
      return sendJson(res, 200, { pairs, evaluation });
    }

    // =========================================================================
    // 5. OWNERSHIP CLAIMS & VERIFICATION
    // =========================================================================

    if (pathname === '/api/claims' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const rows =
        currentUser.role === 'admin'
          ? db.prepare('SELECT * FROM claims ORDER BY created_at DESC').all()
          : db
              .prepare('SELECT * FROM claims WHERE claimant_id = ? ORDER BY created_at DESC')
              .all(currentUser.id);

      return sendJson(
        res,
        200,
        rows.map((r) => formatClaimRow(r, db))
      );
    }

    if (pathname === '/api/claims' && method === 'POST') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Please sign in to submit an ownership claim.' });
      }
      const body = await readJsonBody(req);
      const {
        itemId,
        foundItemId = itemId,
        lostItemId = null,
        claimantName = currentUser.name,
        identifyingDetails,
        identificationDetails = identifyingDetails,
        uniqueFeatures = '',
        purchaseDate = '',
        supportingInfo = '',
        proofPhoto = null,
        claimReason = '',
        contact = currentUser.email,
      } = body;

      if (!foundItemId) {
        return sendJson(res, 400, { error: 'Target item ID is required.' });
      }
      if (!identificationDetails || String(identificationDetails).trim().length < 15) {
        return sendJson(res, 400, {
          error: 'Please provide specific identification details (at least 15 characters).',
        });
      }

      // Locate the found item (or if user clicked Claim on a lost item, check if it's found)
      let foundRow = db.prepare('SELECT * FROM found_items WHERE id = ?').get(foundItemId);
      if (!foundRow) {
        return sendJson(res, 400, {
          error: 'Ownership claims can only be submitted for Found item reports.',
        });
      }
      if (foundRow.status === 'Returned' || foundRow.status === 'Closed') {
        return sendJson(res, 409, {
          error: `This item is already marked as ${foundRow.status} and cannot be claimed.`,
        });
      }

      // Prevent duplicate active claim by the same user for the same item
      const dupClaim = db
        .prepare(
          "SELECT id FROM claims WHERE found_item_id = ? AND claimant_id = ? AND status IN ('Pending', 'Under Review', 'Approved')"
        )
        .get(foundItemId, currentUser.id);
      if (dupClaim) {
        return sendJson(res, 409, {
          error: 'You already have an active ownership claim for this item.',
        });
      }

      // Prevent conflicting claims when an item already has an Approved claim
      const approvedConflict = db
        .prepare("SELECT id FROM claims WHERE found_item_id = ? AND status = 'Approved'")
        .get(foundItemId);
      if (approvedConflict) {
        return sendJson(res, 409, {
          error: 'An ownership claim for this item has already been approved and is awaiting handover.',
        });
      }

      const id = `claim-${Date.now()}`;
      const countRow = db.prepare('SELECT COUNT(*) as c FROM claims').get();
      const claimCode = `CLM-2026-${String((countRow?.c || 0) + 301).padStart(4, '0')}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO claims (
          id, claim_code, found_item_id, lost_item_id, claimant_id, claimant_name,
          identification_details, unique_features, purchase_date, supporting_info,
          proof_photo, claim_reason, contact, status, admin_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', ?, ?)
      `).run(
        id,
        claimCode,
        foundItemId,
        lostItemId,
        currentUser.id,
        String(claimantName || currentUser.name).trim(),
        String(identificationDetails).trim(),
        String(uniqueFeatures).trim(),
        String(purchaseDate).trim(),
        String(supportingInfo).trim(),
        proofPhoto || null,
        String(claimReason).trim(),
        String(contact || currentUser.email).trim(),
        now,
        now
      );

      if (foundRow.status === 'Active') {
        db.prepare("UPDATE found_items SET status = 'Claim Pending', updated_at = ? WHERE id = ?").run(
          now,
          foundItemId
        );
      }

      // Notify claimant
      createNotification(db, {
        userId: currentUser.id,
        type: 'claim_submitted',
        title: `Ownership Claim Submitted (${claimCode})`,
        message: `Your claim for "${foundRow.title}" is now Pending administrative verification.`,
        link: `/claims/${id}`,
      });

      // Notify all administrators
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
      admins.forEach((adm) => {
        createNotification(db, {
          userId: adm.id,
          type: 'admin_claim',
          title: `New Ownership Claim (${claimCode})`,
          message: `${currentUser.name} submitted an ownership claim for "${foundRow.title}".`,
          link: '/admin',
        });
      });

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'CLAIM_SUBMITTED',
        entityType: 'claim',
        entityId: id,
        details: `Submitted claim ${claimCode} for found item ${foundRow.report_code} ("${foundRow.title}").`,
      });

      const saved = db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
      return sendJson(res, 201, { claim: formatClaimRow(saved, db) });
    }

    const claimReviewMatch = pathname.match(/^\/api\/claims\/([^/]+)\/review$/);
    if (claimReviewMatch && method === 'PATCH') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Only administrators can review or approve ownership claims.' });
      }
      const claimId = decodeURIComponent(claimReviewMatch[1]);
      const claimRow = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
      if (!claimRow) {
        return sendJson(res, 404, { error: 'Claim record not found.' });
      }
      if (claimRow.claimant_id === currentUser.id) {
        return sendJson(res, 403, { error: 'Users cannot approve their own ownership claims.' });
      }

      const body = await readJsonBody(req);
      const {
        decision,
        adminReason = '',
        handoverLocation = 'Student Services Office, OUTR, Bhubaneswar',
        scheduledDate = new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime = '11:00',
      } = body;

      let nextStatus = 'Under Review';
      if (decision === 'approve' || decision === 'Approved') nextStatus = 'Approved';
      else if (decision === 'reject' || decision === 'Rejected') nextStatus = 'Rejected';
      else if (decision === 'review' || decision === 'Under Review') nextStatus = 'Under Review';
      else {
        return sendJson(res, 400, { error: 'Decision must be approve, reject, or review.' });
      }

      if (nextStatus === 'Rejected' && !String(adminReason).trim()) {
        return sendJson(res, 400, {
          error: 'Please provide an administrative reason when rejecting a claim.',
        });
      }

      const now = new Date().toISOString();
      const foundRow = db.prepare('SELECT * FROM found_items WHERE id = ?').get(claimRow.found_item_id);

      db.prepare(`
        UPDATE claims
        SET status = ?, admin_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        nextStatus,
        String(adminReason).trim() || (nextStatus === 'Approved' ? 'Ownership evidence verified by administrator.' : ''),
        currentUser.name,
        now,
        now,
        claimId
      );

      if (nextStatus === 'Approved') {
        db.prepare("UPDATE found_items SET status = 'Verified', updated_at = ? WHERE id = ?").run(
          now,
          claimRow.found_item_id
        );

        // Reject other conflicting pending claims on this found item
        const otherPending = db
          .prepare(
            "SELECT id, claimant_id, claim_code FROM claims WHERE found_item_id = ? AND id != ? AND status IN ('Pending', 'Under Review')"
          )
          .all(claimRow.found_item_id, claimId);

        otherPending.forEach((oc) => {
          db.prepare(
            "UPDATE claims SET status = 'Rejected', admin_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
          ).run(
            'Another claim with verified ownership evidence was approved for this item.',
            currentUser.name,
            now,
            now,
            oc.id
          );
          createNotification(db, {
            userId: oc.claimant_id,
            type: 'claim_rejected',
            title: `Claim ${oc.claim_code} Not Approved`,
            message: `Another claimant provided conclusive proof of ownership for "${foundRow?.title || 'the item'}".`,
            link: `/claims/${oc.id}`,
          });
        });

        // Automatically schedule handover if not already created
        const existingHo = db.prepare('SELECT id FROM handover_records WHERE claim_id = ?').get(claimId);
        if (!existingHo) {
          const hoCount = db.prepare('SELECT COUNT(*) as c FROM handover_records').get().c;
          const hoCode = `HND-2026-${String(hoCount + 401).padStart(4, '0')}`;
          const qrToken = `QR-OUTR-${hoCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          db.prepare(`
            INSERT INTO handover_records (
              id, handover_code, claim_id, found_item_id, owner_id, owner_name,
              approved_date, handover_location, scheduled_date, scheduled_time,
              verification_qr_token, admin_remarks, recorded_by, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?)
          `).run(
            `ho-${Date.now()}`,
            hoCode,
            claimId,
            claimRow.found_item_id,
            claimRow.claimant_id,
            claimRow.claimant_name,
            now.split('T')[0],
            handoverLocation,
            scheduledDate,
            scheduledTime,
            qrToken,
            String(adminReason).trim() || 'Ownership verified. Bring campus ID for handover.',
            currentUser.name,
            now,
            now
          );
        }

        createNotification(db, {
          userId: claimRow.claimant_id,
          type: 'claim_approved',
          title: `Ownership Claim Approved (${claimRow.claim_code})`,
          message: `Your claim for "${foundRow?.title || 'the item'}" has been approved! Handover is scheduled at ${handoverLocation} on ${scheduledDate}.`,
          link: `/claims/${claimId}`,
        });
      } else if (nextStatus === 'Rejected') {
        const remainingActive = db
          .prepare(
            "SELECT COUNT(*) as c FROM claims WHERE found_item_id = ? AND status IN ('Pending', 'Under Review', 'Approved')"
          )
          .get(claimRow.found_item_id).c;
        if (remainingActive === 0 && foundRow?.status === 'Claim Pending') {
          db.prepare("UPDATE found_items SET status = 'Active', updated_at = ? WHERE id = ?").run(
            now,
            claimRow.found_item_id
          );
        }

        createNotification(db, {
          userId: claimRow.claimant_id,
          type: 'claim_rejected',
          title: `Ownership Claim Update (${claimRow.claim_code})`,
          message: `Your claim for "${foundRow?.title || 'the item'}" was not approved. Reason: ${String(adminReason).trim()}`,
          link: `/claims/${claimId}`,
        });
      }

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: `CLAIM_${nextStatus.toUpperCase().replace(/\s+/g, '_')}`,
        entityType: 'claim',
        entityId: claimId,
        details: `Claim ${claimRow.claim_code} marked ${nextStatus}. Reason: ${String(adminReason).trim() || 'Verified'}.`,
      });

      const updatedClaim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
      return sendJson(res, 200, { claim: formatClaimRow(updatedClaim, db) });
    }

    // =========================================================================
    // 6. ITEM HANDOVER MANAGEMENT
    // =========================================================================

    if (pathname === '/api/handovers/complete' && method === 'POST') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Only administrators can record item handovers.' });
      }
      const body = await readJsonBody(req);
      const {
        itemId,
        claimId = null,
        date = new Date().toISOString().split('T')[0],
        time = '11:00',
        location = 'Student Services Office, OUTR, Bhubaneswar',
        receiverIdType = 'Student ID',
        receiverId = '',
        notes = '',
      } = body;

      if (!itemId) {
        return sendJson(res, 400, { error: 'Item ID is required.' });
      }
      if (!String(receiverId).trim()) {
        return sendJson(res, 400, { error: 'Receiver ID number is required for verification.' });
      }

      const foundRow = db.prepare('SELECT * FROM found_items WHERE id = ?').get(itemId);
      if (!foundRow) {
        return sendJson(res, 404, { error: 'Found item not found.' });
      }

      const now = new Date().toISOString();
      const targetClaim = claimId
        ? db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId)
        : db
            .prepare(
              "SELECT * FROM claims WHERE found_item_id = ? AND status IN ('Approved', 'Pending', 'Under Review') ORDER BY created_at DESC LIMIT 1"
            )
            .get(itemId);

      const ownerId = targetClaim ? targetClaim.claimant_id : foundRow.user_id;
      const ownerName = targetClaim ? targetClaim.claimant_name : 'Verified Campus Owner';

      if (targetClaim) {
        db.prepare(
          "UPDATE claims SET status = 'Approved', reviewed_by = COALESCE(reviewed_by, ?), reviewed_at = COALESCE(reviewed_at, ?), updated_at = ? WHERE id = ?"
        ).run(currentUser.name, now, now, targetClaim.id);

        const existingHo = db
          .prepare('SELECT * FROM handover_records WHERE claim_id = ?')
          .get(targetClaim.id);

        if (existingHo) {
          db.prepare(`
            UPDATE handover_records
            SET handover_location = ?, scheduled_date = ?, scheduled_time = ?, completed_date = ?,
                receiver_id_type = ?, receiver_id_number = ?, admin_remarks = ?, recorded_by = ?,
                status = 'Completed', updated_at = ?
            WHERE id = ?
          `).run(
            location,
            date,
            time,
            date,
            receiverIdType,
            String(receiverId).trim(),
            String(notes).trim(),
            currentUser.name,
            now,
            existingHo.id
          );
        } else {
          const hoCount = db.prepare('SELECT COUNT(*) as c FROM handover_records').get().c;
          const hoCode = `HND-2026-${String(hoCount + 401).padStart(4, '0')}`;
          const qrToken = `QR-OUTR-${hoCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          db.prepare(`
            INSERT INTO handover_records (
              id, handover_code, claim_id, found_item_id, owner_id, owner_name,
              approved_date, handover_location, scheduled_date, scheduled_time, completed_date,
              receiver_id_type, receiver_id_number, verification_qr_token, admin_remarks, recorded_by, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?)
          `).run(
            `ho-${Date.now()}`,
            hoCode,
            targetClaim.id,
            itemId,
            ownerId,
            ownerName,
            date,
            location,
            date,
            time,
            date,
            receiverIdType,
            String(receiverId).trim(),
            qrToken,
            String(notes).trim(),
            currentUser.name,
            now,
            now
          );
        }

        // Also mark any linked lost report as Resolved
        if (targetClaim.lost_item_id) {
          db.prepare("UPDATE lost_items SET status = 'Resolved', updated_at = ? WHERE id = ?").run(
            now,
            targetClaim.lost_item_id
          );
        }
      }

      // Mark found item Returned
      db.prepare("UPDATE found_items SET status = 'Returned', updated_at = ? WHERE id = ?").run(
        now,
        itemId
      );

      // Refresh/invalidate AI matches involving this returned item
      syncAiMatches(db, { notify: false });

      // Notify owner and finder
      createNotification(db, {
        userId: ownerId,
        type: 'item_returned',
        title: 'Item Handover Completed & Recorded',
        message: `"${foundRow.title}" has been officially handed over and recorded as Returned at ${location}.`,
        link: targetClaim ? `/claims/${targetClaim.id}` : `/items/${itemId}`,
      });
      if (foundRow.user_id !== ownerId) {
        createNotification(db, {
          userId: foundRow.user_id,
          type: 'item_returned',
          title: 'Found Item Returned to Rightful Owner',
          message: `Thank you! The item you reported ("${foundRow.title}") was verified and returned to its owner.`,
          link: `/items/${itemId}`,
        });
      }

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: 'HANDOVER_COMPLETED',
        entityType: 'handover',
        entityId: itemId,
        details: `Completed handover for "${foundRow.title}" to ${ownerName} (${receiverIdType}: ${receiverId}).`,
      });

      return sendJson(res, 200, { completed: true, itemId });
    }

    const handoverPatchMatch = pathname.match(/^\/api\/handovers\/([^/]+)$/);
    if (handoverPatchMatch && method === 'PATCH') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrator access required.' });
      }
      const hoId = decodeURIComponent(handoverPatchMatch[1]);
      const hoRow = db.prepare('SELECT * FROM handover_records WHERE id = ?').get(hoId);
      if (!hoRow) {
        return sendJson(res, 404, { error: 'Handover record not found.' });
      }
      const body = await readJsonBody(req);
      const {
        status = hoRow.status,
        scheduledDate = hoRow.scheduled_date,
        scheduledTime = hoRow.scheduled_time,
        location = hoRow.handover_location,
        adminRemarks = hoRow.admin_remarks,
      } = body;

      if (!HANDOVER_VALID_STATUSES.includes(status)) {
        return sendJson(res, 400, { error: 'Invalid handover status.' });
      }
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE handover_records
        SET status = ?, scheduled_date = ?, scheduled_time = ?, handover_location = ?, admin_remarks = ?, updated_at = ?
        WHERE id = ?
      `).run(status, scheduledDate, scheduledTime, location, adminRemarks, now, hoId);

      createNotification(db, {
        userId: hoRow.owner_id,
        type: 'handover_scheduled',
        title: `Handover ${status} (${hoRow.handover_code})`,
        message: `Your item handover is ${status.toLowerCase()} for ${scheduledDate} at ${scheduledTime} (${location}).`,
        link: `/claims/${hoRow.claim_id}`,
      });

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: `HANDOVER_${status.toUpperCase()}`,
        entityType: 'handover',
        entityId: hoId,
        details: `Updated handover ${hoRow.handover_code} to ${status} (${scheduledDate} ${scheduledTime}).`,
      });

      return sendJson(res, 200, { updated: true, id: hoId, status });
    }

    // =========================================================================
    // 7. NOTIFICATIONS
    // =========================================================================

    if (pathname === '/api/notifications' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const rows = db
        .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
        .all(currentUser.id);
      return sendJson(
        res,
        200,
        rows.map((n) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
        }))
      );
    }

    const notifReadMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (notifReadMatch && method === 'PATCH') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const notifId = decodeURIComponent(notifReadMatch[1]);
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
        notifId,
        currentUser.id
      );
      return sendJson(res, 200, { id: notifId, isRead: true });
    }

    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(currentUser.id);
      return sendJson(res, 200, { updated: true });
    }

    // =========================================================================
    // 8. ADMIN MANAGEMENT: USERS, MATCHING CONFIG & AUDIT LOGS
    // =========================================================================

    if (pathname === '/api/users' && method === 'GET') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrator access required.' });
      }
      const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
      return sendJson(res, 200, rows.map(sanitizeUser));
    }

    const userPatchMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userPatchMatch && method === 'PATCH') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrator access required.' });
      }
      const targetUserId = decodeURIComponent(userPatchMatch[1]);
      const targetRow = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
      if (!targetRow) {
        return sendJson(res, 404, { error: 'User not found.' });
      }

      const body = await readJsonBody(req);
      const nextRole = body.role ?? targetRow.role;
      const nextActive =
        body.isActive !== undefined ? (body.isActive ? 1 : 0) : targetRow.is_active;

      if (!['student', 'faculty', 'staff', 'admin'].includes(nextRole)) {
        return sendJson(res, 400, { error: 'Invalid user role.' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE users SET role = ?, is_active = ?, updated_at = ? WHERE id = ?').run(
        nextRole,
        nextActive,
        now,
        targetUserId
      );

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: 'USER_ACCOUNT_UPDATED',
        entityType: 'user',
        entityId: targetUserId,
        details: `Updated ${targetRow.name} (${targetRow.email}) -> role: ${nextRole}, active: ${Boolean(nextActive)}.`,
      });

      const updated = sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId));
      return sendJson(res, 200, { user: updated });
    }

    if (pathname === '/api/admin/matching-config' && method === 'PATCH') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrator access required.' });
      }
      const body = await readJsonBody(req);
      const now = new Date().toISOString();
      const upsert = db.prepare(`
        INSERT INTO matching_config (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      [
        'threshold',
        'notifyThreshold',
        'textWeight',
        'contextWeight',
        'sbertWeight',
        'tfidfWeight',
        'clipWeight',
        'categoryWeight',
        'locationWeight',
        'dateWeight',
        'defaultAlgorithm',
      ].forEach((k) => {
        if (body[k] !== undefined) {
          upsert.run(k, String(body[k]), now);
        }
      });

      syncAiMatches(db, { notify: false });
      const nextConfig = getMatchingConfig(db);

      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: 'MATCHING_CONFIG_UPDATED',
        entityType: 'matching_config',
        entityId: 'global',
        details: `Updated AI matching configuration (threshold=${nextConfig.threshold}, algorithm=${nextConfig.defaultAlgorithm}).`,
      });

      return sendJson(res, 200, { matchingConfig: nextConfig });
    }

    if (pathname === '/api/locations' && method === 'POST') {
      if (!currentUser || currentUser.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrator access required.' });
      }
      const body = await readJsonBody(req);
      const { name, building = '' } = body;
      if (!name || !String(name).trim()) {
        return sendJson(res, 400, { error: 'Location name is required.' });
      }
      const id = `loc-${Date.now()}`;
      const now = new Date().toISOString();
      db.prepare('INSERT INTO campus_locations (id, name, building, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        String(name).trim(),
        String(building).trim(),
        now
      );
      logAudit(db, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: 'LOCATION_ADDED',
        entityType: 'location',
        entityId: id,
        details: `Added campus location "${String(name).trim()}".`,
      });
      return sendJson(res, 201, { id, name: String(name).trim(), building: String(building).trim() });
    }

    return sendJson(res, 404, { error: `API endpoint not found: ${method} ${pathname}` });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, {
      error: err.message || 'An unexpected server error occurred.',
    });
  }
}
