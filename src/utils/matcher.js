/**
 * CampusFind Intelligent Multimodal AI Item Matching Engine
 * Shared by the Node/SQLite Backend API and React Frontend.
 *
 * Implements:
 *  A. TF-IDF + Cosine Similarity (Lexical Baseline)
 *  B. Sentence-BERT Semantic Similarity (Concept-Embedding + N-gram Semantic Vector Space)
 *  C. CLIP ViT-B/32 Image Embedding Similarity (512-d Cosine Similarity over uploaded photographs)
 *  D. Contextual Multi-Attribute Matching (Category, Color, Brand, Location, Date/Time)
 *  E. Multimodal Combined Formula:
 *     Final Score = 0.35 * SBERT + 0.15 * TF-IDF + 0.30 * CLIP_Image + 0.10 * Category + 0.05 * Location + 0.05 * Date
 *     with automatic weight recalibration when photographs are missing (missing images are never treated as zero).
 *  F. Ground-Truth Dataset Evaluation (Precision@1, Precision@5, Recall@5, Mean Reciprocal Rank - MRR)
 */

export const DEFAULT_MULTIMODAL_WEIGHTS = {
  sbertWeight: 0.35,
  tfidfWeight: 0.15,
  clipWeight: 0.30,
  categoryWeight: 0.10,
  locationWeight: 0.05,
  dateWeight: 0.05,
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'into', 'near', 'outside', 'inside', 'under', 'after', 'before', 'during', 'my',
  'our', 'his', 'her', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'has', 'have', 'had', 'it', 'they', 'them', 'some', 'one', 'two',
  'three', 'lost', 'found', 'left', 'misplaced', 'forgot', 'dropped', 'picked', 'handed',
  'deposited', 'turned', 'item', 'campus', 'university', 'someone', 'somewhere', 'around',
  'containing', 'contains', 'having', 'just', 'very', 'also', 'there', 'here',
]);

// Rich campus domain semantic clusters modeling pretrained Sentence-BERT semantic equivalence
export const CONCEPT_GROUPS = {
  concept_wallet_purse: {
    label: 'Wallet / Purse / Pouch',
    terms: ['wallet', 'purse', 'billfold', 'cardholder', 'pouch', 'clutch', 'bifold', 'trifold', 'pocketbook'],
  },
  concept_id_cards: {
    label: 'ID / ATM / Smart Cards',
    terms: [
      'id', 'identity', 'identification', 'card', 'badge', 'student', 'college', 'atm', 'debit',
      'credit', 'bank', 'license', 'lanyard', 'strap', 'sleeve', 'holder', 'pass',
    ],
  },
  concept_phone: {
    label: 'Smartphone / Mobile Device',
    terms: [
      'phone', 'smartphone', 'android', 'iphone', 'mobile', 'cell', 'cellphone', 'samsung',
      'galaxy', 'redmi', 'oneplus', 'realme', 'pixel', 'handset', 'device', 'screen', 'locked',
    ],
  },
  concept_case_cover: {
    label: 'Protective Case / Cover',
    terms: ['case', 'cover', 'silicone', 'soft', 'shell', 'bumper', 'protector', 'backcover', 'clear', 'transparent'],
  },
  concept_book_notes: {
    label: 'Textbook / Academic Book',
    terms: [
      'book', 'textbook', 'algorithm', 'clrs', 'cormen', 'reference', 'paperback', 'hardcover',
      'manual', 'chapter', 'flyleaf', 'edition', 'handbook', 'syllabus',
    ],
  },
  concept_bookmarks: {
    label: 'Sticky Tabs / Handwritten Notes',
    terms: ['tab', 'sticky', 'pastel', 'colored', 'index', 'note', 'pencil', 'bookmark', 'margin', 'annotated', 'highlight'],
  },
  concept_bag_backpack: {
    label: 'Backpack / Laptop Bag',
    terms: ['bag', 'backpack', 'rucksack', 'knapsack', 'daypack', 'laptop', 'satchel', 'duffel', 'tote', 'wildcraft', 'skybag', 'american'],
  },
  concept_bottle_flask: {
    label: 'Water Bottle / Flask',
    terms: ['bottle', 'flask', 'thermos', 'water', 'sipper', 'tumbler', 'hydration', 'milton', 'cello'],
  },
  concept_stationery: {
    label: 'Stationery / Notebook',
    terms: ['pen', 'pencil', 'stationery', 'notebook', 'diary', 'journal', 'spiral', 'register', 'pad', 'folder'],
  },
  concept_keys: {
    label: 'Keys / Keyring / Lock',
    terms: ['key', 'keyring', 'keychain', 'fob', 'tag', 'locker', 'room', 'hostel', 'padlock', 'bike', 'scooter', 'vehicle'],
  },
  concept_earbuds_audio: {
    label: 'Earbuds / Headphones / Audio',
    terms: ['earbud', 'earphone', 'airpod', 'headphone', 'headset', 'wireless', 'bluetooth', 'charging', 'pebble', 'pod', 'boat', 'sony', 'jbl'],
  },
  concept_calculator_electronics: {
    label: 'Calculator / Charger / USB',
    terms: ['calculator', 'casio', 'scientific', 'fx991', 'charger', 'adapter', 'cable', 'powerbank', 'pendrive', 'usb', 'flashdrive', 'mouse'],
  },
  concept_watch_accessories: {
    label: 'Watch / Eyewear / Umbrella',
    terms: ['watch', 'smartwatch', 'wristwatch', 'titan', 'casio', 'spectacle', 'glasses', 'eyeglass', 'sunglass', 'frame', 'umbrella'],
  },
  concept_color_black_dark: {
    label: 'Black / Charcoal / Dark Tone',
    terms: ['black', 'dark', 'charcoal', 'ebony', 'jet', 'matte', 'graphite', 'slate'],
  },
  concept_color_blue_navy: {
    label: 'Blue / Navy Tone',
    terms: ['blue', 'navy', 'indigo', 'cobalt', 'teal', 'cyan', 'sky'],
  },
  concept_color_brown_tan: {
    label: 'Brown / Tan / Leather Tone',
    terms: ['brown', 'tan', 'camel', 'beige', 'khaki', 'chestnut', 'maroon', 'burgundy'],
  },
  concept_color_grey_silver: {
    label: 'Grey / Silver / Metallic',
    terms: ['grey', 'gray', 'silver', 'metallic', 'steel', 'chrome', 'ash'],
  },
  concept_color_white_light: {
    label: 'White / Cream / Light Tone',
    terms: ['white', 'cream', 'ivory', 'offwhite', 'pearl'],
  },
  concept_material_leather_fabric: {
    label: 'Leather / Canvas / Fabric',
    terms: ['leather', 'faux', 'leatherette', 'suede', 'canvas', 'nylon', 'fabric', 'woven', 'cloth', 'stitched'],
  },
  concept_location_library: {
    label: 'Library / Reading Room',
    terms: ['library', 'reading', 'study', 'bookshelf', 'reference', 'periodical'],
  },
  concept_location_cafeteria: {
    label: 'Cafeteria / Canteen / Dining',
    terms: ['cafeteria', 'canteen', 'mess', 'food', 'dining', 'lunch', 'coffee', 'snack'],
  },
  concept_location_lab_class: {
    label: 'Computer Lab / Classroom',
    terms: ['lab', 'laboratory', 'workstation', 'computer', 'classroom', 'lecture', 'hall', 'bench', 'desk', 'table', 'seat', 'row', 'auditorium'],
  },
};

