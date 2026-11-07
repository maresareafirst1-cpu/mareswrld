/* =====================================================================
   Bénin Immersion — application
   Écrans : bienvenue → inscription / connexion → localisation → app
   Onglets : Accueil · Explorer · Carte · Voyage · Profil
   Données : data.js (sites), i18n.js (langues)
   Photos et articles : API publique de Wikipédia (chargés à la volée,
   mis en cache sur le téléphone).
   ===================================================================== */
'use strict';

const SITES = window.BI_SITES, CATS = window.BI_CATS, DEPS = window.BI_DEPARTMENTS, EVENTS = window.BI_EVENTS;
const LANGS = window.BI_LANGS, TR = window.BI_T;
const $app = document.getElementById('app');

/* ======================= stockage local ======================= */
const store = {
  get(k, d) { try { const v = localStorage.getItem('bi2_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bi2_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('bi2_' + k); } catch (e) {} }
};

/* ======================= état ======================= */
const S = {
  lang: store.get('lang', (navigator.language || 'fr').slice(0, 2)),
  user: store.get('session', null),
  screen: 'welcome', tab: 'home', detail: null, dtab: 'overview', sheet: null,
  q: '', cat: 'all', dep: '', free: false, unesco: false, near: false,
  mapCat: 'all', mapSel: null,
  pos: null, loc: 'idle', // idle | asking | on | denied | unavailable
  delArm: false, aboutOpen: false, slide: 0
};
if (!LANGS.find(l => l.code === S.lang)) S.lang = 'fr';
let UD = {favs: [], trip: [], visited: [], locOn: false};
const users = () => store.get('users', {});
function loadUser() { UD = Object.assign({favs: [], trip: [], visited: [], locOn: false}, store.get('u_' + S.user, {})); }
function saveUser() { if (S.user) store.set('u_' + S.user, UD); }

/* ======================= langue ======================= */
const LG = () => LANGS.find(l => l.code === S.lang) || LANGS[0];
const t = k => (TR[S.lang] && TR[S.lang][k]) ?? TR.fr[k] ?? k;
/* langue des fiches : français pour le français et les langues du Bénin, anglais sinon */
const CL = () => (S.lang === 'fr' || LG().local) ? 'fr' : 'en';
const locale = () => { try { return Intl.getCanonicalLocales(S.lang)[0] && new Intl.NumberFormat(S.lang) && S.lang; } catch (e) { return 'fr'; } };
const fmtN = (n, d = 0) => { try { return n.toLocaleString(locale(), {maximumFractionDigits: d, minimumFractionDigits: d}); } catch (e) { return n.toFixed(d); } };
/* texte d'un site dans la langue choisie : traduction (textes.js) si elle existe, sinon FR/EN */
const TXT = (s, code = S.lang) => (window.BI_TEXTS && BI_TEXTS[s.id] && BI_TEXTS[s.id][code]) || null;
const siteText = s => TXT(s) || s[CL()];
const nm = s => siteText(s).n;
const recFor = (s, code) => (s.audio && s.audio[code]) || (window.BI_AUDIO && BI_AUDIO[s.id] && BI_AUDIO[s.id][code]) || null;
const hasRec = code => !!(window.BI_AUDIO && Object.values(BI_AUDIO).some(v => v[code]));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SITE = id => SITES.find(s => s.id === id);

/* ======================= icônes ======================= */
const IC = {
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', door: '<path d="M4 21V9a8 8 0 0 1 16 0v12"/><path d="M9 21v-6a3 3 0 0 1 6 0v6M2 21h20"/>',
  spark: '<path d="M12 3l2.2 6.2L20 11l-5.8 1.8L12 19l-2.2-6.2L4 11l5.8-1.8z"/>', leaf: '<path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19l8-8"/>',
  wave: '<path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0"/><path d="M2 18c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0"/><path d="M12 3v5"/>',
  museum: '<path d="M3 21h18M4 10h16M12 3 3 8h18zM6 10v8M10 10v8M14 10v8M18 10v8"/>', bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>', nav: '<path d="M3 11 21 3l-8 18-2-8z"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.4-9C1.2 8 3.4 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.6 0 5.8 3.5 4.4 7-1.9 4.4-9.4 9-9.4 9z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>',
  vol: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>', pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="m15 18-6-6 6-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>', compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.4 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2.2-3 1-3 2.3 1.3 2 3 2 3-.6 3-2M12 6v1.5M12 16.5V18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  car: '<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/>', walk: '<circle cx="13" cy="4" r="2"/><path d="m10 22 2-7-3-3 1-5 4 3 3 1"/><path d="m9 12-2 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>', passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', cube: '<path d="M12 2.5 21 7.5v9l-9 5-9-5v-9z"/><path d="M12 21.5V12M21 7.5l-9 4.5-9-4.5"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
};
const ic = (n, s = 20, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
const LOGO = (s = 38) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#E8336E"/><path d="M11 37V21h26v16h-7v-8a6 6 0 0 0-12 0v8z" fill="#fff"/><rect x="11" y="15" width="26" height="4" rx="1.5" fill="#fff"/><circle cx="34" cy="10" r="4" fill="#FFD1E0"/></svg>`;

/* ======================= géographie ======================= */
function km(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const ROAD = 1.3; // facteur route / vol d'oiseau
const distTxt = s => S.pos ? `${fmtN(km(S.pos, s), km(S.pos, s) < 10 ? 1 : 0)} ${t('km')}` : '';
function etaTxt(k, speed) { const m = Math.round(k * ROAD / speed * 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; }
function nearestTown() {
  if (!S.pos) return '';
  let best = null, bd = 1e9; SITES.forEach(s => { const d = km(S.pos, s); if (d < bd) { bd = d; best = s; } });
  return bd < 40 ? best.town.split(' (')[0].split(' / ')[0] : `${S.pos.lat.toFixed(3)}, ${S.pos.lon.toFixed(3)}`;
}

/* ======================= photos & articles Wikipédia ======================= */
const WCACHE = store.get('wiki', {});
const pending = new Set(); let queue = [], running = 0;
const wapi = (lang, params) => `https://${lang}.wikipedia.org/w/api.php?format=json&origin=*&` + new URLSearchParams(params).toString();
async function wikiLookup(site) {
  const tryLang = async lang => {
    const r = await fetch(wapi(lang, {action: 'query', generator: 'search', gsrsearch: site.wiki, gsrlimit: 1, prop: 'pageimages|info|langlinks', piprop: 'thumbnail', pithumbsize: 1100, inprop: 'url', lllimit: 500}));
    const j = await r.json(); const p = j.query && Object.values(j.query.pages || {})[0]; if (!p) return null;
    const links = {}; (p.langlinks || []).forEach(l => { links[l.lang] = l['*']; });
    return {img: p.thumbnail ? p.thumbnail.source : null, title: p.title, url: p.fullurl, lang, links};
  };
  let info = null, reached = false;
  try { info = await tryLang('fr'); reached = true; } catch (e) {}
  if (!info || !info.img) { try { const en = await tryLang('en'); reached = true; if (en && (en.img || !info)) info = Object.assign({}, en, {links: Object.assign({}, info ? info.links : {}, en.links, info ? {fr: info.title} : {})}); } catch (e) {} }
  if (!reached) throw new Error('offline'); // pas de réseau : on réessaiera plus tard
  return info;
}
function pump() {
  while (running < 4 && queue.length) {
    const s = queue.shift(); running++;
    wikiLookup(s).then(async info => { info = info || {img: null}; info.t = Date.now(); WCACHE[s.id] = info; if (!info.img) { const ph = await loadPhotos(s); if (ph[0]) info.img = ph[0].u; } WCACHE[s.id] = info; store.set('wiki', WCACHE); if (info.img) applyImg(s.id, info.img); })
      .catch(() => {}).finally(() => { running--; pending.delete(s.id); pump(); });
  }
}
function want(id) { const w = WCACHE[id]; if ((w && (w.img || Date.now() - (w.t || 0) < 6 * 3600e3)) || pending.has(id)) return; const s = SITE(id); if (!s) return; pending.add(id); queue.push(s); pump(); }
function applyImg(id, url) {
  const im = new Image();
  im.onload = () => document.querySelectorAll(`[data-img="${id}"]`).forEach(el => { el.style.setProperty('--img', `url("${url}")`); el.classList.add('loaded'); });
  im.src = url;
}
function hydrate() {
  document.querySelectorAll('[data-img]').forEach(el => {
    const id = el.dataset.img, w = WCACHE[id];
    if (w && w.img) { if (!el.classList.contains('loaded')) applyImg(id, w.img); } else want(id);
  });
}
/* couverture : dégradé de la catégorie + icône, remplacée par la photo dès qu'elle arrive */
function cover(s, cls = '', size = 46, extra = '') {
  const c = CATS[s.cat].color, w = WCACHE[s.id];
  const loaded = w && w.img ? ` loaded" style="--img:url('${w.img.replace(/'/g, '%27')}');background-image:linear-gradient(135deg,${c},#FF9CBE)` : `" style="background-image:linear-gradient(135deg,${c},#FF9CBE)`;
  return `<div class="cover ${cls}${loaded}" data-img="${s.id}"><span class="ph-icon">${ic(CATS[s.cat].icon, size, 1.6)}</span>${extra}</div>`;
}
/* ======================= photos : Wikipédia + Wikimedia Commons ======================= */
/* mots-clés de recherche des photos libres pour chaque site */
const PHOTO_Q = {porte: 'Porte du non-retour Ouidah', route: 'Ouidah route des esclaves', pythons: 'Temple des pythons Ouidah', basilique: 'Basilique Ouidah',
  fort: 'Fort Ouidah musée histoire', kpasse: 'Kpasse Ouidah', zinsou: 'Fondation Zinsou Ouidah', zoungbodji: 'Zoungbodji Ouidah', lama: 'Lama forest Benin',
  ganvie: 'Ganvie', amazone: 'Amazone Cotonou statue', dantokpa: 'Dantokpa', cathedrale: 'Cathédrale Notre-Dame Cotonou', etoile: 'Étoile rouge Cotonou',
  fidjrosse: 'Fidjrosse Cotonou plage', artisanat: 'artisanat Cotonou', bioguera: 'Bio Guéra statue', honme: 'Honme Porto-Novo', adande: 'musée ethnographique Porto-Novo',
  mosquee: 'grande mosquée Porto-Novo', jpn: 'jardin des plantes Porto-Novo', dasilva: 'Da Silva Porto-Novo', adjarra: 'Adjarra', ketou: 'Ketou Benin',
  abomey: 'Palais royaux Abomey', behanzin: 'Behanzin statue Abomey', agongointo: 'Agongointo', dassa: 'Dassa-Zoume', savalou: 'Savalou',
  aheme: 'lac Aheme', boucheroy: 'Bouche du Roy Benin', grandpopo: 'Grand-Popo', pendjari: 'Pendjari', parcw: 'W National Park Benin', tanougou: 'Tanougou',
  kota: 'Kota falls Natitingou', tata: 'Tata somba', natitingou: 'Natitingou', taneka: 'Taneka Benin', nikki: 'Nikki Benin'};
const PCACHE = store.get('photos', {});
const commonsApi = p => 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&' + new URLSearchParams(p).toString();
const BADIMG = /(logo|flag|drapeau|map|carte|icon|blason|coat.of.arms|locator|signature|\.svg)/i;
const stripTags = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
async function loadPhotos(s) {
  const c = PCACHE[s.id]; if (c && c.list && c.list.length && c.t > Date.now() - 14 * 864e5) return c.list;
  const out = [], seen = new Set();
  const push = p => {
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !/jpe?g/i.test(ii.mime || '') || BADIMG.test(p.title) || seen.has(p.title)) return;
    seen.add(p.title); const m = ii.extmetadata || {};
    out.push({u: ii.thumburl || ii.url, page: ii.descriptionurl, by: stripTags(m.Artist && m.Artist.value).slice(0, 60), lic: stripTags(m.LicenseShortName && m.LicenseShortName.value)});
  };
  const iiP = {prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: 1200, iiextmetadatafilter: 'Artist|LicenseShortName'};
  const info = WCACHE[s.id];
  if (info && info.img) out.push({u: info.img, page: info.url, by: '', lic: 'Wikipédia'}), seen.add('__main');
  if (info && info.title) { // photos de l'article Wikipédia
    try { const r = await fetch(wapi(info.lang, Object.assign({action: 'query', titles: info.title, generator: 'images', gimlimit: 40}, iiP))); const j = await r.json(); Object.values((j.query && j.query.pages) || {}).forEach(push); } catch (e) {}
  }
  try { // recherche dans Wikimedia Commons
    const r = await fetch(commonsApi(Object.assign({action: 'query', generator: 'search', gsrnamespace: 6, gsrsearch: (PHOTO_Q[s.id] || s.wiki) + ' filetype:bitmap', gsrlimit: 24}, iiP)));
    const j = await r.json(); Object.values((j.query && j.query.pages) || {}).sort((x, y) => (x.index || 0) - (y.index || 0)).forEach(push);
  } catch (e) {}
  const list = out.filter((p, i, arr) => arr.findIndex(q => q.u === p.u) === i).slice(0, 18);
  if (list.length) { PCACHE[s.id] = {t: Date.now(), list}; store.set('photos', PCACHE); }
  return list;
}
/* photos personnelles : enregistrées sur le téléphone (IndexedDB) */
const IDB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('bi2', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos', {keyPath: 'id'}); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async all() { const db = await this.open(); return new Promise(res => { const q = db.transaction('photos').objectStore('photos').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); },
  async put(o) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(o); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async del(id) { const db = await this.open(); return new Promise(res => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = res; tx.onerror = res; }); }
};
async function myPhotos(siteId) { try { return (await IDB.all()).filter(p => p.user === S.user && (!siteId || p.site === siteId)).sort((x, y) => x.at - y.at); } catch (e) { return []; } }
function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', .85); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); }; im.src = url;
  });
}
let GAL = [], MINE = [], MINEURLS = [];
async function renderMine(s) {
  const g = document.getElementById('mygrid'); if (!g) return;
  MINEURLS.forEach(u => URL.revokeObjectURL(u));
  MINE = await myPhotos(s.id); MINEURLS = MINE.map(p => URL.createObjectURL(p.blob));
  g.innerHTML = MINE.length ? MINE.map((p, i) => `<div class="ph mine" style="background-image:url('${MINEURLS[i]}')"><button class="open" data-myphoto="${i}" aria-label="${t('photos')} ${i + 1}"></button><button class="del" data-delph="${p.id}" aria-label="${t('remove')}">${ic('trash', 14)}</button></div>`).join('')
    : `<p class="muted" style="grid-column:1/-1;margin:0;font-size:13.5px">${t('myPhotosNone')}</p>`;
}
/* visionneuse plein écran */
function openLB(items, i) {
  closeLB(); if (!items.length) return;
  const el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="lbtrack" id="lbt">${items.map(p => `<figure><img src="${p.u}" alt="" loading="lazy"><figcaption>${p.by ? esc(p.by) + ' · ' : ''}${esc(p.lic || '')}${p.page ? ` <a href="${p.page}" target="_blank" rel="noopener">${t('source')} ${ic('ext', 12)}</a>` : ''}</figcaption></figure>`).join('')}</div>
    <button class="iconbtn lbx" data-act="closelb" aria-label="x">${ic('x')}</button><span class="pill lbn num"><span id="lbn">${i + 1}</span> / ${items.length}</span>`;
  $app.appendChild(el);
  const tr = el.querySelector('#lbt'); requestAnimationFrame(() => { tr.scrollLeft = i * tr.clientWidth; });
  tr.addEventListener('scroll', () => { const n = document.getElementById('lbn'); if (n) n.textContent = Math.min(items.length, Math.round(Math.abs(tr.scrollLeft) / tr.clientWidth) + 1); });
}
function closeLB() { document.querySelector('.lb')?.remove(); }
async function loadExtract(s, lc) {
  const info = WCACHE[s.id]; const code = lc ? langOf(lc).wiki : LG().wiki;
  if (!info || !info.title) return null;
  const title = code === info.lang ? info.title : info.links && info.links[code];
  if (!title) return null;
  try {
    const r = await fetch(wapi(code, {action: 'query', prop: 'extracts', exintro: 1, explaintext: 1, redirects: 1, titles: title}));
    const j = await r.json(); const p = Object.values(j.query.pages)[0];
    return p && p.extract ? {text: p.extract, url: `https://${code}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`} : null;
  } catch (e) { return null; }
}

