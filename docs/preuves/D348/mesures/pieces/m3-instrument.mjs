// M-3 (D348) — délais de la fiche et de la liste sur un BUILD DE PRODUCTION (next build + next start), valeur RÉELLE du cache (300 s).
// Instrument de mesure jetable : sa sortie et sa copie sont versées comme pièce.
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import pg from "pg";

const API = "http://localhost:3101/api/v1";
const CLIENT = "http://localhost:3100";
const DB = "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";
const T0 = Date.now();
const sec = () => Math.round((Date.now() - T0) / 1000);
const log = (m) => console.log(`[${String(sec()).padStart(4)} s] ${m}`);

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const l = Buffer.alloc(4);
  l.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(body));
  return Buffer.concat([l, body, c]);
}
function png(w, h, seed) {
  const hd = Buffer.alloc(13);
  hd.writeUInt32BE(w, 0);
  hd.writeUInt32BE(h, 4);
  hd[8] = 8;
  hd[9] = 2;
  const st = w * 3 + 1;
  const raw = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = y * st + 1 + x * 3;
      raw[o] = (x * 255) / w;
      raw[o + 1] = (y * 255) / h;
      raw[o + 2] = seed;
    }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", hd), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function api(method, path, token, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body !== undefined && !isForm ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), connection: "close" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    /* corps non JSON */
  }
  return { status: res.status, json, text };
}
async function compte(role) {
  const email = `m3-${randomUUID()}@example.dz`;
  const payload = role === "PRO" ? { role, email, password: "Motdepasse1", businessName: "Salle m3", phone: "+213550000001" } : { role, email, password: "Motdepasse1", firstName: "Aya", lastName: "Benali" };
  const r = await api("POST", "/auth/register", undefined, payload);
  if (r.status !== 201) throw new Error(`register ${r.status} ${r.text}`);
  const db = new pg.Client({ connectionString: DB });
  await db.connect();
  await db.query(`UPDATE users SET email_verified_at = now()${role === "CLIENT" ? ", role = 'ADMIN'" : ""} WHERE email = $1`, [email]);
  await db.end();
  const l = await api("POST", "/auth/login", undefined, { email, password: "Motdepasse1" });
  if (l.status !== 200) throw new Error(`login ${l.status}`);
  return l.json.accessToken;
}
const page = async (path) => {
  const r = await fetch(`${CLIENT}${path}`, { headers: { connection: "close" } });
  return { status: r.status, html: await r.text() };
};
const norm = (h) => h.replace(/(\d)[   ](?=\d)/g, "$1");
const photoKeys = (h) => new Set([...h.matchAll(/[a-z0-9-]{16,}\.webp/g)].map((m) => m[0]));

const tPro = await compte("PRO");
const tAdmin = await compte("CLIENT");
const wilayas = (await api("GET", "/wilayas")).json;
const cityId = wilayas.flatMap((w) => w.cities)[0].id;
let n = 0;
async function creer(label) {
  n += 1;
  const prix = 95_000 + n * 1_000;
  const nameFr = `M3 ${label} ${randomUUID().slice(0, 6)}`;
  const v = await api("POST", "/venues", tPro, { cityId, nameFr, nameAr: "قاعة", capacityMax: 300, basePriceCents: prix * 100, bookingMode: "SINGLE_SLOT" });
  if (v.status !== 201) throw new Error(v.text);
  const s = await api("POST", `/venues/${v.json.id}/slot-templates`, tPro, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: prix * 100 });
  if (s.status !== 201) throw new Error(s.text);
  return { id: v.json.id, slug: v.json.slug, nameFr, prix };
}
const publier = async (v) => {
  const r = await api("POST", `/admin/venues/${v.id}/publish`, tAdmin);
  if (r.status !== 200) throw new Error(`publish ${r.status} ${r.text}`);
};
const listeContient = async (v, nom) => {
  const r = await page(`/fr/salles?minPrice=${v.prix}&maxPrice=${v.prix}`);
  return r.html.includes(nom ?? v.nameFr);
};