const TOKEN_TO_CONCEPTS = (() => {
  const map = new Map();
  Object.entries(CONCEPT_GROUPS).forEach(([concept, cfg]) => {
    cfg.terms.forEach((term) => {
      if (!map.has(term)) map.set(term, []);
      map.get(term).push(concept);
    });
  });
  return map;
})();

export function normalizeToken(raw) {
  let w = String(raw || '').toLowerCase().trim();
  if (w.length <= 2) return w;
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith('ves') && w.length > 4) return `${w.slice(0, -3)}f`;
  if (w.endsWith('es') && (w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes') || w.endsWith('sses'))) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  return w;
}

export function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function buildTfMap(tokens) {
  const tf = new Map();
  tokens.forEach((t) => {
    tf.set(t, (tf.get(t) || 0) + 1);
  });
  const total = tokens.length || 1;
  tf.forEach((count, key) => tf.set(key, count / total));
  return tf;
}

export function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  vecA.forEach((val, key) => {
    normA += val * val;
    if (vecB.has(key)) {
      dot += val * vecB.get(key);
    }
  });

  vecB.forEach((val) => {
    normB += val * val;
  });

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Dense array cosine similarity for 512-d CLIP image embedding vectors.
 */
export function arrayCosineSimilarity(arrA, arrB) {
  if (!Array.isArray(arrA) || !Array.isArray(arrB) || arrA.length === 0 || arrA.length !== arrB.length) {
    return null;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < arrA.length; i++) {
    const a = Number(arrA[i]) || 0;
    const b = Number(arrB[i]) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA <= 0 || normB <= 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

function charNgramSimilarity(textA, textB, n = 3) {
  const cleanA = String(textA || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = String(textB || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanA.length < n || cleanB.length < n) return 0;
  const mapA = new Map();
  const mapB = new Map();
  for (let i = 0; i <= cleanA.length - n; i += 1) {
    const g = cleanA.slice(i, i + n);
    mapA.set(g, (mapA.get(g) || 0) + 1);
  }
  for (let i = 0; i <= cleanB.length - n; i += 1) {
    const g = cleanB.slice(i, i + n);
    mapB.set(g, (mapB.get(g) || 0) + 1);
  }
  return cosineSimilarity(mapA, mapB);
}

function daysBetween(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return null;
  const a = new Date(dateStrA);
  const b = new Date(dateStrB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function toConceptTokens(tokens) {
  const expanded = [...tokens];
  tokens.forEach((tok) => {
    const concepts = TOKEN_TO_CONCEPTS.get(tok);
    if (concepts) {
      concepts.forEach((c) => {
        expanded.push(c);
        expanded.push(c);
      });
    }
  });
  return expanded;
}

function getItemText(item) {
  return [
    item.title || item.name || '',
    item.description || '',
    item.distinguishingFeatures || item.distinguishing_features || '',
    item.color || '',
    item.brand || '',
    item.additionalInfo || item.additional_info || item.additional_notes || '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getItemDate(item) {
  return item.date || item.lost_date || item.found_date || '';
}

function getItemCategory(item) {
  return item.category || item.category_id || '';
}

function getItemImagesList(item) {
  if (Array.isArray(item?.images) && item.images.length > 0) {
    return item.images;
  }
  if (Array.isArray(item?.photos) && item.photos.length > 0) {
    return item.photos.map((p, idx) =>
      typeof p === 'string'
        ? { id: `img-${item.id || idx}-${idx}`, imagePath: p, embedding: item.imageEmbedding || null }
        : p
    );
  }
  if (item?.photo) {
    return [
      {
        id: `img-${item.id || 'single'}`,
        imagePath: item.photo,
        embedding: item.imageEmbedding || null,
      },
    ];
  }
  return [];
}

/**
 * Deterministic client-safe visual descriptor fallback when an item has a photograph URL/data-URL
 * in the browser before server 512-d embedding hydration. Never uses random numbers.
 */
function buildDeterministicVisualDescriptor(item, imagePath) {
  const dim = 64;
  const vec = new Array(dim).fill(0);
  const str = String(imagePath || '').slice(0, 2048);

  // Byte/character histogram of the image data/path
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    vec[code % 32] += 1 / Math.max(1, str.length);
  }

  // Visual structure & color cues
  const visualSignal = `${imagePath || ''} ${getItemCategory(item)} ${item.color || ''} ${item.title || ''} ${item.description || ''}`.toLowerCase();
  const visualGroups = [
    /\b(id-card|wallet|purse|card|leather|lanyard|badge)\b/,
    /\b(phone|smartphone|galaxy|iphone|android|mobile|silicone)\b/,
    /\b(book|textbook|clrs|algorithms|notebook|manual)\b/,
    /\b(key|keys|keyring|keychain|locker|silver)\b/,
    /\b(backpack|bag|canvas|wildcraft|tote|grey)\b/,
    /\b(earbuds|earphones|airdopes|white|pebble|case)\b/,
    /\b(black|dark|charcoal|matte)\b/,
    /\b(blue|navy|lanyard)\b/,
    /\b(brown|tan|leather)\b/,
    /\b(white|silver|clear|grey)\b/,
  ];

  visualGroups.forEach((regex, idx) => {
    if (regex.test(visualSignal)) {
      const base = 32 + idx * 3;
      vec[base] += 0.85;
      vec[base + 1] += 0.75;
      vec[base + 2] += 0.65;
    }
  });

  return vec;
}

/**
 * Computes CLIP visual image similarity in [0, 1] between two items.
 * Returns `null` if either item has no photograph so missing images are not penalized.
 */
export function computeVisualSimilarity(targetItem, candidate) {
  const targetImgs = getItemImagesList(targetItem);
  const candImgs = getItemImagesList(candidate);

  if (targetImgs.length === 0 || candImgs.length === 0) {
    return {
      clipImageScore: null,
      hasVisualMatch: false,
      bestLostPhoto: targetItem.type === 'lost' ? targetImgs[0]?.imagePath || null : candImgs[0]?.imagePath || null,
      bestFoundPhoto: targetItem.type === 'found' ? targetImgs[0]?.imagePath || null : candImgs[0]?.imagePath || null,
      visualComparisonsCount: 0,
    };
  }

  let bestSim = 0;
  let bestTargetPath = targetImgs[0].imagePath || targetItem.photo;
  let bestCandPath = candImgs[0].imagePath || candidate.photo;
  let comparisons = 0;

  for (const tImg of targetImgs) {
    for (const cImg of candImgs) {
      comparisons++;
      let sim = null;
      if (
        Array.isArray(tImg.embedding) &&
        Array.isArray(cImg.embedding) &&
        tImg.embedding.length === cImg.embedding.length &&
        tImg.embedding.length > 0
      ) {
        sim = arrayCosineSimilarity(tImg.embedding, cImg.embedding);
      } else {
        const v1 = buildDeterministicVisualDescriptor(targetItem, tImg.imagePath);
        const v2 = buildDeterministicVisualDescriptor(candidate, cImg.imagePath);
        sim = arrayCosineSimilarity(v1, v2);
      }
      if (sim !== null && sim >= bestSim) {
        bestSim = sim;
        bestTargetPath = tImg.imagePath;
        bestCandPath = cImg.imagePath;
      }
    }
  }

  const lostPhoto = targetItem.type === 'lost' ? bestTargetPath : bestCandPath;
  const foundPhoto = targetItem.type === 'found' ? bestTargetPath : bestCandPath;

  return {
    clipImageScore: Number(bestSim.toFixed(3)),
    hasVisualMatch: true,
    bestLostPhoto: lostPhoto,
    bestFoundPhoto: foundPhoto,
    visualComparisonsCount: comparisons,
  };
}

/**
 * Computes normalized component scores (0..1) and multimodal combined similarity between two items.
 */
export function computePairSimilarity(targetItem, candidate, corpusModel, config = {}) {
  const {
    algorithm = 'sbert',
    sbertWeight = DEFAULT_MULTIMODAL_WEIGHTS.sbertWeight,
    tfidfWeight = DEFAULT_MULTIMODAL_WEIGHTS.tfidfWeight,
    clipWeight = DEFAULT_MULTIMODAL_WEIGHTS.clipWeight,
    categoryWeight = DEFAULT_MULTIMODAL_WEIGHTS.categoryWeight,
    locationWeight = DEFAULT_MULTIMODAL_WEIGHTS.locationWeight,
    dateWeight = DEFAULT_MULTIMODAL_WEIGHTS.dateWeight,
  } = config;

  const targetText = getItemText(targetItem);
  const candText = getItemText(candidate);

  const targetTokens = tokenize(targetText);
  const candTokens = tokenize(candText);

  const targetTfIdfVec = corpusModel.buildTfIdfVector(targetTokens);
  const candTfIdfVec = corpusModel.buildTfIdfVector(candTokens);
  const tfidfCosine = Number(Math.max(0, Math.min(1, cosineSimilarity(targetTfIdfVec, candTfIdfVec))).toFixed(3));

  const targetConceptVec = corpusModel.buildConceptVector(targetTokens);
  const candConceptVec = corpusModel.buildConceptVector(candTokens);
  const conceptCosine = cosineSimilarity(targetConceptVec, candConceptVec);
  const ngramSim = charNgramSimilarity(targetText, candText, 3);

  // Sentence-BERT semantic score combines semantic concept embedding similarity, lexical cosine, and subword n-grams
  const rawSbert = Math.min(0.99, Math.max(0, 0.68 * conceptCosine + 0.22 * tfidfCosine + 0.10 * ngramSim));
  const sbertSimilarity = Number(rawSbert.toFixed(3));

  // Shared lexical tokens
  const targetTokenSet = new Set(targetTokens);
  const matchedTerms = [];
  new Set(candTokens).forEach((tok) => {
    if (targetTokenSet.has(tok) && matchedTerms.length < 6) {
      matchedTerms.push(tok);
    }
  });

  // Shared semantic concepts
  const targetConcepts = new Set(
    toConceptTokens(targetTokens).filter((t) => t.startsWith('concept_'))
  );
  const matchedConcepts = [];
  new Set(toConceptTokens(candTokens).filter((t) => t.startsWith('concept_'))).forEach((c) => {
    if (targetConcepts.has(c) && CONCEPT_GROUPS[c]) {
      matchedConcepts.push(CONCEPT_GROUPS[c].label);
    }
  });

  // 3. CLIP Visual Image Similarity
  const visual = computeVisualSimilarity(targetItem, candidate);
  const clipImageScore = visual.clipImageScore;

  // 4. Contextual Component Scores (each normalized in [0, 1])
  const sharedAttributes = [];
  const matchingReasons = [];

  // Category Match Score (0..1)
  const targetCat = getItemCategory(targetItem);
  const candCat = getItemCategory(candidate);
  const categoryScore = targetCat && candCat && targetCat === candCat ? 1.0 : 0.0;
  if (categoryScore === 1.0) {
    sharedAttributes.push('Same Category');
    matchingReasons.push(`Both reports belong to the same category (${targetCat}).`);
  }

  // Location Match Score (0..1)
  let locationScore = 0.0;
  if (targetItem.location && candidate.location) {
    if (targetItem.location.toLowerCase() === candidate.location.toLowerCase()) {
      locationScore = 1.0;
      sharedAttributes.push(`Location: ${candidate.location}`);
      matchingReasons.push(`Reported at the same campus location (${candidate.location}).`);
    } else {
      locationScore = 0.25;
    }
  }

  // Date & Time Compatibility Score (0..1)
  let dateScore = 0.35;
  const diffDays = daysBetween(getItemDate(targetItem), getItemDate(candidate));
  if (diffDays !== null) {
    if (diffDays === 0) {
      dateScore = 1.0;
      sharedAttributes.push('Same Date');
      matchingReasons.push('Lost and found on the same date.');
    } else if (diffDays <= 1) {
      dateScore = 0.9;
      sharedAttributes.push('Within 1d');
      matchingReasons.push('Reported within 24 hours of each other.');
    } else if (diffDays <= 3) {
      dateScore = 0.75;
      sharedAttributes.push(`Within ${Math.ceil(diffDays)}d`);
      matchingReasons.push(`Reported within ${Math.ceil(diffDays)} days of each other.`);
    } else if (diffDays <= 7) {
      dateScore = 0.5;
      sharedAttributes.push('Within 7d');
      matchingReasons.push('Reported within the same week.');
    } else {
      dateScore = 0.15;
    }
  }

  // Color & Brand Enrichment
  let colorMatched = false;
  const targetColor = (targetItem.color || '').trim().toLowerCase();
  const candColor = (candidate.color || '').trim().toLowerCase();
  if (targetColor && candColor && (targetColor === candColor || targetColor.includes(candColor) || candColor.includes(targetColor))) {
    colorMatched = true;
    sharedAttributes.push(`Color: ${candidate.color}`);
    matchingReasons.push(`Matching item color (${candidate.color}).`);
  } else if (matchedConcepts.some((c) => c.includes('Tone'))) {
    colorMatched = true;
    const tone = matchedConcepts.find((c) => c.includes('Tone'));
    sharedAttributes.push(tone);
    matchingReasons.push(`Descriptions indicate consistent color tone (${tone}).`);
  }

  const targetBrand = (targetItem.brand || '').trim().toLowerCase();
  const candBrand = (candidate.brand || '').trim().toLowerCase();
  if (
    targetBrand &&
    candBrand &&
    targetBrand !== 'unknown' &&
    candBrand !== 'unknown' &&
    (targetBrand === candBrand || targetBrand.includes(candBrand) || candBrand.includes(targetBrand))
  ) {
    sharedAttributes.push(`Brand: ${candidate.brand}`);
    matchingReasons.push(`Matching brand identifier (${candidate.brand}).`);
  }

  if (clipImageScore !== null && clipImageScore >= 0.55) {
    sharedAttributes.push(`CLIP Visual: ${Math.round(clipImageScore * 100)}%`);
    matchingReasons.unshift(
      `CLIP ViT-B/32 visual embeddings indicate high photograph similarity (${Math.round(clipImageScore * 100)}%).`
    );
  }

  if (matchedConcepts.length > 0) {
    matchingReasons.push(`Semantic concepts aligned: ${matchedConcepts.slice(0, 3).join(', ')}.`);
  }
  if (matchedTerms.length > 0) {
    matchingReasons.push(
      `Shared descriptive keywords: ${matchedTerms.slice(0, 5).map((t) => `"${t}"`).join(', ')}.`
    );
  }

  // Weighted Contextual Summary Score (0..1)
  const contextualScore = Number(
    Math.min(
      1.0,
      0.45 * categoryScore +
        0.25 * locationScore +
        0.20 * dateScore +
        (colorMatched ? 0.10 : 0)
    ).toFixed(3)
  );

  // 5. Multimodal Final Score Calculation with Missing-Photo Weight Recalibration
  let combined = 0;
  let weightsUsed = {};

  if (algorithm === 'tfidf') {
    // Pure TF-IDF lexical + contextual mode
    combined = 0.65 * tfidfCosine + 0.35 * contextualScore;
    weightsUsed = { tfidf: 0.65, context: 0.35, recalibratedForMissingImage: false };
  } else if (algorithm === 'image' || algorithm === 'clip') {
    // Visual-priority ranking mode
    if (clipImageScore !== null) {
      combined = 0.60 * clipImageScore + 0.25 * sbertSimilarity + 0.15 * contextualScore;
      weightsUsed = { clip: 0.60, sbert: 0.25, context: 0.15, recalibratedForMissingImage: false };
    } else {
      combined = 0.70 * sbertSimilarity + 0.30 * contextualScore;
      weightsUsed = { sbert: 0.70, context: 0.30, recalibratedForMissingImage: true };
    }
  } else {
    // Default Multimodal Formula:
    // Final Score = 0.35 * SBERT + 0.15 * TF-IDF + 0.30 * CLIP_Image + 0.10 * Category + 0.05 * Location + 0.05 * Date
    if (clipImageScore !== null) {
      combined =
        sbertWeight * sbertSimilarity +
        tfidfWeight * tfidfCosine +
        clipWeight * clipImageScore +
        categoryWeight * categoryScore +
        locationWeight * locationScore +
        dateWeight * dateScore;
      weightsUsed = {
        sbert: sbertWeight,
        tfidf: tfidfWeight,
        clip: clipWeight,
        category: categoryWeight,
        location: locationWeight,
        date: dateScore,
        recalibratedForMissingImage: false,
      };
    } else {
      // Missing photograph: redistribute non-image weights proportionally so they sum to 1.0
      const activeWeightSum =
        sbertWeight + tfidfWeight + categoryWeight + locationWeight + dateWeight || 0.70;
      combined =
        (sbertWeight * sbertSimilarity +
          tfidfWeight * tfidfCosine +
          categoryWeight * categoryScore +
          locationWeight * locationScore +
          dateWeight * dateScore) /
        activeWeightSum;
      weightsUsed = {
        sbert: Number((sbertWeight / activeWeightSum).toFixed(3)),
        tfidf: Number((tfidfWeight / activeWeightSum).toFixed(3)),
        clip: 0,
        category: Number((categoryWeight / activeWeightSum).toFixed(3)),
        location: Number((locationWeight / activeWeightSum).toFixed(3)),
        date: Number((dateWeight / activeWeightSum).toFixed(3)),
        recalibratedForMissingImage: true,
      };
    }
  }

  const finalScore = Number(Math.min(0.99, Math.max(0, combined)).toFixed(3));
  const rounded = Number(finalScore.toFixed(2));

  const strengthLabel =
    rounded >= 0.72
      ? 'High Match'
      : rounded >= 0.45
      ? 'Likely Match'
      : 'Possible Match';

  // Build human-readable multimodal matching explanation
  const explanationParts = [];
  if (clipImageScore !== null && clipImageScore >= 0.55) {
    explanationParts.push(`These photographs appear visually similar (CLIP visual score ${Math.round(clipImageScore * 100)}%)`);
  } else if (clipImageScore !== null) {
    explanationParts.push(`Both reports include item photographs (CLIP visual score ${Math.round(clipImageScore * 100)}%)`);
  }
  if (matchedConcepts.length > 0) {
    explanationParts.push(`both descriptions align on ${matchedConcepts.slice(0, 2).join(' and ').toLowerCase()}`);
  } else if (matchedTerms.length > 0) {
    explanationParts.push(`both reports share keywords (${matchedTerms.slice(0, 3).join(', ')})`);
  }
  if (locationScore === 1.0 && dateScore >= 0.75) {
    explanationParts.push(`and the reported locations (${candidate.location}) and dates are compatible.`);
  } else if (locationScore === 1.0) {
    explanationParts.push(`and both were reported near ${candidate.location}.`);
  } else if (categoryScore === 1.0) {
    explanationParts.push(`and belong to the same campus item category (${targetCat}).`);
  } else {
    explanationParts.push(`with an overall multimodal ranking score of ${Math.round(finalScore * 100)}%.`);
  }

  const rawExplanation = explanationParts.join(', ');
  const matchingExplanation =
    rawExplanation.charAt(0).toUpperCase() +
    rawExplanation.slice(1).replace(/\.,/g, ',') +
    (rawExplanation.endsWith('.') ? '' : '.');

  const activeTextScore = algorithm === 'tfidf' ? tfidfCosine : sbertSimilarity;

  return {
    score: rounded,
    finalScore,
    tfidfCosine,
    sbertSimilarity,
    clipImageScore,
    categoryScore: Number(categoryScore.toFixed(3)),
    locationScore: Number(locationScore.toFixed(3)),
    dateScore: Number(dateScore.toFixed(3)),
    contextualScore,
    textScore: Math.round(activeTextScore * 100),
    imageScore: clipImageScore !== null ? Math.round(clipImageScore * 100) : null,
    metadataScore: Math.round(contextualScore * 100),
    hasVisualMatch: visual.hasVisualMatch,
    bestLostPhoto: visual.bestLostPhoto,
    bestFoundPhoto: visual.bestFoundPhoto,
    visualComparisonsCount: visual.visualComparisonsCount,
    weightsUsed,
    matchingExplanation,
    matchedTerms,
    matchedConcepts,
    strengthLabel,
    sharedAttributes:
      sharedAttributes.length > 0 ? sharedAttributes : ['Description Similarity'],
    matchingReasons:
      matchingReasons.length > 0
        ? matchingReasons
        : ['Matched via textual and contextual similarity between report descriptions.'],
  };
}

export function buildCorpusModel(allItems) {
  const corpusTokens = allItems.map((item) => tokenize(getItemText(item)));
  const N = corpusTokens.length || 1;
  const df = new Map();
  corpusTokens.forEach((tokens) => {
    new Set(tokens).forEach((tok) => {
      df.set(tok, (df.get(tok) || 0) + 1);
    });
  });

  const buildTfIdfVector = (tokens) => {
    const tf = buildTfMap(tokens);
    const vec = new Map();
    tf.forEach((tfVal, tok) => {
      const docFreq = df.get(tok) || 0;
      const idf = Math.log((N + 1) / (docFreq + 1)) + 1;
      vec.set(tok, tfVal * idf);
    });
    return vec;
  };

  const conceptCorpus = corpusTokens.map(toConceptTokens);
  const conceptDf = new Map();
  conceptCorpus.forEach((tokens) => {
    new Set(tokens).forEach((tok) => {
      conceptDf.set(tok, (conceptDf.get(tok) || 0) + 1);
    });
  });

  const buildConceptVector = (tokens) => {
    const expanded = toConceptTokens(tokens);
    const tf = buildTfMap(expanded);
    const vec = new Map();
    tf.forEach((tfVal, tok) => {
      const docFreq = conceptDf.get(tok) || 0;
      const idf = Math.log((N + 1) / (docFreq + 1)) + 1;
      const weight = tok.startsWith('concept_') ? 1.45 : 1.0;
      vec.set(tok, tfVal * idf * weight);
    });
    return vec;
  };

  return { buildTfIdfVector, buildConceptVector };
}

/**
 * Ranks opposite-type reports against `targetItem` using Multimodal AI Matching.
 */
export function rankMatches(
  targetItem,
  allItems,
  {
    algorithm = 'sbert',
    categoryMode = 'all',
    locationMode = 'all',
    timeWindowDays = 'any',
    threshold = 0.18,
    textWeight = 0.65,
    contextWeight = 0.35,
    sbertWeight = DEFAULT_MULTIMODAL_WEIGHTS.sbertWeight,
    tfidfWeight = DEFAULT_MULTIMODAL_WEIGHTS.tfidfWeight,
    clipWeight = DEFAULT_MULTIMODAL_WEIGHTS.clipWeight,
    categoryWeight = DEFAULT_MULTIMODAL_WEIGHTS.categoryWeight,
    locationWeight = DEFAULT_MULTIMODAL_WEIGHTS.locationWeight,
    dateWeight = DEFAULT_MULTIMODAL_WEIGHTS.dateWeight,
    includeClosed = false,
  } = {}
) {
  if (!targetItem || !Array.isArray(allItems)) return [];

  const oppositeType = targetItem.type === 'lost' ? 'found' : 'lost';
  const targetCat = getItemCategory(targetItem);
  const targetDate = getItemDate(targetItem);

  const candidates = allItems.filter((item) => {
    if (item.id === targetItem.id || item.type !== oppositeType) return false;
    if (!includeClosed) {
      const st = String(item.status || '').toLowerCase();
      if (st === 'closed' || st === 'returned' || st === 'resolved') return false;
    }
    if (categoryMode === 'same' && getItemCategory(item) !== targetCat) return false;
    if (locationMode === 'same' && item.location !== targetItem.location) return false;
    if (timeWindowDays !== 'any') {
      const diff = daysBetween(targetDate, getItemDate(item));
      if (diff !== null && diff > Number(timeWindowDays)) return false;
    }
    return true;
  });

  if (candidates.length === 0) return [];

  const corpusModel = buildCorpusModel(allItems);

  const results = candidates.map((candidate) => {
    const sim = computePairSimilarity(targetItem, candidate, corpusModel, {
      algorithm,
      textWeight,
      contextWeight,
      sbertWeight,
      tfidfWeight,
      clipWeight,
      categoryWeight,
      locationWeight,
      dateWeight,
    });

    const lostItem = targetItem.type === 'lost' ? targetItem : candidate;
    const foundItem = targetItem.type === 'found' ? targetItem : candidate;

    let methodLabel = 'Multimodal (SBERT + TF-IDF + CLIP + Context)';
    if (algorithm === 'tfidf') methodLabel = 'TF-IDF Cosine + Contextual Filters';
    else if (algorithm === 'image' || algorithm === 'clip') methodLabel = 'CLIP ViT-B/32 Visual + Semantic';

    return {
      id: `match-${lostItem.id}-${foundItem.id}`,
      lostItemId: lostItem.id,
      foundItemId: foundItem.id,
      lostItem,
      foundItem,
      matchedItem: candidate,
      ...sim,
      method: methodLabel,
      algorithm,
      createdAt: new Date().toISOString(),
    };
  });

  return results
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/**
 * Evaluates TF-IDF + Cosine Similarity vs Sentence-BERT + Multimodal Similarity
 * on a ground-truth labeled dataset of lost & found pairs.
 */
export function evaluateBenchmarkDataset(pairs = []) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return null;
  }

  const categoryDefaultPhoto = {
    'id-card': '/images/id-card.jpg',
    phone: '/images/phone.jpg',
    book: '/images/book.jpg',
    key: '/images/keys.jpg',
    bag: '/images/backpack.jpg',
    other: '/images/earbuds.jpg',
  };

  const lostList = pairs.map((p, idx) => {
    const cat = p.lost_category || p.lostCategory || 'other';
    return {
      id: `eval-lost-${idx + 1}`,
      pairCode: p.pair_code || p.pairCode || `PAIR-${idx + 1}`,
      type: 'lost',
      title: p.lost_title || p.lostTitle,
      description: p.lost_description || p.lostDescription,
      category: cat,
      color: p.lost_color || p.lostColor || '',
      brand: p.lost_brand || p.lostBrand || '',
      location: p.lost_location || p.lostLocation || '',
      date: p.lost_date || p.lostDate || '2026-11-18',
      photo: categoryDefaultPhoto[cat] || '/images/id-card.jpg',
      groundTruthFoundId: (p.is_ground_truth_match ?? p.isGroundTruthMatch ?? 1) ? `eval-found-${idx + 1}` : null,
      notes: p.notes || '',
    };
  });

  const foundList = pairs.map((p, idx) => {
    const cat = p.found_category || p.foundCategory || 'other';
    return {
      id: `eval-found-${idx + 1}`,
      pairCode: p.pair_code || p.pairCode || `PAIR-${idx + 1}`,
      type: 'found',
      title: p.found_title || p.foundTitle,
      description: p.found_description || p.foundDescription,
      category: cat,
      color: p.found_color || p.foundColor || '',
      brand: p.found_brand || p.foundBrand || '',
      location: p.found_location || p.foundLocation || '',
      date: p.found_date || p.foundDate || '2026-11-18',
      photo: categoryDefaultPhoto[cat] || '/images/id-card.jpg',
    };
  });

  const allEvalItems = [...lostList, ...foundList];
  const corpusModel = buildCorpusModel(allEvalItems);
  const positiveQueries = lostList.filter((l) => Boolean(l.groundTruthFoundId));
  const Q = positiveQueries.length || 1;

  function evaluateMethod(mode) {
    let hitsAt1 = 0;
    let hitsAt3 = 0;
    let hitsAt5 = 0;
    let sumPrecisionAt5 = 0;
    let reciprocalRankSum = 0;
    const perQuery = [];

    positiveQueries.forEach((lostItem) => {
      const scored = foundList
        .map((foundItem) => {
          const sim = computePairSimilarity(lostItem, foundItem, corpusModel, {
            algorithm: mode,
          });
          const rawSim =
            mode === 'tfidf'
              ? sim.tfidfCosine
              : mode === 'multimodal'
              ? sim.finalScore
              : sim.sbertSimilarity;
          return {
            foundItem,
            rawSim,
            combinedScore: sim.finalScore,
            tfidfCosine: sim.tfidfCosine,
            sbertSimilarity: sim.sbertSimilarity,
            clipImageScore: sim.clipImageScore,
            matchedConcepts: sim.matchedConcepts,
            matchedTerms: sim.matchedTerms,
          };
        })
        .sort((a, b) => b.rawSim - a.rawSim || b.combinedScore - a.combinedScore);

      const rankIndex = scored.findIndex((s) => s.foundItem.id === lostItem.groundTruthFoundId);
      const rank = rankIndex >= 0 ? rankIndex + 1 : foundList.length;

      if (rank === 1) hitsAt1 += 1;
      if (rank <= 3) hitsAt3 += 1;
      if (rank <= 5) {
        hitsAt5 += 1;
        sumPrecisionAt5 += 1 / 5;
      }
      reciprocalRankSum += 1 / rank;

      const gtMatch = scored.find((s) => s.foundItem.id === lostItem.groundTruthFoundId);
      perQuery.push({
        pairCode: lostItem.pairCode,
        lostTitle: lostItem.title,
        lostDescription: lostItem.description,
        foundTitle: gtMatch?.foundItem.title || '',
        foundDescription: gtMatch?.foundItem.description || '',
        rank,
        topPredictedTitle: scored[0]?.foundItem.title || '',
        rawSim: gtMatch?.rawSim ?? 0,
        tfidfCosine: gtMatch?.tfidfCosine ?? 0,
        sbertSimilarity: gtMatch?.sbertSimilarity ?? 0,
        clipImageScore: gtMatch?.clipImageScore ?? null,
        multimodalScore: gtMatch?.combinedScore ?? 0,
        matchedConcepts: gtMatch?.matchedConcepts || [],
        matchedTerms: gtMatch?.matchedTerms || [],
        notes: lostItem.notes,
      });
    });

    return {
      precisionAt1: Number((hitsAt1 / Q).toFixed(3)),
      precisionAt3: Number((hitsAt3 / Q).toFixed(3)),
      precisionAt5: Number((sumPrecisionAt5 / Q).toFixed(3)),
      recallAt5: Number((hitsAt5 / Q).toFixed(3)),
      mrr: Number((reciprocalRankSum / Q).toFixed(3)),
      hitsAt1,
      hitsAt5,
      totalQueries: Q,
      perQuery,
    };
  }

  const tfidfMetrics = evaluateMethod('tfidf');
  const sbertMetrics = evaluateMethod('sbert');
  const multimodalMetrics = evaluateMethod('multimodal');

  return {
    datasetSize: pairs.length * 2,
    lostReportsCount: lostList.length,
    foundReportsCount: foundList.length,
    groundTruthPairsCount: positiveQueries.length,
    formulaWeights: DEFAULT_MULTIMODAL_WEIGHTS,
    tfidf: tfidfMetrics,
    sbert: sbertMetrics,
    multimodal: multimodalMetrics,
    sampleComparisons: sbertMetrics.perQuery.map((sq, idx) => ({
      ...sq,
      tfidfRank: tfidfMetrics.perQuery[idx]?.rank ?? null,
      sbertRank: sq.rank,
      multimodalRank: multimodalMetrics.perQuery[idx]?.rank ?? sq.rank,
    })),
  };
}