/* ======================= comptes (stockés sur l'appareil) ======================= */
async function hash(email, pwd) {
  const txt = 'bi2|' + email.toLowerCase() + '|' + pwd;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 5381; for (const c of txt) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'x' + h.toString(16); }
}
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const COUNTRIES = ['BJ', 'TG', 'NG', 'GH', 'CI', 'SN', 'BF', 'NE', 'ML', 'CM', 'GA', 'CD', 'FR', 'BE', 'CH', 'CA', 'US', 'BR', 'DE', 'GB', 'IT', 'ES', 'PT', 'NL', 'CN', 'JP', 'RU', 'MA', 'DZ', 'TN', 'EG', 'KE', 'ZA'];
const countryName = c => { try { return new Intl.DisplayNames([locale(), 'fr'], {type: 'region'}).of(c); } catch (e) { return c; } };

/* ======================= navigation ======================= */
function go(screen) { S.screen = screen; render(); }
function setTab(tab) { stopSpeech(); destroyMaps(); if (tab !== S.tab) S.prevTab = S.tab; S.tab = tab; S.detail = null; render(); $app.querySelector('.scroll')?.scrollTo(0, 0); }
function openSite(id) { stopSpeech(); S.alang = null; S.detail = id; S.dtab = 'overview'; S.mapSel = S.tab === 'map' ? id : S.mapSel; renderDetail(); try { history.replaceState(null, '', '#' + id); } catch (e) {} }
function closeSite() { close3D(); closeLB(); stopSpeech(); destroyMini(); S.detail = null; document.querySelector('.detail')?.remove(); try { history.replaceState(null, '', location.pathname); } catch (e) {} if (S.tab !== 'map') render(); }
let toastT;
function toast(msg, icon = 'check') {
  clearTimeout(toastT); document.querySelector('.toast')?.remove();
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = `${ic(icon, 18)}<span>${esc(msg)}</span>`;
  $app.appendChild(d); toastT = setTimeout(() => d.remove(), 2600);
}

