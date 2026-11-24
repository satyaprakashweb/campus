import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './apiRouter.js';
import { getDb, syncAiMatches } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images');

async function apiRequest(urlPath, { method = 'GET', token = null, body = null } = {}) {
  const payload = body ? [Buffer.from(JSON.stringify(body), 'utf8')] : [];
  const req = Readable.from(payload);
  req.url = urlPath;
  req.method = method;
  req.headers = { 'content-type': 'application/json' };
  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }

  let statusCode = 200;
  const resHeaders = {};
  let rawBody = '';

  const res = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(val) {
      statusCode = val;
    },
    setHeader(k, v) {
      resHeaders[k.toLowerCase()] = v;
    },
    end(chunk = '') {
      rawBody += String(chunk);
    },
  };

  await handleApiRequest(req, res);
  const data = rawBody ? JSON.parse(rawBody) : {};
  return { status: statusCode, ok: statusCode >= 200 && statusCode < 300, data };
}

async function runTests() {
  const db = getDb();
  const suffix = Date.now();
  const studentAEmail = `student.a.${suffix}@outr.ac.in`;
  const studentBEmail = `student.b.${suffix}@outr.ac.in`;

  // Load real binary image files from public/images/ as base64 data URLs to test full image upload + CLIP embedding
  const walletCardPhotoBuf = fs.readFileSync(path.join(PUBLIC_IMAGES_DIR, 'id-card.jpg'));
  const walletPhotoDataUrlA = `data:image/jpeg;base64,${walletCardPhotoBuf.toString('base64')}`;
  const walletPhotoDataUrlB = `/images/id-card.jpg`;

  let createdLostId = null;
  let createdFoundId = null;
  let createdClaimId = null;
  let studentAId = null;
  let studentBId = null;

  try {
    // 1. Student A registers & logs in
    console.log('1. Testing Student A registration & authentication...');
    const regARes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Student A (Multimodal Test)',
        email: studentAEmail,
        password: 'PasswordA123!',
        role: 'student',
        identifier: `231109${String(suffix).slice(-2)}`,
        department: 'Computer Science & Engineering',
        course: 'B.Tech',
        semester: '5th Semester',
        phone: '+91 94370 11111',
      },
    });
    assert.equal(regARes.status, 201, 'Student A registration should return 201');
    const tokenA = regARes.data.token;
    studentAId = regARes.data.user.id;

    // Security & Edge Cases:
    const dupRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate A',
        email: studentAEmail,
        password: 'PasswordA123!',
        role: 'student',
        identifier: '23110999',
        department: 'CSE',
        phone: '+91 94370 11111',
      },
    });
    assert.equal(dupRes.status, 409, 'Duplicate email registration must fail with 409');

    const fakeAdminRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Fake Admin',
        email: `fake.admin.${suffix}@outr.ac.in`,
        password: 'Password123!',
        role: 'admin',
        identifier: 'EMP-999',
        department: 'Admin',
        phone: '+91 90000 00000',
      },
    });
    assert.equal(fakeAdminRes.status, 403, 'Users cannot self-register as admin');

    // 2. Student A reports a lost black leather wallet and uploads a real photograph
    console.log('2. Testing Student A reporting a lost black leather wallet with uploaded photograph...');
    const lostRes = await apiRequest('/api/items', {
      method: 'POST',
      token: tokenA,
      body: {
        type: 'lost',
        title: 'Black Leather Wallet with ATM & College ID',
        category: 'id-card',
        color: 'Black',
        brand: 'Wildhorn',
        location: 'Main Library',
        date: '2026-11-22',
        time: '14:15',
        description: 'Black leather wallet containing an ATM card and college ID.',
        distinguishingFeatures: 'Bi-fold dark black leather wallet with SBI debit card and OUTR college ID card inside.',
        additionalInfo: 'Lost near the library reading hall table.',
        photo: walletPhotoDataUrlA,
        photos: [walletPhotoDataUrlA, '/images/id-card.jpg'],
      },
    });
    assert.equal(lostRes.status, 201, `Lost report creation should succeed with 201 (${JSON.stringify(lostRes.data)})`);
    assert.ok(lostRes.data.item.reportCode.startsWith('LST-'), 'Should generate unique LST report code');
    assert.ok(lostRes.data.item.imageEmbeddingReference?.startsWith('clip-vit-b32-'), 'Must generate CLIP embedding reference');
    assert.equal(lostRes.data.item.photos.length, 2, 'Should store multiple uploaded photographs');
    createdLostId = lostRes.data.item.id;

    // Verify 512-d CLIP embedding is cached in item_images table
    const lostImgRow = db.prepare('SELECT * FROM item_images WHERE item_id = ? AND item_type = ?').get(createdLostId, 'lost');
    assert.ok(lostImgRow, 'item_images row must exist for lost item');
    const lostEmbeddingVec = JSON.parse(lostImgRow.embedding_json);
    assert.equal(lostEmbeddingVec.length, 512, 'CLIP visual embedding must be a 512-dimensional vector');

    // 3. Student B registers & reports a found black leather wallet/purse and uploads another photograph
    console.log('3. Testing Student B registration & reporting a found black wallet with photograph...');
    const regBRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Student B (Finder Test)',
        email: studentBEmail,
        password: 'PasswordB123!',
        role: 'student',
        identifier: `231108${String(suffix).slice(-2)}`,
        department: 'Electronics & Instrumentation',
        course: 'B.Tech',
        semester: '5th Semester',
        phone: '+91 94370 22222',
      },
    });
    assert.equal(regBRes.status, 201, 'Student B registration should return 201');
    const tokenB = regBRes.data.token;
    studentBId = regBRes.data.user.id;

    const foundRes = await apiRequest('/api/items', {
      method: 'POST',
      token: tokenB,
      body: {
        type: 'found',
        title: 'Dark Black Purse / Leather Wallet with ID Cards',
        category: 'id-card',
        color: 'Black',
        brand: 'Wildhorn',
        location: 'Main Library',
        date: '2026-11-22',
        time: '15:00',
        description: 'Found a dark black purse near the university library with some identification cards.',
        distinguishingFeatures: 'Black bi-fold leather purse containing bank card and student identification card.',
        additionalInfo: 'Handed over to Central Library front desk.',
        photo: walletPhotoDataUrlB,
        photos: [walletPhotoDataUrlB],
      },
    });
    assert.equal(foundRes.status, 201, 'Found report creation should succeed with 201');
    assert.ok(foundRes.data.item.reportCode.startsWith('FND-'), 'Should generate unique FND report code');
    assert.ok(foundRes.data.item.imageEmbeddingReference?.startsWith('clip-vit-b32-'), 'Must generate CLIP embedding reference');
    createdFoundId = foundRes.data.item.id;

    // 4, 5, 6, 7. Verify Multimodal AI Matching (CLIP + Sentence-BERT + TF-IDF + Category/Location/Date)
    console.log('4-7. Verifying Multimodal AI Matching (CLIP + Sentence-BERT + TF-IDF + Context) in ai_matches...');
    const matchRow = db
      .prepare('SELECT * FROM ai_matches WHERE lost_item_id = ? AND found_item_id = ?')
      .get(createdLostId, createdFoundId);
    assert.ok(matchRow, 'Multimodal AI engine must automatically create an ai_matches record for Lost A & Found B');
    assert.ok(matchRow.clip_image_score > 0.7, `CLIP image similarity (${matchRow.clip_image_score}) should be high`);
    assert.ok(matchRow.sbert_score > 0.45, `Sentence-BERT semantic score (${matchRow.sbert_score}) should be high`);
    assert.ok(matchRow.tfidf_score > 0.1, `TF-IDF score (${matchRow.tfidf_score}) should be positive`);
    assert.equal(matchRow.category_score, 1.0, 'Category score must be 1.0');
    assert.equal(matchRow.location_score, 1.0, 'Location score must be 1.0');
    assert.equal(matchRow.date_score, 1.0, 'Date score must be 1.0');
    assert.ok(matchRow.final_score >= 0.65, `Final multimodal score (${matchRow.final_score}) should be strong`);
    assert.ok(
      matchRow.matching_explanation.length > 25,
      `Matching explanation must be generated ("${matchRow.matching_explanation}")`
    );

    console.log(
      `   -> Multimodal Scores: CLIP=${matchRow.clip_image_score}, SBERT=${matchRow.sbert_score}, TF-IDF=${matchRow.tfidf_score}, Cat=${matchRow.category_score}, Loc=${matchRow.location_score}, Date=${matchRow.date_score} => Final=${matchRow.final_score}`
    );

    // 8 & 9. Student A views AI matches (with photo comparison data) and submits an ownership claim
    console.log('8-9. Testing Student A viewing multimodal match results & submitting ownership claim...');
    const matchesRes = await apiRequest('/api/match', {
      method: 'POST',
      token: tokenA,
      body: { itemId: createdLostId, algorithm: 'sbert' },
    });
    assert.equal(matchesRes.status, 200);
    const matchedPair = matchesRes.data.find((m) => m.foundItemId === createdFoundId);
    assert.ok(matchedPair, 'POST /api/match must return the matched Found item');
    assert.ok(matchedPair.clipImageScore > 0.7, 'API match payload must include clipImageScore');
    assert.ok(matchedPair.matchingExplanation, 'API match payload must include matchingExplanation');

    const claimRes = await apiRequest('/api/claims', {
      method: 'POST',
      token: tokenA,
      body: {
        itemId: createdFoundId,
        lostItemId: createdLostId,
        identifyingDetails: 'Contains my OUTR student ID card and blue SBI debit card ending in 4829.',
        uniqueFeatures: 'Scratch near inner coin pocket snap.',
        purchaseDate: '2025-08-10',
        supportingInfo: 'Can show original college registration slip and matching SBI mobile banking app.',
        proofPhoto: '/images/id-card.jpg',
        claimReason: 'I lost this wallet on the 2nd floor of Main Library.',
      },
    });
    assert.equal(claimRes.status, 201, 'Claim submission should return 201');
    createdClaimId = claimRes.data.claim.id;

    // 10. Administrator logs in, reviews evidence, approves claim, and schedules handover
    console.log('10. Testing Administrator claim verification & handover scheduling...');
    const adminLoginRes = await apiRequest('/api/auth/admin-login', {
      method: 'POST',
      body: {
        email: 'admin@university.edu',
        password: 'admin123',
      },
    });
    assert.equal(adminLoginRes.status, 200, 'Administrator login must return 200');
    const adminToken = adminLoginRes.data.token;

    const reviewRes = await apiRequest(`/api/claims/${createdClaimId}/review`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        decision: 'approve',
        adminReason: 'Verified Student A college ID number and debit card last 4 digits.',
        scheduledDate: '2026-11-24',
        scheduledTime: '11:00',
        handoverLocation: 'Student Services Office, OUTR, Bhubaneswar',
      },
    });
    assert.equal(reviewRes.status, 200, 'Admin claim approval should return 200');
    assert.equal(reviewRes.data.claim.status, 'Approved');

    // 11. Physical handover is recorded and item is marked as Returned
    console.log('11. Testing physical handover completion & transition to Returned...');
    const handoverRes = await apiRequest('/api/handovers/complete', {
      method: 'POST',
      token: adminToken,
      body: {
        claimId: createdClaimId,
        itemId: createdFoundId,
        receiverIdType: 'Student ID',
        receiverId: regARes.data.user.identifier,
        location: 'Student Services Office, OUTR, Bhubaneswar',
        notes: 'Wallet and cards verified and handed over in person.',
      },
    });
    assert.equal(handoverRes.status, 200, 'Handover completion must return 200');

    const foundRow = db.prepare('SELECT status FROM found_items WHERE id = ?').get(createdFoundId);
    const lostRow = db.prepare('SELECT status FROM lost_items WHERE id = ?').get(createdLostId);
    assert.equal(foundRow.status, 'Returned', 'Found item status must change to Returned');
    assert.equal(lostRow.status, 'Resolved', 'Linked lost item status must change to Resolved');

    // 12. Role-Based Authorization & Faculty Dashboard Verification
    console.log('12. Testing Faculty Portal login, Faculty Dashboard API, and Role-Based Access Control...');
    const studentOnFacultyLogin = await apiRequest('/api/auth/faculty-login', {
      method: 'POST',
      body: { email: 'satya@university.edu', password: 'student123' },
    });
    assert.equal(studentOnFacultyLogin.status, 403, 'Student must be blocked (403) from /api/auth/faculty-login');

    const facultyLoginRes = await apiRequest('/api/auth/faculty-login', {
      method: 'POST',
      body: { email: 'faculty@university.edu', password: 'faculty123' },
    });
    assert.equal(facultyLoginRes.status, 200, 'Faculty login must succeed with 200');
    assert.equal(facultyLoginRes.data.user.role, 'faculty');
    const facultyToken = facultyLoginRes.data.token;

    const studentOnFacultyDash = await apiRequest('/api/faculty/dashboard', {
      method: 'GET',
      token: tokenA,
    });
    assert.equal(studentOnFacultyDash.status, 403, 'Student token must be blocked (403) from /api/faculty/dashboard');

    const facultyDashRes = await apiRequest('/api/faculty/dashboard', {
      method: 'GET',
      token: facultyToken,
    });
    assert.equal(facultyDashRes.status, 200, 'Faculty token must access /api/faculty/dashboard');
    assert.ok(facultyDashRes.data.stats.totalItemsReported >= 2, 'Faculty dashboard must return live faculty item counts');

    const facultyOnAdminUsers = await apiRequest('/api/users', {
      method: 'GET',
      token: facultyToken,
    });
    assert.equal(facultyOnAdminUsers.status, 403, 'Faculty token must be blocked (403) from admin /api/users endpoint');

    console.log('\n✅ ALL MULTIMODAL CLIP + SBERT + TF-IDF & ROLE-SEPARATION E2E TESTS PASSED!');
  } finally {
    // Clean up test records so the demo database remains clean
    if (createdClaimId) {
      db.prepare('DELETE FROM handover_records WHERE claim_id = ?').run(createdClaimId);
      db.prepare('DELETE FROM claims WHERE id = ?').run(createdClaimId);
    }
    if (createdLostId || createdFoundId) {
      db.prepare('DELETE FROM ai_matches WHERE lost_item_id = ? OR found_item_id = ?').run(createdLostId, createdFoundId);
      db.prepare('DELETE FROM item_images WHERE item_id = ? OR item_id = ?').run(createdLostId, createdFoundId);
    }
    if (createdLostId) db.prepare('DELETE FROM lost_items WHERE id = ?').run(createdLostId);
    if (createdFoundId) db.prepare('DELETE FROM found_items WHERE id = ?').run(createdFoundId);
    if (studentAId) {
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(studentAId);
      db.prepare('DELETE FROM audit_logs WHERE actor_id = ?').run(studentAId);
      db.prepare('DELETE FROM users WHERE id = ?').run(studentAId);
    }
    if (studentBId) {
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(studentBId);
      db.prepare('DELETE FROM audit_logs WHERE actor_id = ?').run(studentBId);
      db.prepare('DELETE FROM users WHERE id = ?').run(studentBId);
    }
    db.prepare(
      "DELETE FROM notifications WHERE message LIKE '%Multimodal Test%' OR message LIKE '%Black Purse%' OR message LIKE '%Black Leather Wallet%'"
    ).run();
    db.prepare(
      "DELETE FROM audit_logs WHERE details LIKE '%Multimodal Test%' OR details LIKE '%Finder Test%' OR details LIKE '%Black Leather Wallet%' OR details LIKE '%Black Purse%'"
    ).run();
    syncAiMatches(db, { notify: false });
  }
}

runTests().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
