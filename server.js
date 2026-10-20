const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_LOGIN_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const REQUIRE_ADMIN_AUTH = process.env.REQUIRE_ADMIN_AUTH === 'true';

const missingEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing .env values: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const db = require('./King_Sentry-main/supabase');

const newAuthClient = () => createClient(SUPABASE_URL, SUPABASE_LOGIN_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const app = express();
app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(`[${req.method} ${req.path}]`, err);
    res.status(500).json({ error: (err && err.message) || String(err) });
  });

const one = (v) => (Array.isArray(v) ? v[0] : v);

function classifyDisease(name) {
  if (!name) return 'Unknown';
  const n = String(name).toLowerCase();
  if (n.includes('blight')) return 'Leaf Blight';
  if (n.includes('spot')) return 'Leaf Spot';
  if (n.includes('healthy')) return 'Healthy';
  return 'Unknown';
}

function toPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.round(Math.min(Math.max(pct, 0), 100) * 10) / 10;
}

function shapeScan(row) {
  const diseaseName = (one(row.disease_dictionary) || {}).disease_name || null;
  return {
    id: row.id,
    source_local_id: row.source_local_id ?? null,
    scan_timestamp: row.scan_timestamp,
    confidence_score: row.confidence_score,
    confidence_pct: toPercent(row.confidence_score),
    disease_name: diseaseName,
    detected_class: classifyDisease(diseaseName),
    orchard_name: (one(row.orchards) || {}).orchard_name || null,
  };
}

async function requireAdmin(req, res, next) {
  if (!REQUIRE_ADMIN_AUTH) return next();
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing access token.' });

    const { data, error } = await db.auth.getUser(token);
    if (error || !data || !data.user) return res.status(401).json({ error: 'Invalid or expired token.' });

    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator accounts only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function fetchAllScanRows(columns) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from('scan_results')
      .select(columns)
      .order('scan_timestamp', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

app.post('/api/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { data: authData, error: authError } = await newAuthClient().auth.signInWithPassword({ email, password });
  if (authError) return res.status(401).json({ error: authError.message });

  const { data: profileData, error: profileError } = await db
    .from('user_profiles')
    .select('role, username')
    .eq('id', authData.user.id)
    .single();
  if (profileError) return res.status(401).json({ error: profileError.message });

  if (profileData.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator accounts only.' });
  }

  res.status(200).json({
    message: 'Login successful!',
    user: authData.user,
    profile: profileData,
    access_token: authData.session ? authData.session.access_token : null,
  });
}));

app.get('/api/diseases', requireAdmin, wrap(async (req, res) => {
  const { data, error } = await db.from('disease_dictionary').select('*');
  if (error) throw error;
  res.status(200).json(data);
}));

app.post('/api/diseases', requireAdmin, wrap(async (req, res) => {
  const { disease_name, description, risk_id } = req.body || {};
  if (!disease_name) return res.status(400).json({ error: 'disease_name is required.' });

  const { data, error } = await db
    .from('disease_dictionary')
    .insert([{ disease_name, description, risk_id }])
    .select();
  if (error) throw error;
  res.status(201).json({ message: 'Successfully added new disease!', data });
}));

const SCAN_COLUMNS_BASE = 'id, source_local_id, confidence_score, scan_timestamp, disease_dictionary ( disease_name )';
const SCAN_COLUMNS_WITH_ORCHARD = `${SCAN_COLUMNS_BASE}, orchards ( orchard_name )`;

app.get('/api/dashboard/scans', requireAdmin, wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 1000);

  const run = (columns) => db
    .from('scan_results')
    .select(columns)
    .order('scan_timestamp', { ascending: false })
    .order('id', { ascending: true })
    .limit(limit);

  let { data, error } = await run(SCAN_COLUMNS_WITH_ORCHARD);
  if (error) {
    console.warn('Orchard embed failed, retrying without it:', error.message);
    ({ data, error } = await run(SCAN_COLUMNS_BASE));
  }
  if (error) throw error;

  res.status(200).json(data.map(shapeScan));
}));