/* ======================= écrans d'accueil ======================= */
const SLIDES = ['porte', 'abomey', 'ganvie', 'pendjari', 'mosquee', 'tata'];
function vWelcome() {
  return `<section class="welcome">
    <div class="slides">${SLIDES.map((id, i) => { const s = SITE(id); return `<div class="slide ${i === S.slide ? 'on' : ''} cover" data-img="${id}" style="background-image:linear-gradient(160deg,${CATS[s.cat].color},#3A0F22)"></div>`; }).join('')}
      <div class="top"><div class="brand">${LOGO()}<span>Bénin Immersion</span></div><button class="langbtn" data-act="langs">${ic('globe', 16)} ${esc(LG().name)}</button></div></div>
    <div class="copy"><h1>${t('welcomeT').replace(/(Bénin|Benin|Benín|Benim|Бенин|بنين|贝宁|ベナン|Bẹ̀nẹ̀)/, '<span>$1</span>')}</h1><p>${t('welcomeP')}</p>
      <div class="dots">${SLIDES.map((_, i) => `<i class="${i === S.slide ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="cta"><button class="btn" data-go="signup">${t('signup')}</button><button class="btn light" data-go="login">${t('login')}</button></div>
  </section>`;
}
let slideT;
function startSlides() {
  clearInterval(slideT);
  slideT = setInterval(() => {
    if (S.screen !== 'welcome') return clearInterval(slideT);
    S.slide = (S.slide + 1) % SLIDES.length;
    document.querySelectorAll('.welcome .slide').forEach((el, i) => el.classList.toggle('on', i === S.slide));
    document.querySelectorAll('.welcome .dots i').forEach((el, i) => el.classList.toggle('on', i === S.slide));
  }, 4200);
}
function vAuth(mode) {
  const head = SITE(mode === 'signup' ? 'ganvie' : 'abomey');
  const pwdField = `<div class="field"><label for="pwd">${t('password')}</label><div class="input">${ic('lock', 18)}<input id="pwd" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="6"><button type="button" data-act="showpwd" aria-label="${t('password')}">${ic('eye', 18)}</button></div><div class="err" id="e-pwd"></div></div>`;
  return `<section class="auth"><div class="head cover" data-img="${head.id}" style="background-image:linear-gradient(160deg,${CATS[head.cat].color},#FF9CBE)"><button class="iconbtn" data-go="welcome" aria-label="Retour">${ic('back')}</button></div>
    <form class="body" id="authform" novalidate>
      <div class="brand" style="color:var(--rose-dark)">${LOGO(34)}<span>Bénin Immersion</span></div>
      <h2>${mode === 'signup' ? t('signup') : t('welcomeBack')}</h2>
      ${mode === 'signup' ? `<div class="field"><label for="name">${t('firstName')}</label><div class="input">${ic('user', 18)}<input id="name" autocomplete="given-name" required></div><div class="err" id="e-name"></div></div>` : ''}
      <div class="field"><label for="email">${t('email')}</label><div class="input">${ic('mail', 18)}<input id="email" type="email" autocomplete="email" inputmode="email" required></div><div class="err" id="e-email"></div></div>
      ${pwdField}
      ${mode === 'signup' ? `<div class="field"><label for="country">${t('country')}</label><div class="input">${ic('flag', 18)}<select id="country">${COUNTRIES.map(c => `<option value="${c}">${esc(countryName(c))}</option>`).join('')}</select></div></div>
      <label class="check"><input type="checkbox" id="accept"> <span>${t('accept')}</span></label><div class="err" id="e-accept"></div>` : `<button type="button" class="btn ghost sm" data-act="forgot" style="align-self:flex-start;padding:0">${t('forgot')}</button>`}
      <button class="btn" type="submit">${mode === 'signup' ? t('createAccount') : t('signin')}</button>
      <button type="button" class="btn ghost switch" data-go="${mode === 'signup' ? 'login' : 'signup'}">${mode === 'signup' ? t('haveAccount') : t('noAccount')}</button>
    </form></section>`;
}
async function submitAuth(mode) {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const setE = (id, m) => { const e = document.getElementById('e-' + id); if (e) e.textContent = m; };
  ['name', 'email', 'pwd', 'accept'].forEach(k => setE(k, ''));
  const email = v('email').toLowerCase(), pwd = document.getElementById('pwd').value; let ok = true;
  if (mode === 'signup' && !v('name')) { setE('name', t('errName')); ok = false; }
  if (!emailOk(email)) { setE('email', t('errEmail')); ok = false; }
  if (pwd.length < 6) { setE('pwd', t('errPwd')); ok = false; }
  if (mode === 'signup' && !document.getElementById('accept').checked) { setE('accept', t('errAccept')); ok = false; }
  if (!ok) return;
  const all = users(), h = await hash(email, pwd);
  if (mode === 'signup') {
    if (all[email]) { setE('email', t('errExists')); return; }
    all[email] = {name: v('name'), country: v('country'), hash: h, created: Date.now()}; store.set('users', all);
    S.user = email; store.set('session', email); loadUser(); go('perm');
  } else {
    if (!all[email] || all[email].hash !== h) { setE('pwd', t('errLogin')); return; }
    S.user = email; store.set('session', email); loadUser();
    if (UD.locOn) startWatch(); go('app');
  }
}
function vPerm() {
  return `<section class="perm"><div class="orb">${ic('nav', 58, 1.8)}</div><h2>${t('locT')}</h2><p>${t('locP')}</p>
    <button class="btn" data-act="allowloc" style="margin-top:10px">${ic('target', 18)} ${t('allow')}</button><button class="btn ghost" data-act="laterloc">${t('later')}</button></section>`;
}

/* ======================= onglet Accueil ======================= */
const me = () => users()[S.user] || {name: '?'};
const initials = n => (n || '?').trim().slice(0, 1).toUpperCase();
function liveChip() {
  const on = S.loc === 'on' && S.pos;
  return `<button class="livechip ${on ? '' : 'off'}" data-act="${on ? 'gomap' : 'allowloc'}"><span class="dot"></span><span id="livetxt">${on ? esc(nearestTown()) : (S.loc === 'asking' ? t('locating') : t('locOff'))}</span></button>`;
}
function siteRow(s) {
  return `<button class="row" data-site="${s.id}">${cover(s, '', 34)}<span class="tx"><b>${esc(nm(s))}</b><small>${esc(s.town)} · ${esc(s.dep)}</small>
    <span class="bot"><span class="pill cat" style="background:${CATS[s.cat].color}">${t('cat_' + s.cat)}</span>${s.unesco ? `<span class="pill gold">${ic('star', 11, 2.5)} UNESCO</span>` : ''}<span class="dist" data-dist="${s.id}">${S.pos ? ic('nav', 12, 2.5) + ' ' + distTxt(s) : ''}</span></span></span>${ic('chev', 18, 2.5).replace('<svg', '<svg class="chev"')}</button>`;
}
function feature(s) {
  const fav = UD.favs.includes(s.id);
  return `<button class="feature" data-site="${s.id}">${cover(s, '', 60, `<span class="tag">${s.unesco ? `<span class="pill gold">${ic('star', 11, 2.5)} UNESCO</span>` : `<span class="pill">${t('cat_' + s.cat)}</span>`}</span>
    <span class="iconbtn favb ${fav ? 'on' : ''}" data-fav="${s.id}" role="button" aria-label="${t('save')}">${ic('heart', 18)}</span>
    <span class="meta"><b>${esc(nm(s))}</b><small>${ic('pin', 13)} ${esc(s.town)}<span data-dist="${s.id}">${S.pos ? ' · ' + distTxt(s) : ''}</span></small></span>`)}</button>`;
}
function vHome() {
  const u = me(), near = S.pos ? [...SITES].sort((a, b) => km(S.pos, a) - km(S.pos, b)).slice(0, 5) : [];
  const months = i => { try { return new Intl.DateTimeFormat(locale(), {month: 'short'}).format(new Date(2026, i, 1)); } catch (e) { return String(i + 1); } };
  return `<div class="scroll fade">
    <div class="hdr"><div class="avatar">${esc(initials(u.name))}</div><div class="who"><small>${t('hello')},</small><b>${esc(u.name)}</b></div>${langPill()}${liveChip()}</div>
    <div class="pad" style="margin-top:6px"><div class="searchbar">${ic('search', 20)}<button class="fake" data-act="gosearch">${t('searchPh')}</button></div></div>
    <div class="sec"><div class="sech"><h3>${t('mustSee')}</h3><button data-act="seeall">${t('seeAll')}</button></div>
      <div class="hs">${SITES.filter(s => s.top).map(feature).join('')}</div></div>
    <div class="sec"><div class="sech"><h3>${t('inPictures')}</h3></div>
      <div class="mosaic">${['ganvie', 'abomey', 'pendjari', 'mosquee', 'tata', 'pythons', 'aheme', 'dantokpa'].map(id => { const s = SITE(id); return `<button data-site="${id}" aria-label="${esc(nm(s))}">${cover(s, '', 30, `<span class="mcap">${esc(nm(s).split(',')[0])}</span>`)}</button>`; }).join('')}</div></div>
    <div class="sec"><div class="sech"><h3>${t('categories')}</h3></div>
      <div class="cats">${Object.keys(CATS).map(c => `<button data-cat="${c}"><i style="background:${CATS[c].color}">${ic(CATS[c].icon, 22)}</i>${t('cat_' + c)}</button>`).join('')}</div></div>
    <div class="sec"><div class="sech"><h3>${t('nearYou')}</h3>${S.pos ? `<button data-act="gonear">${t('seeAll')}</button>` : ''}</div>
      ${S.pos ? `<div class="list">${near.map(siteRow).join('')}</div>` : `<div class="locprompt">${ic('nav', 30)}<div><b>${t('locT')}</b>${t('locP')}</div><button class="btn sm" data-act="allowloc">${t('enableLoc')}</button></div>`}</div>
    <div class="sec"><div class="sech"><h3>${t('unesco')}</h3></div><div class="list">${SITES.filter(s => s.unesco).map(siteRow).join('')}</div></div>
    <div class="sec"><div class="sech"><h3>${t('regions')}</h3><small>${SITES.length} ${t('sites')}</small></div>
      <div class="deps">${DEPS.map(d => { const n = SITES.filter(s => s.dep === d).length; return `<button data-dep="${esc(d)}" ${n ? '' : 'disabled style="opacity:.45"'}><b>${esc(d)}</b><small class="num">${n} ${t('sites')}</small></button>`; }).join('')}</div></div>
    <div class="sec"><div class="sech"><h3>${t('agenda')}</h3></div>
      <div class="events">${EVENTS.map(e => `<button class="event" data-site="${e.site}"><span class="date">${e.month >= 0 ? `<b>${e.day || '•'}</b><small>${esc(months(e.month))}</small>` : `${ic('cal', 22)}`}</span><span class="tx"><b>${esc(e[CL()].n)}</b><small>${esc(e[CL()].d)}${e.month < 0 ? ' · ' + t('lunar') : ''}</small></span></button>`).join('')}</div></div>
    <p class="note pad" style="margin-top:22px">${ic('info', 14)} ${t('aboutP')}</p>
  </div>`;
}

/* ======================= onglet Explorer (base de données) ======================= */
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
function results() {
  const q = norm(S.q).trim();
  let r = SITES.filter(s => (S.cat === 'all' || s.cat === S.cat) && (!S.dep || s.dep === S.dep) && (!S.free || s.fee === 0) && (!S.unesco || s.unesco));
  if (q) r = r.filter(s => q.split(/\s+/).every(w => norm([s.fr.n, s.en.n, (TXT(s) || {}).n || '', s.town, s.dep, t('cat_' + s.cat), s.fr.d, s.en.d].join(' ')).includes(w)));
  if (S.near && S.pos) r.sort((a, b) => km(S.pos, a) - km(S.pos, b));
  else r.sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || nm(a).localeCompare(nm(b)));
  return r;
}
function resultsHTML() {
  const r = results();
  return `<div class="count num">${r.length} ${t('results')}</div>${r.length ? `<div class="list">${r.map(siteRow).join('')}</div>` : `<div class="empty">${ic('search', 34)}<span>${t('noResults')}</span><button class="btn sm" data-act="resetf">${t('clear')}</button></div>`}`;
}
function vExplore() {
  return `<div class="scroll fade" id="exscroll">
    <div class="titlebar">${S.from ? `<button class="iconbtn" data-act="exback" aria-label="${t('back')}">${ic('back')}</button>` : ''}<h2>${S.cat !== 'all' ? t('cat_' + S.cat) : S.dep ? esc(S.dep) : t('explore')}</h2>${langPill()}${liveChip()}</div>
    <div class="sticky"><div class="searchbar">${ic('search', 20)}<input id="q" type="search" value="${esc(S.q)}" placeholder="${t('searchPh')}" autocomplete="off" aria-label="${t('searchPh')}">${S.q ? `<button class="clear" data-act="clearq">${t('clear')}</button>` : ''}</div>
      <div class="chips"><button class="chip ${S.cat === 'all' ? 'on' : ''}" data-fcat="all">${t('all')}</button>${Object.keys(CATS).map(c => `<button class="chip ${S.cat === c ? 'on' : ''}" data-fcat="${c}"><span class="sw" style="background:${S.cat === c ? '#fff' : CATS[c].color}"></span>${t('cat_' + c)}</button>`).join('')}</div>
      <div class="filters"><select id="dep" aria-label="${t('department')}"><option value="">${t('department')} · ${t('all')}</option>${DEPS.map(d => `<option ${S.dep === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <button class="chip ${S.near ? 'on' : ''}" data-tog="near">${ic('nav', 13, 2.5)} ${t('nearMe')}</button>
        <button class="chip ${S.free ? 'on' : ''}" data-tog="free">${t('freeOnly')}</button>
        <button class="chip ${S.unesco ? 'on' : ''}" data-tog="unesco">${ic('star', 13, 2.5)} UNESCO</button></div></div>
    <div id="results">${resultsHTML()}</div>
  </div>`;
}
function refreshResults() { const el = document.getElementById('results'); if (el) { el.innerHTML = resultsHTML(); hydrate(); } }

/* ======================= onglet Carte (temps réel) ======================= */
let map = null, mapMarkers = {}, meMark = null, meAcc = null, follow = false;
S.mapStyle = store.get('mapStyle', 'plan'); // benin | plan | sat
const GEO = window.BI_GEO || {countries: [], deps: [], rivers: [], lakes: []};
const DEPNAME = {Kouffo: 'Couffo', Atakora: 'Atacora'};
/* villes principales (repères) */
const CITIES = [['Cotonou', 6.3654, 2.4183, 1], ['Porto-Novo', 6.4969, 2.6289, 1], ['Parakou', 9.3372, 2.6303, 1], ['Abomey-Calavi', 6.4486, 2.3557, 2], ['Ouidah', 6.3631, 2.0851, 2],
  ['Grand-Popo', 6.2833, 1.8167, 3], ['Lokossa', 6.6386, 1.7167, 2], ['Abomey', 7.1829, 1.9912, 2], ['Bohicon', 7.1782, 2.0667, 3], ['Kétou', 7.3633, 2.6000, 3], ['Pobè', 6.9800, 2.6600, 3],
  ['Dassa-Zoumè', 7.7500, 2.1800, 2], ['Savalou', 7.9300, 1.9800, 3], ['Savè', 8.0300, 2.4900, 3], ['Nikki', 9.9400, 3.2100, 3], ['Djougou', 9.7085, 1.6660, 2], ['Natitingou', 10.3042, 1.3796, 2],
  ['Tanguiéta', 10.6212, 1.2648, 3], ['Kandi', 11.1342, 2.9386, 2], ['Malanville', 11.8619, 3.3862, 2], ['Bembèrèkè', 10.2283, 2.6633, 3], ['Aplahoué', 6.9300, 1.6800, 3],
  ['Allada', 6.6650, 2.1510, 3], ['Bassila', 9.0083, 1.6654, 3], ['Banikoara', 11.3000, 2.4400, 3], ['Boukoumbé', 10.1800, 1.1000, 3]];
/* grands axes routiers (tracés simplifiés) */
const ROADS = [
  [[6.25, 1.70], [6.2833, 1.8167], [6.3631, 2.0851], [6.3654, 2.4183], [6.4969, 2.6289], [6.43, 2.70]],
  [[6.3654, 2.4183], [6.4486, 2.3557], [6.665, 2.151], [7.1782, 2.0667], [7.75, 2.18], [7.97, 2.24], [8.03, 2.49], [8.88, 2.60], [9.3372, 2.6303], [10.2283, 2.6633], [11.1342, 2.9386], [11.8619, 3.3862]],
  [[7.75, 2.18], [7.93, 1.98], [9.0083, 1.6654], [9.7085, 1.666], [10.3042, 1.3796], [10.6212, 1.2648], [11.04, 0.97]],
  [[9.3372, 2.6303], [9.55, 2.10], [9.7085, 1.666]],
  [[6.40, 1.88], [6.6386, 1.7167], [6.93, 1.68]],
  [[6.4969, 2.6289], [6.98, 2.66], [7.3633, 2.60]],
  [[9.3372, 2.6303], [9.94, 3.21]]];
/* lagunes et lacs du sud (contours simplifiés) */
const WATERS = [
  [[6.400, 2.365], [6.428, 2.352], [6.462, 2.380], [6.478, 2.430], [6.470, 2.500], [6.445, 2.520], [6.415, 2.500], [6.400, 2.450]],
  [[6.430, 1.975], [6.500, 1.940], [6.600, 1.930], [6.680, 1.960], [6.670, 1.985], [6.580, 1.975], [6.480, 2.000], [6.432, 1.995]],
  [[6.462, 2.520], [6.478, 2.560], [6.480, 2.640], [6.470, 2.660], [6.458, 2.600], [6.452, 2.540]]];
function addBase(m, full = true) {
  // fond vectoriel (sous les tuiles) : visible même sans Internet
  m.createPane('base'); m.getPane('base').style.zIndex = 150;
  m.createPane('lines'); m.getPane('lines').style.zIndex = 380; m.getPane('lines').style.pointerEvents = 'none';
  L.geoJSON(GEO.countries, {pane: 'base', interactive: false, style: f => ({stroke: true, color: '#E7C9D5', weight: 1, fillColor: f.properties.id === '204' ? '#FFFFFF' : '#F6ECF0', fillOpacity: 1})}).addTo(m);
  L.geoJSON(GEO.lakes, {pane: 'base', interactive: false, style: {stroke: false, fillColor: '#BFE0F2', fillOpacity: 1}}).addTo(m);
  WATERS.forEach(w => L.polygon(w, {pane: 'base', interactive: false, stroke: false, fillColor: '#BFE0F2', fillOpacity: 1}).addTo(m));
  L.geoJSON(GEO.rivers, {pane: 'base', interactive: false, style: {color: '#9CCDE8', weight: 2}}).addTo(m);
  ROADS.forEach(r => { L.polyline(r, {pane: 'base', interactive: false, color: '#F2C6D6', weight: 4, lineCap: 'round'}).addTo(m); L.polyline(r, {pane: 'base', interactive: false, color: '#FFFFFF', weight: 2}).addTo(m); });
  // départements et frontière (au-dessus des tuiles)
  const depLayer = L.geoJSON(GEO.deps, {pane: full ? 'overlayPane' : 'lines', interactive: full,
    style: {color: '#E8336E', weight: 1.4, opacity: .55, dashArray: '4 4', fillColor: '#E8336E', fillOpacity: 0},
    onEachFeature: (f, layer) => {
      if (!full) return;
      const name = DEPNAME[f.properties.name] || f.properties.name, n = SITES.filter(x => x.dep === name).length;
      layer.on('mouseover', () => layer.setStyle({fillOpacity: .07})).on('mouseout', () => layer.setStyle({fillOpacity: 0}));
      layer.bindPopup(`<div class="deppop"><b>${esc(name)}</b><small>${n} ${t('sites')}</small>${n ? `<button class="btn sm" data-dep="${esc(name)}" data-from="map">${t('seeAll')}</button>` : ''}</div>`, {closeButton: false});
    }}).addTo(m);
  L.geoJSON(GEO.countries.filter(f => f.properties.id === '204'), {pane: 'lines', interactive: false, style: {color: '#B8174F', weight: 2.5, fill: false}}).addTo(m);
  if (!full) return;
  // étiquettes : départements, villes
  const labels = L.layerGroup().addTo(m);
  const drawLabels = () => {
    labels.clearLayers(); const z = m.getZoom();
    if (z <= 9) depLayer.eachLayer(l => { const name = DEPNAME[l.feature.properties.name] || l.feature.properties.name, c = l.getBounds().getCenter();
      L.marker(c, {interactive: false, keyboard: false, icon: L.divIcon({className: 'deplabel', html: `<span>${esc(name.toUpperCase())}</span>`, iconSize: [120, 16], iconAnchor: [60, 8]})}).addTo(labels); });
    CITIES.forEach(([n, la, lo, rank]) => { if ((rank === 1) || (rank === 2 && z >= 8) || (rank === 3 && z >= 9))
      L.marker([la, lo], {interactive: false, keyboard: false, icon: L.divIcon({className: 'citylabel' + (rank === 1 ? ' big' : ''), html: `<i></i><span>${esc(n)}</span>`, iconSize: [10, 10], iconAnchor: [5, 5]})}).addTo(labels); });
  };
  m.on('zoomend', drawLabels); drawLabels();
}
let tileLayers = [];
function setMapStyle(m, style) {
  tileLayers.forEach(l => m.removeLayer(l)); tileLayers = [];
  if (style === 'plan') tileLayers.push(L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {maxZoom: 19, subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'}));
  if (style === 'sat') {
    tileLayers.push(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 19, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics'}));
    tileLayers.push(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom: 19}));
  }
  tileLayers.forEach(l => l.addTo(m));
  document.querySelectorAll('[data-mstyle]').forEach(b => b.classList.toggle('on', b.dataset.mstyle === style));
}
function pinIcon(s, sel) {
  return L.divIcon({className: '', iconSize: sel ? [42, 42] : [34, 34], iconAnchor: sel ? [21, 42] : [17, 34],
    html: `<div class="pin ${sel ? 'sel' : ''}" style="background:${CATS[s.cat].color}">${ic(CATS[s.cat].icon, sel ? 18 : 15, 2.4)}</div>`});
}
function vMap() {
  const st = [['benin', 'Bénin'], ['plan', t('map')], ['sat', 'Satellite']];
  return `<div class="mapview"><div id="leaf"></div>
    <button class="iconbtn mapback" data-act="mapback" aria-label="${t('back')}">${ic('back')}</button>
    <div class="mapchips"><button class="chip ${S.mapCat === 'all' ? 'on' : ''}" data-mcat="all">${t('all')}</button>${Object.keys(CATS).map(c => `<button class="chip ${S.mapCat === c ? 'on' : ''}" data-mcat="${c}"><span class="sw" style="background:${S.mapCat === c ? '#fff' : CATS[c].color}"></span>${t('cat_' + c)}</button>`).join('')}</div>
    <div class="mapstyle" role="group">${st.map(([k, l]) => `<button class="${S.mapStyle === k ? 'on' : ''}" data-mstyle="${k}">${l}</button>`).join('')}</div>
    <div class="mapbtns"><button class="iconbtn" data-act="langs" aria-label="${t('language')}">${ic('globe', 20)}</button><button class="iconbtn" data-act="zin" aria-label="Zoom +">${ic('plus', 20)}</button><button class="iconbtn" data-act="zout" aria-label="Zoom −"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
      <button class="iconbtn ${follow ? 'on' : ''}" data-act="follow" aria-label="${t('followMe')}">${ic('nav', 20)}</button><button class="iconbtn" data-act="fitall" aria-label="${t('all')}">${ic('target', 20)}</button>
      <button class="iconbtn gbtn" data-act="gmaps" aria-label="Google Maps" title="Google Maps"><b>G</b></button></div>
    <div id="mapsheet"></div>
    ${window.L ? '' : `<div class="mapnote">${ic('info', 14)} Carte indisponible : vérifiez votre connexion.</div>`}
  </div>`;
}
function mountMap() {
  const el = document.getElementById('leaf'); if (!el || !window.L) return;
  map = L.map(el, {zoomControl: false, attributionControl: true, minZoom: 6, maxBounds: [[3.5, -1.5], [14.5, 6]]}).setView([9.3, 2.3], 7);
  addBase(map, true); setMapStyle(map, S.mapStyle);
  mapMarkers = {};
  const shown = SITES.filter(s => S.mapCat === 'all' || s.cat === S.mapCat);
  shown.forEach(s => { mapMarkers[s.id] = L.marker([s.lat, s.lon], {icon: pinIcon(s, s.id === S.mapSel), title: nm(s), riseOnHover: true}).addTo(map).on('click', () => selectOnMap(s.id)); });
  if (S.mapSel && SITE(S.mapSel)) map.setView([SITE(S.mapSel).lat, SITE(S.mapSel).lon], 12);
  else map.fitBounds(L.latLngBounds([[6.2, 0.8], [12.4, 3.85]]), {padding: [20, 20]});
  map.on('dragstart', () => { if (follow) { follow = false; document.querySelector('[data-act="follow"]')?.classList.remove('on'); } });
  updateMe(); renderSheet();
  setTimeout(() => map && map.invalidateSize(), 150);
}
function selectOnMap(id) {
  const prev = S.mapSel; S.mapSel = id;
  if (prev && mapMarkers[prev]) mapMarkers[prev].setIcon(pinIcon(SITE(prev), false));
  if (mapMarkers[id]) mapMarkers[id].setIcon(pinIcon(SITE(id), true));
  renderSheet();
}
const gmapsPlace = s => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
function renderSheet() {
  const box = document.getElementById('mapsheet'); if (!box) return;
  const s = S.mapSel && SITE(S.mapSel);
  box.innerHTML = s ? `<div class="mapsheet">${cover(s, '', 34)}<div class="tx"><span class="pill cat" style="background:${CATS[s.cat].color};align-self:flex-start">${t('cat_' + s.cat)}</span><b>${esc(nm(s))}</b>
    <small class="muted">${esc(s.town)}<span data-dist="${s.id}">${S.pos ? ' · ' + distTxt(s) : ''}</span></small>
    <div class="acts"><button class="btn sm" data-site="${s.id}">${t('overview')}</button><a class="btn sm light" href="${dirUrl(s)}" target="_blank" rel="noopener" aria-label="${t('directions')}">${ic('route', 16)}</a><a class="btn sm light" href="${gmapsPlace(s)}" target="_blank" rel="noopener" aria-label="Google Maps"><b>G</b></a><button class="btn sm light" data-act="closesheet" aria-label="x">${ic('x', 16)}</button></div></div></div>` : '';
  hydrate();
}
function updateMe() {
  if (!map || !S.pos) return;
  const ll = [S.pos.lat, S.pos.lon];
  if (!meMark) {
    meMark = L.marker(ll, {icon: L.divIcon({className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10]}), zIndexOffset: 1000, title: t('youAreHere')}).addTo(map);
    meAcc = L.circle(ll, {radius: S.pos.acc || 30, color: '#2F7BEA', weight: 1, fillOpacity: .08}).addTo(map);
  } else { meMark.setLatLng(ll); meAcc.setLatLng(ll).setRadius(S.pos.acc || 30); }
  if (follow) map.setView(ll, Math.max(map.getZoom(), 14), {animate: true});
}
function destroyMaps() { if (map) { map.remove(); map = null; meMark = null; meAcc = null; tileLayers = []; } destroyMini(); }

/* ======================= fiche d'un site ======================= */
let mini = null;
function destroyMini() { if (mini) { mini.remove(); mini = null; } }
const dirUrl = s => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}${S.pos ? `&origin=${S.pos.lat},${S.pos.lon}` : ''}`;
function liveBox(s) {
  if (!S.pos) return `<div class="livebox"><span class="ic">${ic('nav', 20)}</span><div><b>${t('locOff')}</b>${t('locP')}</div><button class="btn sm" data-act="allowloc">${t('enableLoc')}</button></div>`;
  const k = km(S.pos, s);
  return `<div class="livebox" data-live="${s.id}"><span class="ic">${ic('nav', 20)}</span><div><b class="num">${fmtN(k, k < 10 ? 1 : 0)} ${t('km')} ${t('away')}</b>${ic('car', 13)} ${etaTxt(k, 45)} ${t('byCar')}${k < 15 ? ` · ${ic('walk', 13)} ${etaTxt(k, 4.5)} ${t('onFoot')}` : ''}</div></div>`;
}
function vDetail(s) {
  const x = siteText(s), fav = UD.favs.includes(s.id), inTrip = UD.trip.includes(s.id), vis = UD.visited.includes(s.id);
  const fee = s.fee === 0 ? t('free') : s.fee == null ? t('variable') : `≈ ${fmtN(s.fee)} FCFA`;
  const dur = s.dur >= 1440 ? `1 – 3 ${S.lang === 'fr' ? 'jours' : 'days'}` : s.dur >= 60 ? `${Math.floor(s.dur / 60)} h${s.dur % 60 ? ' ' + (s.dur % 60) : ''}` : `${s.dur} min`;
  const tabs = [['overview', t('overview')], ['photos', t('photos')], ['history', t('history')], ['practical', t('practical')], ['wiki', t('wikiT')]];
  let body = '';
  if (S.dtab === 'overview') body = `<p class="lead">${esc(x.d)}</p><button class="see3d" data-act="open3d"><span class="cube">${ic('cube', 30, 1.6)}</span><span><b>${t('v3d')}</b><small>${t('v3dSub')} · ${t('v3dHint')}</small></span>${ic('chev', 20)}</button><div class="minimap" id="minimap"></div>
    <button class="visit ${vis ? 'on' : ''}" data-act="visit"><span class="stampi">${ic(vis ? 'check' : 'passport', 22)}</span><span><b>${vis ? t('visited') : t('markVisited')}</b><br><small class="muted">${t('passport')}</small></span></button>`;
  if (S.dtab === 'history') body = x.h.split(/(?<=\.)\s+(?=[A-ZÀ-Ý«])/).reduce((acc, sen, i) => { const k = Math.floor(i / 3); (acc[k] = acc[k] || []).push(sen); return acc; }, []).map(p => `<p class="prose">${esc(p.join(' '))}</p>`).join('');
  if (S.dtab === 'practical') body = `<div class="infos num">
      <div>${ic('clock', 20)}<small>${t('hours')}</small><b>${t('h_' + s.hrs)}</b></div>
      <div>${ic('coin', 20)}<small>${t('price')}</small><b>${fee}</b></div>
      <div>${ic('sun', 20)}<small>${t('duration')}</small><b>${dur}</b></div>
      <div>${ic('cal', 20)}<small>${t('bestTime')}</small><b>${t('b_' + s.best)}</b></div>
      <div style="grid-column:1/-1">${ic('pin', 20)}<small>${esc(s.town)} · ${esc(s.dep)}</small><b class="num">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</b></div></div>
    <p class="note">${ic('info', 14)} ${t('approx')}</p>`;
  if (S.dtab === 'photos') body = `<div class="sech" style="padding:0"><h3>${t('photos')}</h3><small>Wikimedia Commons</small></div>
    <div class="pgrid" id="pgrid">${'<div class="ph skel"></div>'.repeat(6)}</div>
    <div class="sech" style="padding:0;margin-top:24px"><h3>${t('myPhotos')}</h3></div>
    <div class="pgrid" id="mygrid"></div>
    <label class="btn light" for="addph" style="margin-top:12px">${ic('cam', 18)} ${t('addPhotos')}</label><input id="addph" type="file" accept="image/*" multiple hidden>
    <p class="note">${ic('lock', 14)} ${t('myPhotosNote')}</p>`;
  if (S.dtab === 'wiki') body = `<div class="wiki" id="wikibox"><p class="muted" style="margin:0">${t('wikiLoading')}</p></div>`;
  return `<section class="detail" role="dialog" aria-label="${esc(x.n)}">
    <div class="gallery"><div class="track" id="track">${cover(s, '', 80).replace('class="cover', 'class="cover main')}</div>
      <div class="bar"><button class="iconbtn" data-act="closesite" aria-label="${t('home')}">${ic('back')}</button><span style="display:flex;gap:8px"><button class="iconbtn ${fav ? 'on' : ''}" data-fav="${s.id}" aria-label="${t('save')}">${ic('heart', 20)}</button><button class="btn3d" data-act="open3d">${ic('cube', 18)} 3D</button><button class="iconbtn" data-act="share" aria-label="${t('share')}">${ic('share', 19)}</button></span></div>
      <div class="ttl"><span style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill cat" style="background:${CATS[s.cat].color}">${t('cat_' + s.cat)}</span>${s.unesco ? `<span class="pill gold">${ic('star', 11, 2.5)} UNESCO</span>` : ''}</span>
        <h1>${esc(x.n)}</h1><small>${ic('pin', 14)} ${esc(s.town)} · ${esc(s.dep)}</small></div>
      <span class="pill count-ph" id="phcount" hidden>${ic('img', 12)} <span></span></span></div>
    <div class="dbody">
      ${TXT(s) && !TXT(s).manuel ? `<div class="langnote">${t('mtNote')}</div>` : LG().partial ? `<div class="langnote">${t('partialLang')}</div>` : ''}
      ${liveBox(s)}
      ${audioCard(s)}
      <div class="actions">
        <a href="${dirUrl(s)}" target="_blank" rel="noopener">${ic('route', 22)}${t('directions')}</a>
        <button data-act="speak" id="speakbtn">${ic('vol', 22)}${t('listen')}</button>
        <button data-act="trip" class="${inTrip ? 'on' : ''}">${ic(inTrip ? 'check' : 'plus', 22)}${inTrip ? t('inTrip') : t('addTrip')}</button>
        <button data-act="share">${ic('share', 22)}${t('share')}</button></div>
      <div class="tabs2" role="tablist">${tabs.map(([k, l]) => `<button class="${S.dtab === k ? 'on' : ''}" data-dtab="${k}" role="tab" aria-selected="${S.dtab === k}">${l}</button>`).join('')}</div>
      <div id="dcontent" class="fade">${body}</div>
    </div></section>`;
}
function renderDetail() {
  const s = SITE(S.detail); if (!s) return;
  destroyMini();
  const old = document.querySelector('.detail'); const keep = old ? old.scrollTop : 0;
  const tmp = document.createElement('div'); tmp.innerHTML = vDetail(s); const el = tmp.firstElementChild;
  if (old) { el.style.animation = 'none'; old.replaceWith(el); el.scrollTop = keep; } else $app.appendChild(el);
  hydrate(); afterDetail(s);
}
function afterDetail(s) {
  preAudio(s);
  const mm = document.getElementById('minimap');
  if (mm && window.L) {
    mini = L.map(mm, {zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, attributionControl: false}).setView([s.lat, s.lon], 12);
    addBase(mini, false); L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {subdomains: 'abcd'}).addTo(mini);
    L.marker([s.lat, s.lon], {icon: pinIcon(s, true)}).addTo(mini);
    mm.addEventListener('click', () => { closeSite(); S.mapSel = s.id; S.mapCat = 'all'; setTab('map'); });
  }
  // galerie de vraies photos (Wikipédia + Wikimedia Commons)
  const fill = () => loadPhotos(s).then(list => {
    if (S.detail !== s.id) return;
    GAL = list;
    const tr = document.getElementById('track');
    if (tr && list.length) {
      const main = tr.querySelector('.main'); if (main) { main.dataset.photo = '0'; main.setAttribute('role', 'button'); }
      const mainUrl = WCACHE[s.id] && WCACHE[s.id].img;
      list.forEach((p, i) => { if (p.u === mainUrl || i > 10) return; const d = document.createElement('div'); d.style.backgroundImage = `url("${p.u}")`; d.dataset.photo = i; d.setAttribute('role', 'button'); d.setAttribute('aria-label', nm(s)); tr.appendChild(d); });
      const c = document.getElementById('phcount'); if (c) { c.hidden = false; c.querySelector('span').textContent = list.length; }
    }
    const g = document.getElementById('pgrid');
    if (g) g.innerHTML = list.length ? list.map((p, i) => `<button class="ph" data-photo="${i}" style="background-image:url('${p.u}')" aria-label="${t('photos')} ${i + 1}"></button>`).join('')
      : `<p class="muted" style="grid-column:1/-1;margin:0;font-size:13.5px">${t('photosNone')}</p>`;
  });
  if (WCACHE[s.id]) fill(); else { want(s.id); const iv = setInterval(() => { if (WCACHE[s.id] || S.detail !== s.id) { clearInterval(iv); if (S.detail === s.id) fill(); } }, 400); }
  if (S.dtab === 'photos') renderMine(s);
  if (S.dtab === 'wiki') {
    const run = () => loadExtract(s).then(r => {
      const box = document.getElementById('wikibox'); if (!box) return;
      box.innerHTML = r ? `${r.text.split(/\n+/).filter(Boolean).slice(0, 6).map(p => `<p class="prose">${esc(p)}</p>`).join('')}<a href="${r.url}" target="_blank" rel="noopener">${t('readOn')} ${ic('ext', 15)}</a><p class="note">${t('source')} : Wikipédia (${esc(LG().name)}), CC BY-SA.</p>`
        : `<p class="muted" style="margin:0">${t('wikiNone')}</p>${WCACHE[s.id] && WCACHE[s.id].url ? `<a href="${WCACHE[s.id].url}" target="_blank" rel="noopener">${t('readOn')} ${ic('ext', 15)}</a>` : ''}`;
    });
    if (WCACHE[s.id]) run(); else { want(s.id); const iv = setInterval(() => { if (WCACHE[s.id] || S.detail !== s.id) { clearInterval(iv); if (S.detail === s.id && S.dtab === 'wiki') run(); } }, 400); }
  }
}

/* ======================= vue 3D ======================= */
let v3 = null, threeP = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function loadThree() {
  if (window.THREE && window.THREE.OrbitControls && window.BI3D) return Promise.resolve();
  return threeP || (threeP = loadScript('vendor/three.min.js').then(() => loadScript('vendor/OrbitControls.js')).then(() => loadScript('vendor/GLTFLoader.js')).then(() => loadScript('scene3d.js')));
}
function open3D(s) {
  stopSpeech(); close3D();
  const el = document.createElement('div'); el.className = 'v3d'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="v3stage" id="v3stage"><div class="v3load"><span class="spin"></span>${t('v3dLoading')}</div></div>
    <div class="v3top"><button class="iconbtn" data-act="close3d" aria-label="${t('back')}">${ic('back')}</button><div class="v3t"><b>${esc(nm(s))}</b><small>${ic('cube', 12)} ${s.model ? t('v3dModel') : t('v3dSub')}</small></div></div>
    <div class="v3bot"><div class="v3hint">${t('v3dHint')}</div><div class="v3btns"><button class="chip on" data-act="spin3d" id="spinbtn">${ic('sync', 14)} ${t('v3dSpin')}</button><button class="chip" data-act="reset3d">${ic('target', 14)} ${t('v3dReset')}</button><button class="chip" data-act="speak3d">${ic('vol', 14)} ${t('listen')}</button></div></div>`;
  $app.appendChild(el);
  loadThree().then(() => {
    const st = document.getElementById('v3stage'); if (!st) return;
    try { v3 = BI3D.open(st, s, {onSpin: on => document.getElementById('spinbtn')?.classList.toggle('on', on)}); st.querySelector('.v3load')?.remove(); }
    catch (e) { st.querySelector('.v3load').textContent = t('v3dErr'); }
  }).catch(() => { const l = document.querySelector('.v3load'); if (l) l.textContent = t('v3dErr'); });
}
function close3D() { if (v3) { try { v3.destroy(); } catch (e) {} v3 = null; } document.querySelector('.v3d')?.remove(); }