// ── Mise en place
const V1 = await creer("v1-avant-publication");
const V2 = await creer("v2-modifiee");
const V3 = await creer("v3-masquee");
const V4 = await creer("v4-supprimee");
for (const v of [V2, V3, V4]) await publier(v);
const p1 = await page(`/fr/salles/${V1.slug}`);
log(`V1 (brouillon) fiche visitée AVANT publication : ${p1.status}`);
const avant = {};
for (const [k, v] of [["V2", V2], ["V3", V3], ["V4", V4]]) {
  const p = await page(`/fr/salles/${v.slug}`);
  avant[k] = p;
  log(`${k} fiche visitée (cache rempli) : ${p.status}`);
}
const cles2avant = photoKeys(avant.V2.html);
log(`V2 : clés de photo avant = ${cles2avant.size}`);

// ── t1 : les quatre actes, ensemble
const t1 = Date.now();
const depuis = () => Math.round((Date.now() - t1) / 1000);
const nouveauNom = `M3 v2 RENOMMEE ${randomUUID().slice(0, 6)}`;
const nouveauPrix = 123_456;
await publier(V1);
const r2 = await api("PATCH", `/venues/${V2.id}`, tPro, { nameFr: nouveauNom, basePriceCents: nouveauPrix * 100 });
if (r2.status !== 200) throw new Error(`patch ${r2.status} ${r2.text}`);
const form = new FormData();
form.append("file", new Blob([png(800, 600, 40)], { type: "image/png" }), "n.png");
const ph = await api("POST", `/venues/${V2.id}/photos`, tPro, form);
log(`photo ajoutée à V2 : ${ph.status}`);
log(`V3 masquée : ${(await api("PATCH", `/venues/${V3.id}`, tPro, { status: "HIDDEN" })).status} · V4 supprimée : ${(await api("DELETE", `/venues/${V4.id}`, tPro)).status}`);
log("t1 posé (T+0) : V1 publiée, V2 renommée+prix+photo, V3 masquée, V4 supprimée");

// ── La LISTE (sans cache) tout de suite
log(`LISTE immédiate : V1 présente=${await listeContient(V1)} · V2 nouveau nom présent=${await listeContient({ ...V2, prix: nouveauPrix }, nouveauNom)} · V3 présente=${await listeContient(V3)} · V4 présente=${await listeContient(V4)}`);

// ── La FICHE : on sonde toutes les 5 s jusqu'à ce que tout ait basculé (plafond 11 min)
const t = { v1: null, nom: null, prix: null, photo: null, v3: null, v4: null };
const fin = Date.now() + 11 * 60_000;
let dernierRappel = -1;
while (Date.now() < fin) {
  const [a, b, c, d] = await Promise.all([page(`/fr/salles/${V1.slug}`), page(`/fr/salles/${V2.slug}`), page(`/fr/salles/${V3.slug}`), page(`/fr/salles/${V4.slug}`)]);
  if (t.v1 === null && a.status === 200) {
    t.v1 = depuis();
    log(`V1 : la fiche passe de 404 à 200 à T+${t.v1} s`);
  }
  const hb = norm(b.html);
  if (t.nom === null && b.html.includes(nouveauNom)) {
    t.nom = depuis();
    log(`V2 : le NOUVEAU NOM est servi à T+${t.nom} s`);
  }
  if (t.prix === null && hb.includes(String(nouveauPrix))) {
    t.prix = depuis();
    log(`V2 : le NOUVEAU PRIX est servi à T+${t.prix} s`);
  }
  if (t.photo === null && photoKeys(b.html).size > cles2avant.size) {
    t.photo = depuis();
    log(`V2 : la NOUVELLE PHOTO est servie à T+${t.photo} s`);
  }
  if (t.v3 === null && c.status === 404) {
    t.v3 = depuis();
    log(`V3 (masquée) : la fiche passe de 200 à 404 à T+${t.v3} s`);
  }
  if (t.v4 === null && d.status === 404) {
    t.v4 = depuis();
    log(`V4 (supprimée) : la fiche passe de 200 à 404 à T+${t.v4} s`);
  }
  if (Object.values(t).every((x) => x !== null)) break;
  const minute = Math.floor(depuis() / 60);
  if (minute !== dernierRappel) {
    dernierRappel = minute;
    log(`… T+${depuis()} s : V1=${a.status} V2(nom nouveau=${b.html.includes(nouveauNom)}) V3=${c.status} V4=${d.status}`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
log(`BILAN ${JSON.stringify(t)}  (null = pas basculé dans la fenêtre de 11 min)`);