app.get('/api/dashboard/kpis', requireAdmin, wrap(async (req, res) => {
  const rows = await fetchAllScanRows('id, disease_dictionary ( disease_name )');

  const counts = { healthy: 0, leafSpot: 0, leafBlight: 0, unknown: 0 };
  for (const row of rows) {
    const cls = classifyDisease((one(row.disease_dictionary) || {}).disease_name);
    if (cls === 'Healthy') counts.healthy++;
    else if (cls === 'Leaf Spot') counts.leafSpot++;
    else if (cls === 'Leaf Blight') counts.leafBlight++;
    else counts.unknown++;
  }

  res.status(200).json({ total: rows.length, ...counts });
}));

async function fetchAllRows(table, columns, orderBy = 'id') {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function fetchAllAuthUsers() {
  const perPage = 1000;
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

function userStatus(authUser) {
  if (!authUser) return 'Unknown';
  if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) return 'Suspended';
  if (!authUser.email_confirmed_at) return 'Pending';
  return 'Active';
}

app.get('/api/users', requireAdmin, wrap(async (req, res) => {
  const [profiles, authUsers, orchards, scans] = await Promise.all([
    fetchAllRows('user_profiles', '*'),
    fetchAllAuthUsers(),
    fetchAllRows('orchards', 'id, owner_id, orchard_name').catch((e) => {
      console.warn('Could not load orchards:', e.message);
      return [];
    }),
    fetchAllRows('scan_results', 'id, owner_id, scan_timestamp').catch((e) => {
      console.warn('Could not load scan counts:', e.message);
      return [];
    }),
  ]);

  const authById = new Map(authUsers.map((u) => [u.id, u]));

  const orchardsByOwner = new Map();
  for (const o of orchards) {
    if (!o.owner_id || !o.orchard_name) continue;
    if (!orchardsByOwner.has(o.owner_id)) orchardsByOwner.set(o.owner_id, []);
    orchardsByOwner.get(o.owner_id).push(o.orchard_name);
  }

  const scanCountByOwner = new Map();
  const latestScanByOwner = new Map();
  for (const s of scans) {
    scanCountByOwner.set(s.owner_id, (scanCountByOwner.get(s.owner_id) || 0) + 1);
    const prev = latestScanByOwner.get(s.owner_id);
    if (s.scan_timestamp && (!prev || s.scan_timestamp > prev)) latestScanByOwner.set(s.owner_id, s.scan_timestamp);
  }

  const users = profiles
    .filter((p) => p.role !== 'admin')
    .map((p) => {
      const authUser = authById.get(p.id);
      const orchardNames = orchardsByOwner.get(p.id) || [];
      return {
        id: p.id,
        username: p.username || (authUser && authUser.email ? authUser.email.split('@')[0] : null),
        email: authUser ? authUser.email : null,
        role: p.role || 'farmer',
        status: userStatus(authUser),
        orchards: orchardNames,
        zone: orchardNames.length ? orchardNames.join(', ') : null,
        scans_count: scanCountByOwner.get(p.id) || 0,
        latest_scan_at: latestScanByOwner.get(p.id) || null,
        registered_at: (authUser && authUser.created_at) || p.created_at || null,
        last_sign_in_at: authUser ? authUser.last_sign_in_at : null,
      };
    })
    .sort((a, b) => String(b.registered_at || '').localeCompare(String(a.registered_at || '')));

  res.status(200).json(users);
}));

// Risk shown in the Photo Repository (derived from the diagnosis class).
const RISK_BY_CLASS = { 'Healthy': 'Low', 'Leaf Spot': 'Moderate', 'Leaf Blight': 'High', 'Unknown': 'Low' };
const SCAN_IMAGE_BUCKET = 'scan-images';

app.get('/api/users/:id/scans', requireAdmin, wrap(async (req, res) => {
  const ownerId = req.params.id;
  const baseColumns = 'id, source_local_id, disease_id, confidence_score, image_uri_path, scan_timestamp, disease_dictionary ( disease_name )';

  const run = (columns) => db
    .from('scan_results')
    .select(columns)
    .eq('owner_id', ownerId)
    .order('scan_timestamp', { ascending: false })
    .order('id', { ascending: true })
    .limit(1000);

  let { data, error } = await run(`${baseColumns}, orchards ( orchard_name )`);
  if (error) {
    console.warn('Orchard embed failed, retrying without it:', error.message);
    ({ data, error } = await run(baseColumns));
  }
  if (error) throw error;

  // Treatment advice per disease (what the app synced + what the admin added).
  const advisoryByDisease = new Map();
  const { data: treatments, error: treatmentError } = await db
    .from('treatment_recommendations')
    .select('disease_id, treatment_action');
  if (treatmentError) {
    console.warn('Could not load treatments:', treatmentError.message);
  } else {
    for (const t of treatments) {
      if (!advisoryByDisease.has(t.disease_id)) advisoryByDisease.set(t.disease_id, []);
      advisoryByDisease.get(t.disease_id).push(t.treatment_action);
    }
  }

  // Signed URLs so the (private) scan-images bucket can be shown in the browser.
  const urlByPath = new Map();
  const paths = [...new Set(data.map((r) => r.image_uri_path).filter(Boolean))];
  if (paths.length) {
    const { data: signed, error: signError } = await db.storage
      .from(SCAN_IMAGE_BUCKET)
      .createSignedUrls(paths, 3600);
    if (signError) {
      console.warn('Could not sign image URLs:', signError.message);
    } else {
      for (const item of signed) {
        if (item.signedUrl) urlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  res.status(200).json(data.map((row) => {
    const diseaseName = (one(row.disease_dictionary) || {}).disease_name || null;
    const detectedClass = classifyDisease(diseaseName);
    const actions = advisoryByDisease.get(row.disease_id) || [];
    return {
      id: row.id,
      short_id: String(row.id).slice(0, 8),
      source_local_id: row.source_local_id ?? null,
      scan_timestamp: row.scan_timestamp,
      confidence_pct: toPercent(row.confidence_score),
      disease_name: diseaseName,
      detected_class: detectedClass,
      risk_level: RISK_BY_CLASS[detectedClass],
      orchard_name: (one(row.orchards) || {}).orchard_name || null,
      image_url: row.image_uri_path ? (urlByPath.get(row.image_uri_path) || null) : null,
      advisory: actions.slice(0, 3).join('\n\n'),
    };
  }));
}));

app.get('/api/treatments', requireAdmin, wrap(async (req, res) => {
  const { data, error } = await db
    .from('treatment_recommendations')
    .select('id, source_local_id, treatment_action, expert_reference_name, article_source_url, updated_at, disease_dictionary ( disease_name )')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  res.status(200).json(data.map((row) => {
    const diseaseName = (one(row.disease_dictionary) || {}).disease_name || null;
    return {
      id: row.id,
      source_local_id: row.source_local_id ?? null,
      treatment_action: row.treatment_action,
      expert_reference_name: row.expert_reference_name,
      article_source_url: row.article_source_url,
      updated_at: row.updated_at,
      disease_name: diseaseName,
      detected_class: classifyDisease(diseaseName),
    };
  }));
}));

app.post('/api/treatments', requireAdmin, wrap(async (req, res) => {
  const { disease_class, treatment_action, expert_reference_name, article_source_url } = req.body || {};

  if (!['Healthy', 'Leaf Spot', 'Leaf Blight'].includes(disease_class)) {
    return res.status(400).json({ error: 'disease_class must be Healthy, Leaf Spot or Leaf Blight.' });
  }
  if (!treatment_action || !String(treatment_action).trim()) {
    return res.status(400).json({ error: 'treatment_action is required.' });
  }

  const { data: diseases, error: diseaseError } = await db
    .from('disease_dictionary')
    .select('id, disease_name');
  if (diseaseError) throw diseaseError;

  const match = diseases.find((d) => classifyDisease(d.disease_name) === disease_class);
  if (!match) {
    return res.status(400).json({
      error: `No disease_dictionary row found for "${disease_class}". Sync the Android app first.`,
    });
  }

  const { data, error } = await db
    .from('treatment_recommendations')
    .insert([{
      disease_id: match.id,
      treatment_action: String(treatment_action).trim(),
      expert_reference_name: expert_reference_name ? String(expert_reference_name).trim() : null,
      article_source_url: article_source_url ? String(article_source_url).trim() : null,
    }])
    .select()
    .single();
  if (error) throw error;

  res.status(201).json({ message: 'Treatment added.', data });
}));

app.delete('/api/treatments/:id', requireAdmin, wrap(async (req, res) => {
  const { error } = await db.from('treatment_recommendations').delete().eq('id', req.params.id);
  if (error) throw error;
  res.status(200).json({ message: 'Treatment deleted.' });
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`King's Sentry Admin Server is running on http://localhost:${PORT}`);
  if (!REQUIRE_ADMIN_AUTH) {
    console.warn('WARNING: REQUIRE_ADMIN_AUTH is not "true" - /api routes are NOT protected.');
  }
});