/* ======================= onglet Voyage + passeport ======================= */
function orderTrip(ids) {
  if (ids.length < 2) return ids;
  let left = ids.map(SITE), cur = S.pos || left[0], out = [];
  if (!S.pos) { out.push(left.shift()); cur = out[0]; }
  while (left.length) { left.sort((a, b) => km(cur, a) - km(cur, b)); cur = left.shift(); out.push(cur); }
  return out.map(s => s.id);
}
function vTrip() {
  const ids = orderTrip(UD.trip), sites = ids.map(SITE);
  let total = 0, prev = S.pos; sites.forEach(s => { if (prev) total += km(prev, s) * ROAD; prev = s; });
  const wp = sites.slice(0, -1).slice(0, 9).map(s => `${s.lat},${s.lon}`).join('|'), last = sites[sites.length - 1];
  const gm = last ? `https://www.google.com/maps/dir/?api=1&destination=${last.lat},${last.lon}${S.pos ? `&origin=${S.pos.lat},${S.pos.lon}` : ''}${wp ? '&waypoints=' + encodeURIComponent(wp) : ''}` : '#';
  const nv = UD.visited.length;
  return `<div class="scroll fade"><div class="titlebar"><h2>${t('tripT')}</h2>${langPill()}${liveChip()}</div>
    ${sites.length ? `<div class="tripsum num"><div><b>≈ ${fmtN(total)} ${t('km')}</b><small>${t('total')}</small></div><div><b>${sites.length}</b><small>${t('stops')}</small></div>
      <a class="btn" href="${gm}" target="_blank" rel="noopener">${ic('route', 18)} ${t('tripMaps')}</a></div>
      <div class="list" style="margin-top:16px">${sites.map((s, i) => `<div class="tstop"><span class="n">${i + 1}</span>${siteRow(s)}<button class="rm" data-rmtrip="${s.id}" aria-label="${t('remove')}">${ic('x', 16)}</button></div>`).join('')}</div>`
      : `<div class="empty">${ic('route', 34)}<span>${t('tripEmpty')}</span><button class="btn sm" data-act="seeall">${t('explore')}</button></div>`}
    <div class="sec"><div class="sech"><h3>${t('passport')}</h3><small class="num">${nv} / ${SITES.length}</small></div>
      <div class="progress"><i style="width:${nv / SITES.length * 100}%"></i></div>
      <div class="stamps">${SITES.map(s => { const on = UD.visited.includes(s.id); return `<button class="stamp ${on ? 'on' : ''}" data-site="${s.id}"><i>${ic(CATS[s.cat].icon, 24, 1.8)}</i>${esc(nm(s).split(' (')[0])}</button>`; }).join('')}</div></div>
  </div>`;
}

/* ======================= onglet Profil ======================= */
function vProfile() {
  const u = me(), favs = UD.favs.map(SITE).filter(Boolean);
  let since = ''; try { since = new Intl.DateTimeFormat(locale(), {month: 'long', year: 'numeric'}).format(new Date(u.created)); } catch (e) {}
  return `<div class="scroll fade"><div class="titlebar"><h2>${t('profile')}</h2>${langPill()}</div>
    <div class="pcard"><div class="avatar">${esc(initials(u.name))}</div><b>${esc(u.name)}</b><small>${esc(S.user)}</small><small>${esc(countryName(u.country || 'BJ'))} · ${t('memberSince')} ${esc(since)}</small></div>
    <div class="stats num"><div><b>${UD.favs.length}</b><small>${t('favorites')}</small></div><div><b>${UD.visited.length}</b><small>${t('visited')}</small></div><div><b>${UD.trip.length}</b><small>${t('tripT')}</small></div></div>
    <div class="sec"><div class="sech"><h3>${t('favorites')}</h3></div>${favs.length ? `<div class="list">${favs.map(siteRow).join('')}</div>` : `<div class="empty">${ic('heart', 30)}<span>${t('noFav')}</span></div>`}</div>
    <div class="sec"><div class="menu">
      <button data-act="langs"><span class="ic">${ic('globe', 19)}</span><span class="tx">${t('language')}<small>${esc(LG().name)}</small></span>${ic('chev', 18)}</button>
      <div class="mi"><span class="ic">${ic('nav', 19)}</span><span class="tx">${t('live')}<small>${S.loc === 'on' ? esc(nearestTown()) : t('locOff')}</small></span><button class="toggle ${UD.locOn && S.loc !== 'denied' ? 'on' : ''}" data-act="togloc" role="switch" aria-checked="${UD.locOn}" aria-label="${t('live')}"></button></div>
      <button data-act="about"><span class="ic">${ic('info', 19)}</span><span class="tx">${t('about')}${S.aboutOpen ? `<small>${t('aboutP')}</small>` : ''}</span>${ic('chev', 18)}</button>
      <button data-act="logout"><span class="ic">${ic('logout', 19)}</span><span class="tx">${t('logout')}</span></button>
      <button data-act="delacc" class="danger"><span class="ic">${ic('trash', 19)}</span><span class="tx">${S.delArm ? t('confirmDel') : t('deleteAcc')}</span></button>
    </div></div>
    <p class="note pad" style="margin-top:18px">${ic('lock', 14)} ${t('accept')}</p>
  </div>`;
}

/* ======================= feuille des langues ======================= */
function vLangSheet() {
  const btn = l => `<button class="${l.code === S.lang ? 'on' : ''}" data-lang="${l.code}" lang="${l.code}"><b>${esc(l.name)}</b><small>${esc(l.en)}${l.partial ? ' · FR' : ''}</small><span class="aud ${hasRec(l.code) || voiceFor(l.code) ? 'ok' : ''}">${ic(hasRec(l.code) ? 'mic' : 'vol', 12)} ${hasRec(l.code) ? t('aRec') : voiceFor(l.code) ? t('aTts') : l.partial ? t('aRecSoon') : '—'}</span></button>`;
  return `<div class="sheetbg" data-act="closesheet2"><div class="sheet" role="dialog" aria-label="${t('language')}"><div class="grab"></div><h3>${t('step1')}</h3>
    <h4>${S.lang === 'fr' ? 'Langues du Bénin' : 'Languages of Benin'}</h4><div class="langs">${LANGS.filter(l => l.local || l.code === 'fr').map(btn).join('')}</div>
    <h4>${S.lang === 'fr' ? 'Langues internationales' : 'International languages'}</h4><div class="langs">${LANGS.filter(l => !l.local && l.code !== 'fr').map(btn).join('')}</div></div></div>`;
}

/* ======================= rendu ======================= */
const TABS = [['home', 'home'], ['explore', 'search'], ['map', 'map'], ['trip', 'route'], ['profile', 'user']];
function render() {
  const lg = LG(); document.documentElement.lang = lg.code; document.documentElement.dir = lg.rtl ? 'rtl' : 'ltr';
  destroyMaps();
  let html = '';
  if (!S.user && !['welcome', 'signup', 'login'].includes(S.screen)) S.screen = 'welcome';
  if (S.screen === 'welcome') html = vWelcome();
  else if (S.screen === 'signup' || S.screen === 'login') html = vAuth(S.screen);
  else if (S.screen === 'perm') html = vPerm();
  else {
    html = ({home: vHome, explore: vExplore, map: vMap, trip: vTrip, profile: vProfile}[S.tab])();
    html += `<nav class="tabs" aria-label="Navigation">${TABS.map(([k, i]) => `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${ic(i, 22)}<span>${t(k)}</span></button>`).join('')}</nav>`;
  }
  if (S.sheet === 'langs') html += vLangSheet();
  $app.innerHTML = html;
  hydrate();
  if (S.screen === 'welcome') startSlides();
  if (S.screen === 'app' && S.tab === 'map') mountMap();
  if (S.screen === 'app' && S.detail) renderDetail();
}

/* ======================= localisation en temps réel ======================= */
let watchId = null, firstFix = true;
function startWatch() {
  if (!('geolocation' in navigator)) { S.loc = 'unavailable'; toast(t('locOff'), 'info'); return; }
  if (watchId !== null) return;
  S.loc = 'asking'; updateLive();
  watchId = navigator.geolocation.watchPosition(p => {
    S.pos = {lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy}; S.loc = 'on';
    if (firstFix) { firstFix = false; if (S.screen === 'app' && ['home', 'explore', 'trip'].includes(S.tab) && !S.detail) { const sc = $app.querySelector('.scroll'), y = sc ? sc.scrollTop : 0; render(); const n = $app.querySelector('.scroll'); if (n) n.scrollTop = y; return; } }
    updateLive();
  }, () => { S.loc = 'denied'; stopWatch(); updateLive(); toast(t('locOff'), 'info'); }, {enableHighAccuracy: true, maximumAge: 15000, timeout: 30000});
}
function stopWatch() { if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} } watchId = null; }
/* met à jour les distances affichées sans redessiner l'écran */
function updateLive() {
  const lt = document.getElementById('livetxt');
  if (lt) { lt.textContent = S.loc === 'on' && S.pos ? nearestTown() : S.loc === 'asking' ? t('locating') : t('locOff'); lt.parentElement.classList.toggle('off', !(S.loc === 'on' && S.pos)); }
  if (S.pos) document.querySelectorAll('[data-dist]').forEach(el => { const s = SITE(el.dataset.dist); if (!s) return; const inMeta = el.tagName === 'SPAN' && el.closest('.meta, .mapsheet'); el.innerHTML = inMeta ? ' · ' + distTxt(s) : ic('nav', 12, 2.5) + ' ' + distTxt(s); });
  const lb = document.querySelector('[data-live]'); if (lb && S.detail) { const tmp = document.createElement('div'); tmp.innerHTML = liveBox(SITE(S.detail)); lb.replaceWith(tmp.firstElementChild); }
  updateMe();
}

/* ======================= audio ======================= */
let speaking = false, audioEl = null;
S.alang = null; S.arate = store.get('arate', 1);
const AUD = {}; // textes préchargés : site|langue -> {text, src}
const aCode = () => S.alang || S.lang;
const langOf = c => LANGS.find(l => l.code === c) || LANGS[0];
function voiceFor(code) {
  if (langOf(code).partial) return null; // pas de voix de téléphone pour le fon, le goun…
  try {
    const tag = langOf(code).tts.toLowerCase(), base = tag.split('-')[0], vs = speechSynthesis.getVoices();
    return vs.find(v => v.lang.toLowerCase().replace('_', '-') === tag) || vs.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  } catch (e) { return null; }
}
const fill = (k, code) => t(k).replace('{L}', langOf(code).name);
/* précharge le texte à lire dans la langue choisie (article Wikipédia pour les langues sans fiche rédigée) */
async function preAudio(s) {
  const code = aCode(), key = s.id + '|' + code;
  if (!AUD[key] && !['fr', 'en'].includes(code) && !langOf(code).partial && !TXT(s, code)) {
    if (!WCACHE[s.id]) { want(s.id); await new Promise(r => { const iv = setInterval(() => { if (WCACHE[s.id] || S.detail !== s.id) { clearInterval(iv); r(); } }, 300); }); }
    const ex = await loadExtract(s, code);
    AUD[key] = ex ? {text: ex.text.split(/\n+/).slice(0, 4).join(' ').slice(0, 2200), src: 'wiki'} : {text: null};
  }
  if (S.detail === s.id) { const st = document.getElementById('astatus'); if (st && !speaking) st.innerHTML = audioPlan(s).status; }
}
/* choisit : enregistrement > voix du téléphone dans la langue > repli en français/anglais */
function audioPlan(s) {
  const code = aCode(), L = langOf(code), rec = recFor(s, code);
  if (rec) return {rec, status: `${ic('mic', 13)} ${t('aRec')} · ${esc(L.name)}`};
  const own = c => { const x = TXT(s, c) || s[c]; return `${x.n}. ${x.d} ${x.h}`; };
  let text, lang = code, note = '';
  if (code === 'fr' || code === 'en') text = own(code);
  else if (TXT(s, code)) text = own(code);             // texte traduit disponible
  else if (L.partial) { text = own('fr'); lang = 'fr'; note = fill('aSoon', code); }
  else {
    const p = AUD[s.id + '|' + code];
    if (p && p.text) { text = `${nm(s)}. ${p.text}`; }
    else if (p) { text = own('en'); lang = 'en'; note = fill('aNoText', code); }
    else { text = own('en'); lang = 'en'; note = t('wikiLoading'); }
  }
  let voice = voiceFor(lang);
  if (!voice && L.partial) voice = null;
  if (!voice && lang !== 'fr') { note = fill(L.partial ? 'aSoon' : 'aNoVoice', lang); text = own('fr'); lang = 'fr'; voice = voiceFor('fr'); }
  const status = `${ic('vol', 13)} ${t('aTts')} · ${esc(langOf(lang).name)}${note ? ` <em>${esc(note)}</em>` : ''}`;
  return {text, lang, voice, status};
}
function setAudioUI(on, status) {
  const b = document.getElementById('speakbtn'); if (b) b.innerHTML = `${ic(on ? 'pause' : 'vol', 22)}${on ? t('stop') : t('listen')}`;
  const p = document.getElementById('aplay'); if (p) p.innerHTML = ic(on ? 'pause' : 'play', 24);
  document.getElementById('acard')?.classList.toggle('on', on);
  if (status !== undefined) { const st = document.getElementById('astatus'); if (st) st.innerHTML = status; }
}
function stopSpeech() { try { speechSynthesis.cancel(); } catch (e) {} if (audioEl) { audioEl.pause(); audioEl = null; } speaking = false; setAudioUI(false); }
function speakSite(s) {
  if (speaking) return stopSpeech();
  const plan = audioPlan(s);
  if (plan.rec) {
    audioEl = new Audio(plan.rec); audioEl.playbackRate = S.arate; audioEl.onended = stopSpeech;
    audioEl.play().then(() => { speaking = true; setAudioUI(true, plan.status); }).catch(() => { audioEl = null; toast(t('noResults'), 'info'); });
    return;
  }
  if (!('speechSynthesis' in window)) { toast(fill('aNoVoice', aCode()), 'info'); return; }
  // découpage en phrases : évite les coupures des voix de synthèse sur les longs textes
  const parts = (plan.text.match(/[^.!?。！？؟]+[.!?。！？؟]*/g) || [plan.text]).map(x => x.trim()).filter(Boolean);
  try { speechSynthesis.cancel(); } catch (e) {}
  parts.forEach((txt, i) => {
    const u = new SpeechSynthesisUtterance(txt); u.lang = langOf(plan.lang).tts; u.rate = .97 * S.arate; if (plan.voice) u.voice = plan.voice;
    if (i === parts.length - 1) u.onend = () => { if (speaking) stopSpeech(); };
    speechSynthesis.speak(u);
  });
  speaking = true; setAudioUI(true, plan.status);
}
function audioCard(s) {
  const code = aCode();
  return `<div class="acard" id="acard"><button class="aplay" id="aplay" data-act="speak" aria-label="${t('listen')}">${ic('play', 24)}</button>
    <div class="ainfo"><b>${t('audioT')}</b><small id="astatus">${audioPlan(s).status}</small></div>
    <div class="actl"><label class="alang">${ic('globe', 14)}<select id="alang" aria-label="${t('language')}">${LANGS.map(l => `<option value="${l.code}" ${l.code === code ? 'selected' : ''}>${esc(l.name)}${voiceFor(l.code) || recFor(s, l.code) ? '' : ' ·'}</option>`).join('')}</select></label>
    <button class="arate num" data-act="rate" aria-label="speed">${S.arate}×</button></div></div>`;
}
const langPill = () => `<button class="langpill" data-act="langs" aria-label="${t('language')}">${ic('globe', 16)}<span>${esc(LG().code.toUpperCase())}</span></button>`;
try { speechSynthesis.onvoiceschanged = () => { if (S.detail && !speaking) { const st = document.getElementById('astatus'); if (st) st.innerHTML = audioPlan(SITE(S.detail)).status; } }; } catch (e) {}

/* ======================= actions ======================= */
function toggleIn(arr, id) { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); saveUser(); return i < 0; }
$app.addEventListener('click', async e => {
  const el = e.target.closest('[data-mstyle],[data-photo],[data-myphoto],[data-delph],[data-act],[data-go],[data-tab],[data-site],[data-fav],[data-cat],[data-dep],[data-fcat],[data-tog],[data-mcat],[data-dtab],[data-lang],[data-rmtrip]');
  if (!el) return;
  const d = el.dataset;
  if (d.photo !== undefined) { if (GAL.length) openLB(GAL, Math.min(+d.photo, GAL.length - 1)); return; }
  if (d.myphoto !== undefined) return openLB(MINEURLS.map(u => ({u, by: me().name, lic: t('myPhotos')})), +d.myphoto);
  if (d.delph) { await IDB.del(+d.delph); return S.detail && renderMine(SITE(S.detail)); }
  if (d.fav) { e.stopPropagation(); const on = toggleIn(UD.favs, d.fav); document.querySelectorAll(`[data-fav="${d.fav}"]`).forEach(b => b.classList.toggle('on', on)); if (on) toast(t('saved'), 'heart'); return; }
  if (d.lang) { S.lang = d.lang; store.set('lang', S.lang); S.sheet = null; const det = S.detail; render(); if (det) { S.detail = det; renderDetail(); } return; }
  if (d.act === 'closesheet2') { if (e.target === el) { S.sheet = null; document.querySelector('.sheetbg')?.remove(); } return; }
  if (d.go) return go(d.go);
  if (d.tab) { S.from = null; return setTab(d.tab); }
  if (d.site) return openSite(d.site);
  if (d.cat) { Object.assign(S, {from: 'home', cat: d.cat, dep: '', q: '', free: false, unesco: false, near: false}); return setTab('explore'); }
  if (d.dep) { map && map.closePopup(); Object.assign(S, {from: d.from || 'home', dep: d.dep, near: false, cat: 'all', q: '', free: false, unesco: false}); return setTab('explore'); }
  if (d.fcat) { S.cat = d.fcat; document.querySelectorAll('[data-fcat]').forEach(b => { const on = b.dataset.fcat === S.cat; b.classList.toggle('on', on); const sw = b.querySelector('.sw'); if (sw) sw.style.background = on ? '#fff' : CATS[b.dataset.fcat].color; }); return refreshResults(); }
  if (d.tog) { if (d.tog === 'near' && !S.pos) startWatch(); S[d.tog] = !S[d.tog]; el.classList.toggle('on', S[d.tog]); return refreshResults(); }
  if (d.mstyle) { S.mapStyle = d.mstyle; store.set('mapStyle', S.mapStyle); if (map) setMapStyle(map, S.mapStyle); return; }
  if (d.mcat) { S.mapCat = d.mcat; S.mapSel = null; return render(); }
  if (d.dtab) { S.dtab = d.dtab; return renderDetail(); }
  if (d.rmtrip) { toggleIn(UD.trip, d.rmtrip); return render(); }
  const s = S.detail && SITE(S.detail);
  switch (d.act) {
    case 'langs': S.sheet = 'langs'; $app.insertAdjacentHTML('beforeend', vLangSheet()); return;
    case 'showpwd': { const p = document.getElementById('pwd'); p.type = p.type === 'password' ? 'text' : 'password'; return; }
    case 'forgot': return toast(t('forgotP'), 'info');
    case 'allowloc': UD.locOn = true; saveUser(); startWatch(); if (S.screen === 'perm') go('app'); return;
    case 'laterloc': return go('app');
    case 'gosearch': S.from = 'home'; setTab('explore'); setTimeout(() => document.getElementById('q')?.focus(), 50); return;
    case 'seeall': Object.assign(S, {from: S.tab, cat: 'all', dep: '', q: '', free: false, unesco: false, near: false}); return setTab('explore');
    case 'gonear': Object.assign(S, {from: 'home', cat: 'all', dep: '', q: '', near: true}); return setTab('explore');
    case 'gomap': S.mapSel = null; return setTab('map');
    case 'clearq': S.q = ''; document.getElementById('q').value = ''; el.remove(); return refreshResults();
    case 'resetf': Object.assign(S, {cat: 'all', dep: '', q: '', free: false, unesco: false, near: false}); return render();
    case 'follow': follow = !follow; el.classList.toggle('on', follow); if (follow) { if (!S.pos) startWatch(); else updateMe(); } return;
    case 'exback': { const back = S.from || 'home'; Object.assign(S, {from: null, cat: 'all', dep: '', q: '', free: false, unesco: false, near: false}); return setTab(back); }
    case 'mapback': S.from = null; return setTab(S.prevTab && S.prevTab !== 'map' ? S.prevTab : 'home');
    case 'rate': { const r = [1, 1.25, .8]; S.arate = r[(r.indexOf(S.arate) + 1) % r.length]; store.set('arate', S.arate); el.textContent = S.arate + '×'; if (speaking && s) { stopSpeech(); speakSite(s); } return; }
    case 'zin': return map && map.zoomIn();
    case 'zout': return map && map.zoomOut();
    case 'gmaps': { const c = map ? map.getCenter() : {lat: 9.3, lng: 2.3}, z = map ? map.getZoom() : 7; window.open(`https://www.google.com/maps/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z}z`, '_blank', 'noopener'); return; }
    case 'fitall': if (map) map.fitBounds(L.latLngBounds([[6.2, 0.8], [12.4, 3.85]]), {padding: [20, 20]}); return;
    case 'closesheet': S.mapSel && mapMarkers[S.mapSel] && mapMarkers[S.mapSel].setIcon(pinIcon(SITE(S.mapSel), false)); S.mapSel = null; return renderSheet();
    case 'closesite': return closeSite();
    case 'closelb': return closeLB();
    case 'open3d': return s && open3D(s);
    case 'close3d': return close3D();
    case 'spin3d': if (v3) el.classList.toggle('on', v3.toggleSpin()); return;
    case 'reset3d': return v3 && v3.reset();
    case 'speak3d': return s && speakSite(s);
    case 'speak': return s && speakSite(s);
    case 'trip': { if (!s) return; const on = toggleIn(UD.trip, s.id); if (on) toast(t('addedTrip'), 'route'); return renderDetail(); }
    case 'visit': { if (!s) return; const on = toggleIn(UD.visited, s.id); if (on) toast(t('stamp'), 'passport'); return renderDetail(); }
    case 'share': {
      if (!s) return; const url = location.origin + location.pathname + '#' + s.id, title = nm(s);
      if (navigator.share) { try { await navigator.share({title, text: s[CL()].d, url}); } catch (err) {} return; }
      try { await navigator.clipboard.writeText(url); toast(t('copied'), 'share'); } catch (err) { toast(url, 'share'); }
      return;
    }
    case 'togloc': if (UD.locOn) { UD.locOn = false; stopWatch(); S.loc = 'idle'; S.pos = null; } else { UD.locOn = true; startWatch(); } saveUser(); return render();
    case 'about': S.aboutOpen = !S.aboutOpen; return render();
    case 'logout': stopWatch(); store.del('session'); S.user = null; S.pos = null; S.loc = 'idle'; S.tab = 'home'; return go('welcome');
    case 'delacc':
      if (!S.delArm) { S.delArm = true; render(); setTimeout(() => { S.delArm = false; }, 4000); return; }
      { const all = users(); delete all[S.user]; store.set('users', all); store.del('u_' + S.user); store.del('session'); stopWatch(); S.user = null; S.delArm = false; S.pos = null; return go('welcome'); }
  }
});
$app.addEventListener('submit', e => { if (e.target.id === 'authform') { e.preventDefault(); submitAuth(S.screen); } });
$app.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; refreshResults(); } });
$app.addEventListener('change', async e => {
  if (e.target.id === 'alang' && S.detail) { stopSpeech(); S.alang = e.target.value; const sd = SITE(S.detail); setAudioUI(false, audioPlan(sd).status); preAudio(sd); return; }
  if (e.target.id === 'dep') { S.dep = e.target.value; refreshResults(); }
  if (e.target.id === 'addph' && S.detail) {
    const files = [...e.target.files].filter(f => f.type.startsWith('image/')); let n = 0;
    for (const f of files) { try { const blob = await shrink(f); await IDB.put({id: Date.now() + n, user: S.user, site: S.detail, at: Date.now(), blob}); n++; } catch (err) {} }
    e.target.value = ''; if (n) toast(t('photoAdded'), 'img'); renderMine(SITE(S.detail));
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.querySelector('.v3d')) close3D(); else if (document.querySelector('.lb')) closeLB(); else if (S.sheet) { S.sheet = null; document.querySelector('.sheetbg')?.remove(); } else if (S.detail) closeSite(); } });

/* ======================= démarrage ======================= */
try { speechSynthesis.getVoices(); } catch (e) {}
if (S.user && users()[S.user]) {
  loadUser(); S.screen = 'app';
  if (UD.locOn) startWatch();
  const h = location.hash.slice(1); if (h && SITE(h)) S.detail = h;
} else { S.user = null; }
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
