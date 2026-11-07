/* =====================================================================
   Bénin Immersion — vues 3D des sites (three.js)
   Chaque site reçoit une maquette 3D illustrative construite à partir de
   formes simples (pas un relevé exact). Si un vrai modèle .glb existe
   (champ « model » dans data.js), il est chargé à la place.
   API : BI3D.open(conteneur, site) -> {destroy, reset, toggleSpin}
   ===================================================================== */
(function () {
  'use strict';
  const KIND = {porte: 'arch', route: 'path', pythons: 'temple', basilique: 'church', fort: 'fort', kpasse: 'forest', zinsou: 'villa', zoungbodji: 'memorial',
    lama: 'forest', ganvie: 'stilts', amazone: 'statue', dantokpa: 'market', cathedrale: 'church', etoile: 'monument', fidjrosse: 'beach', artisanat: 'market',
    bioguera: 'rider', honme: 'palace', adande: 'villa', mosquee: 'mosque', jpn: 'forest', dasilva: 'villa', adjarra: 'market', ketou: 'gate', abomey: 'palace',
    behanzin: 'statue', agongointo: 'cave', dassa: 'hills', savalou: 'palace', aheme: 'lake', boucheroy: 'lake', grandpopo: 'beach', pendjari: 'savanna',
    parcw: 'savanna', tanougou: 'falls', kota: 'falls', tata: 'tata', natitingou: 'villa', taneka: 'huts', nikki: 'rider'};

  function open(container, site, opts = {}) {
    const T = window.THREE;
    const W = () => container.clientWidth, H = () => container.clientHeight;
    const renderer = new T.WebGLRenderer({antialias: true, alpha: false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const scene = new T.Scene();
    scene.background = new T.Color('#FBE3EC');
    scene.fog = new T.Fog('#FBE3EC', 60, 140);
    const camera = new T.PerspectiveCamera(42, W() / H(), .1, 400);
    camera.position.set(22, 15, 26);
    const controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .08; controls.autoRotate = true; controls.autoRotateSpeed = .9;
    controls.minDistance = 8; controls.maxDistance = 70; controls.maxPolarAngle = Math.PI * .47; controls.target.set(0, 3, 0);

    // lumière douce de fin d'après-midi
    scene.add(new T.HemisphereLight('#FFF4F8', '#C9A27E', .75));
    const sun = new T.DirectionalLight('#FFF1DC', 1.05); sun.position.set(18, 30, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90});
    scene.add(sun);

    /* ---------- petits outils de construction ---------- */
    const mats = {};
    const M = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new T.MeshStandardMaterial(Object.assign({color: c, roughness: .85, metalness: 0, flatShading: true}, o))); };
    const add = (geo, c, x = 0, y = 0, z = 0, o = {}) => { const m = new T.Mesh(geo, c.isMaterial ? c : M(c, o)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
    const box = (w, h, d, c, x, y, z, o) => add(new T.BoxGeometry(w, h, d), c, x, y + h / 2, z, o);
    const cyl = (rt, rb, h, c, x, y, z, seg = 16, o) => add(new T.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, o);
    const cone = (r, h, c, x, y, z, seg = 16) => add(new T.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
    const ball = (r, c, x, y, z, o) => add(new T.SphereGeometry(r, 16, 12), c, x, y, z, o);
    const root = new T.Group(); scene.add(root);
    const anim = []; // fonctions animées (t en secondes)
    const C = {sand: '#E9D2A6', earth: '#B9744A', laterite: '#A8552F', grass: '#7CB66B', dark: '#3A2A22', white: '#F7F2EA', pink: '#E8336E', rose: '#FF9CBE',
      gold: '#E9A800', water: '#5FB3E0', wood: '#7A5134', straw: '#D9B060', stone: '#B9B2A8', leaf: '#3F8F4E', leaf2: '#5AA85A', red: '#C2412D', sky: '#4F8FCF'};

    function ground(color = C.sand, r = 34) { const g = new T.Mesh(new T.CircleGeometry(r, 64), M(color)); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; root.add(g); return g; }
    function water(w, d, x = 0, z = 0, y = .05) {
      const g = new T.Mesh(new T.PlaneGeometry(w, d, 24, 24), M(C.water, {transparent: true, opacity: .9, roughness: .25, metalness: .1}));
      g.rotation.x = -Math.PI / 2; g.position.set(x, y, z); g.receiveShadow = true; root.add(g);
      const pos = g.geometry.attributes.position, base = pos.array.slice();
      anim.push(t => { for (let i = 0; i < pos.count; i++) pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 1.5 + base[i * 3] * .6 + base[i * 3 + 1] * .4) * .08; pos.needsUpdate = true; });
      return g;
    }
    function tree(x, z, s = 1) { cyl(.18 * s, .25 * s, 2.2 * s, C.wood, x, 0, z, 7); ball(1.3 * s, C.leaf, x, 2.8 * s, z); ball(.9 * s, C.leaf2, x + .6 * s, 2.4 * s, z + .4 * s); }
    function palm(x, z, s = 1, lean = .15) {
      const g = new T.Group(); g.position.set(x, 0, z); root.add(g);
      const trunk = new T.Mesh(new T.CylinderGeometry(.14 * s, .22 * s, 5 * s, 7), M(C.wood)); trunk.position.y = 2.5 * s; trunk.rotation.z = lean; trunk.castShadow = true; g.add(trunk);
      const top = new T.Vector3(-Math.sin(lean) * 5 * s, 5 * s, 0);
      for (let i = 0; i < 7; i++) { const leaf = new T.Mesh(new T.ConeGeometry(.35 * s, 3 * s, 4), M(i % 2 ? C.leaf : C.leaf2)); leaf.position.copy(top); leaf.rotation.set(0, i / 7 * Math.PI * 2, Math.PI / 2.4); leaf.translateY(1.3 * s); leaf.castShadow = true; g.add(leaf); }
    }
    function person(x, z, c = C.pink, s = 1) { const g = new T.Group(); g.position.set(x, 0, z); root.add(g);
      const b = new T.Mesh(new T.CylinderGeometry(.25 * s, .35 * s, 1.1 * s, 8), M(c)); b.position.y = .55 * s; b.castShadow = true; g.add(b);
      const h = new T.Mesh(new T.SphereGeometry(.25 * s, 10, 8), M(C.dark)); h.position.y = 1.35 * s; h.castShadow = true; g.add(h); return g; }
    function hut(x, z, r = 1.4, wall = C.earth, roof = C.straw) { cyl(r, r, 1.6, wall, x, 0, z, 14); cone(r * 1.35, 1.8, roof, x, 1.6, z, 14); }
    function boat(x, z, rot = 0, c = C.wood) { const b = box(3, .35, .7, c, x, .05, z); b.rotation.y = rot; return b; }
    function sculpt(x, z, c) { cyl(.35, .45, .5, C.stone, x, 0, z, 8); box(.6, 2.2, .4, c, x, .5, z); ball(.42, c, x, 3, z); }

    /* ---------- maquettes par type de site ---------- */
    const B = {
      arch() { // Porte du Non-Retour
        ground(C.sand); water(90, 26, 0, -24, .03);
        box(18, .4, 9, C.white, 0, 0, 0);
        [-5.4, -2.7, 2.7, 5.4].forEach(x => [-2.6, 2.6].forEach(z => box(1.1, 7, 1.1, C.white, x, .4, z)));
        box(13.2, 2.4, 6.4, C.white, 0, 7.4, 0);
        box(12.6, 1.2, .1, C.laterite, 0, 8, 3.25); box(12.6, 1.2, .1, C.laterite, 0, 8, -3.25);
        for (let i = 0; i < 14; i++) { box(.28, .75, .1, C.dark, -5.8 + i * .9, 7.65, 3.31); box(.28, .75, .1, C.dark, -5.8 + i * .9, 7.65, -3.31); }
        const arc = add(new T.TorusGeometry(2.1, .35, 8, 24, Math.PI), C.laterite, 0, 4.5, 3.2); arc.rotation.z = 0;
        [-9, 9].forEach(x => { box(5, 1, 4, C.stone, x, 0, 0); for (let k = 0; k < 4; k++) cyl(.25, .3, 3 + k, '#6A3522', x - 1.8 + k * 1.2, 1, (k % 2) - .5, 8); });
        [[-14, 6], [13, 8], [-18, -4], [17, -2], [-10, 12], [10, 13]].forEach(([x, z], i) => palm(x, z, 1 + (i % 3) * .15, .1 + i * .03));
      },
      path() { // Route des Esclaves
        ground(C.grass); box(5, .06, 60, C.laterite, 0, 0, 0);
        for (let i = 0; i < 6; i++) { sculpt(-4.5, -22 + i * 9, [C.pink, C.gold, C.red, '#6C5CE7', C.leaf, C.sky][i]); sculpt(4.5, -18 + i * 9, [C.gold, C.red, C.pink, C.sky, '#6C5CE7', C.leaf][i]); }
        tree(-9, -8, 1.6); tree(9, 10, 1.4); palm(-10, 14); palm(11, -14); palm(-12, -20, 1.1);
        for (let i = 0; i < 5; i++) person(-.6 + (i % 2) * 1.2, -6 + i * 2.2, [C.pink, C.dark, C.gold, C.sky, C.red][i], .8);
      },
      temple() { // Temple des Pythons
        ground(C.sand); box(16, .2, 12, C.stone, 0, 0, 0);
        box(9, 4, 6, '#F1E7D3', 0, .2, 0); add(new T.ConeGeometry(7, 3, 4), C.laterite, 0, 5.7, 0).rotation.y = Math.PI / 4;
        box(1.6, 2.6, .2, C.dark, 0, .2, 3.05);
        for (let k = 0; k < 3; k++) { const s = add(new T.TorusGeometry(1.2 - k * .3, .18, 8, 24), '#8A6A2A', 4.5, .3 + k * .32, 4); s.rotation.x = Math.PI / 2; }
        ball(.28, '#8A6A2A', 5.6, 1.3, 4); tree(-7, -4, 1.8); tree(7, -5, 1.5); palm(-8, 5);
      },
      church() { // Basilique / cathédrale
        const striped = site.id === 'cathedrale';
        ground(C.stone); box(20, .2, 16, '#D9D2C4', 0, 0, 0);
        box(8, 7, 12, C.white, 0, .2, -1);
        if (striped) for (let i = 0; i < 6; i++) box(8.05, .55, 12.05, C.red, 0, .9 + i * 1.1, -1);
        add(new T.ConeGeometry(6.2, 3, 4), C.laterite, 0, 8.7, -1).rotation.y = Math.PI / 4;
        [-3.2, 3.2].forEach(x => { box(2.6, 11, 2.6, striped ? C.red : C.white, x, .2, 5.4); add(new T.ConeGeometry(1.9, 3.2, 4), C.laterite, x, 12.8, 5.4).rotation.y = Math.PI / 4; box(.12, 1.2, .12, C.gold, x, 14.4, 5.4); box(.7, .12, .12, C.gold, x, 14.9, 5.4); });
        box(2, 3.2, .2, C.dark, 0, .2, 5.05); add(new T.CircleGeometry(.9, 20), C.sky, 0, 6, 5.06);
        palm(-9, 6); palm(9, 7); tree(-8, -8); tree(8, -9);
      },
      fort() { // Fort portugais
        ground(C.grass); box(16, 3.5, 14, '#EDE4D3', 0, 0, 0);
        box(15, 3.6, 13, '#C9BBA2', 0, .01, 0);
        for (let i = 0; i < 8; i++) { box(1, .8, .8, '#EDE4D3', -7 + i * 2, 3.5, 7); box(1, .8, .8, '#EDE4D3', -7 + i * 2, 3.5, -7); }
        [[-8, -7], [8, -7], [-8, 7], [8, 7]].forEach(([x, z]) => { box(2.6, 5, 2.6, '#EDE4D3', x, 0, z); box(2.8, .4, 2.8, C.laterite, x, 5, z); });
        box(4, 5, 4, C.white, 0, 3.5, 0); box(4.4, .5, 4.4, C.laterite, 0, 8.5, 0);
        cyl(.06, .06, 3, C.dark, 0, 9, 0, 6); box(1.6, 1, .05, C.pink, .8, 11, 0);
        box(2, 2.6, .2, C.dark, 0, 0, 7.1); palm(-12, 4); palm(12, -3); tree(-11, -9);
      },
      forest() { // forêts sacrées, jardins
        ground('#6FA65E');
        for (let i = 0; i < 26; i++) { const a = i * 2.39, r = 7 + (i % 6) * 3; tree(Math.cos(a) * r, Math.sin(a) * r, .9 + (i % 4) * .3); }
        cyl(2.2, 2.6, 7, '#6B4A2E', 0, 0, 0, 10); ball(4.5, '#2F7A3E', 0, 9.5, 0); ball(3.2, '#3F8F4E', 2.5, 8, 1.5);
        if (site.id !== 'lama') [[4, 5, C.pink], [-5, 3, C.gold], [3, -5, C.red], [-4, -4, '#6C5CE7']].forEach(([x, z, c]) => sculpt(x, z, c));
        else for (let i = 0; i < 3; i++) { ball(.35, C.red, -3 + i * 2.5, 4.2 + i * .4, 2); }
      },
      villa() { // villas afro-brésiliennes, musées
        ground(C.grass); box(18, .2, 14, '#D9D2C4', 0, 0, 0);
        box(13, 4, 8, '#F4D6A0', 0, .2, 0); box(13, 3.6, 8, site.id === 'natitingou' ? '#F1E7D3' : '#F7C9D8', 0, 4.2, 0);
        add(new T.ConeGeometry(9.3, 2.6, 4), C.laterite, 0, 9.1, 0).rotation.y = Math.PI / 4;
        for (let i = 0; i < 5; i++) { box(1, 1.8, .15, '#3E7CB1', -5 + i * 2.5, 1.2, 4.05); box(1, 1.8, .15, '#3E7CB1', -5 + i * 2.5, 5, 4.05); }
        box(13.2, .3, 1.6, C.white, 0, 4.2, 4.6); for (let i = 0; i < 9; i++) cyl(.06, .06, .9, C.white, -6 + i * 1.5, 4.5, 5.3, 6);
        palm(-9, 5); palm(9, 6); tree(-8, -7); tree(8, -8);
      },
      memorial() { ground(C.grass); box(10, .4, 10, C.stone, 0, 0, 0); box(7, .4, 7, C.white, 0, .4, 0);
        add(new T.CylinderGeometry(.6, 1.4, 10, 4), C.white, 0, 5.8, 0).rotation.y = Math.PI / 4; add(new T.ConeGeometry(.85, 1.6, 4), C.gold, 0, 11.6, 0).rotation.y = Math.PI / 4;
        box(.6, 3, .1, C.laterite, 0, 2.5, 1.02); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(.3, .35, 1.2, C.stone, Math.cos(a) * 8, 0, Math.sin(a) * 8, 8); }
        tree(-12, -5, 1.4); tree(12, 4, 1.2); palm(-10, 10); },
      stilts() { // Ganvié
        scene.background.set('#FCE8F0'); ground('#7DB9DC', 40); water(80, 80, 0, 0, .08);
        for (let i = 0; i < 16; i++) { const a = i * 2.2, r = 4 + (i % 5) * 3.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
          for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(.1, .1, 1.6, C.wood, x + dx, 0, z + dz, 5);
          box(2.6, .2, 2.6, C.wood, x, 1.5, z); box(2.2, 1.5, 2.2, i % 3 ? '#C9A27E' : C.rose, x, 1.7, z); add(new T.ConeGeometry(2.1, 1.4, 4), C.straw, x, 3.9, z).rotation.y = Math.PI / 4; }
        for (let i = 0; i < 6; i++) { const b = boat(0, 0, 0); const r = 7 + i * 3, sp = .08 + i * .015, ph = i * 1.3;
          const p = person(0, 0, [C.pink, C.gold, C.red, C.sky][i % 4], .6);
          anim.push(t => { const a = t * sp + ph; b.position.set(Math.cos(a) * r, .1, Math.sin(a) * r); b.rotation.y = -a; p.position.set(Math.cos(a) * r, .45, Math.sin(a) * r); }); }
      },
      statue() { // Amazone, Béhanzin
        const big = site.id === 'amazone';
        ground(big ? '#D9D2C4' : '#B98A6A'); if (big) water(90, 24, 0, -26, .03);
        box(12, .6, 12, C.stone, 0, 0, 0); box(8, .6, 8, C.stone, 0, .6, 0); box(4, big ? 3 : 4, 4, big ? '#8D7A6A' : '#5C5650', 0, 1.2, 0);
        const top = big ? 4.2 : 5.2, col = big ? '#6B4A2A' : '#3A3A3A';
        cyl(.9, 1.1, 4.5, col, 0, top, 0, 10); ball(.75, col, 0, top + 5.4, 0); cyl(.5, .6, 2.2, col, -.5, top - 1.9, 0, 8);
        const arm = add(new T.CylinderGeometry(.25, .25, 3.2, 8), col, 1.3, top + 4.6, 0); arm.rotation.z = big ? -.5 : -.9;
        if (big) { const gun = add(new T.CylinderGeometry(.1, .1, 4.5, 6), C.dark, 2.3, top + 5.8, 0); gun.rotation.z = -.3; }
        palm(-10, 6); palm(10, 7); tree(-9, -9); tree(9, -8);
      },
      rider() { // Bio Guéra, Nikki (cavaliers)
        const many = site.id === 'nikki'; ground(many ? '#C99A6A' : C.grass);
        const horse = (x, z, c, rot = 0, s = 1) => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; root.add(g);
          const m = c => M(c), body = new T.Mesh(new T.BoxGeometry(3 * s, 1.1 * s, 1 * s), m(c)); body.position.y = 2 * s; g.add(body);
          [[-1.1, -.35], [-1.1, .35], [1.1, -.35], [1.1, .35]].forEach(([lx, lz]) => { const l = new T.Mesh(new T.BoxGeometry(.25 * s, 1.6 * s, .25 * s), m(c)); l.position.set(lx * s, .8 * s, lz * s); g.add(l); });
          const neck = new T.Mesh(new T.BoxGeometry(.6 * s, 1.6 * s, .6 * s), m(c)); neck.position.set(1.6 * s, 2.9 * s, 0); neck.rotation.z = -.5; g.add(neck);
          const head = new T.Mesh(new T.BoxGeometry(1 * s, .5 * s, .5 * s), m(c)); head.position.set(2.1 * s, 3.6 * s, 0); g.add(head);
          const rider = new T.Mesh(new T.CylinderGeometry(.3 * s, .4 * s, 1.4 * s, 8), m(many ? [C.pink, C.white, C.gold, C.sky][Math.abs(Math.round(x)) % 4] : '#3A3A3A')); rider.position.set(0, 3.2 * s, 0); g.add(rider);
          const hd = new T.Mesh(new T.SphereGeometry(.3 * s, 10, 8), m(C.dark)); hd.position.set(0, 4.1 * s, 0); g.add(hd);
          g.traverse(o => { o.castShadow = true; }); return g; };
        if (many) { box(12, 4, 6, C.earth, 0, 0, -10); box(12.4, .5, 6.4, C.laterite, 0, 4, -10);
          for (let i = 0; i < 9; i++) { const h = horse(-12 + (i % 5) * 6, -1 + Math.floor(i / 5) * 6, ['#6B4A2E', '#F2EDE5', '#3A2A22'][i % 3], .2, .9); const ph = i; anim.push(t => { h.position.y = Math.abs(Math.sin(t * 3 + ph)) * .25; }); }
          for (let i = 0; i < 14; i++) person(-14 + i * 2.1, 9, [C.pink, C.gold, C.sky, C.red][i % 4], .8); }
        else { cyl(4.6, 4.8, .8, C.stone, 0, 0, 0, 24); cyl(3.6, 3.8, 1.8, '#4B4743', 0, .8, 0, 24); const h = horse(0, 0, '#3A3A3A', .3, 1.4); h.position.y = 2.6; h.rotation.z = .25; palm(-9, 7); palm(9, -7); }
      },
      palace() { // Abomey, Honmè, Savalou
        ground(site.id === 'abomey' ? C.laterite : C.earth);
        const wallC = site.id === 'abomey' ? '#B5643A' : '#C98B5E';
        box(22, 2.6, .8, wallC, 0, 0, -9); box(22, 2.6, .8, wallC, 0, 0, 9); box(.8, 2.6, 18, wallC, -11, 0, 0); box(.8, 2.6, 18, wallC, 11, 0, 0);
        box(.8, 2.6, 18, wallC, 0, 0, 0);
        [[-5.5, -3], [5.5, 2]].forEach(([x, z], i) => { box(7, 3.2, 5, i ? '#E4C49A' : '#D9A877', x, 0, z); add(new T.ConeGeometry(5.8, 3, 4), C.straw, x, 3.2, z).rotation.y = Math.PI / 4; });
        // bas-reliefs colorés
        for (let i = 0; i < 9; i++) { box(1, 1, .15, [C.red, C.gold, C.white, C.sky, C.leaf][i % 5], -9 + i * 2.2, .8, 9.45); }
        box(2.4, 2.4, .9, C.dark, 0, 0, 9.05); tree(-14, 4, 1.6); tree(14, -4, 1.8); tree(13, 10, 1.3);
      },
      mosque() { // Grande mosquée de Porto-Novo (style afro-brésilien)
        ground(C.stone); box(20, .2, 14, '#D9D2C4', 0, 0, 0);
        box(14, 8, 9, '#F6D9A8', 0, .2, 0);
        const bands = [C.pink, C.sky, C.gold, '#2E9E6B'];
        for (let i = 0; i < 4; i++) box(14.1, .35, 9.1, bands[i], 0, 1.6 + i * 1.7, 0);
        for (let i = 0; i < 5; i++) { box(1.4, 2.6, .2, '#3E7CB1', -5 + i * 2.5, 2, 4.6); add(new T.CircleGeometry(.7, 16, 0, Math.PI), C.white, -5 + i * 2.5, 4.6, 4.62); }
        add(new T.ConeGeometry(5, 2.5, 4), C.laterite, 0, 9.4, 0).rotation.y = Math.PI / 4;
        [-6.2, 6.2].forEach(x => { cyl(.9, 1, 12, '#F6D9A8', x, .2, 4, 12); ball(1.1, '#2E9E6B', x, 12.6, 4); box(.08, 1, .08, C.gold, x, 13.6, 4); });
        ball(2.2, '#2E9E6B', 0, 10.8, -1.5); palm(-10, 6); palm(10, 6);
      },
      gate() { // Kétou
        ground(C.laterite); box(30, 3, 2, '#9E5B3A', -9, 0, 0); box(30, 3, 2, '#9E5B3A', 9 + 15, 0, 0);
        box(5, 6, 3, '#B5643A', -3.5, 0, 0); box(5, 6, 3, '#B5643A', 3.5, 0, 0); box(12, 1.6, 3.4, '#8A4A2A', 0, 6, 0); add(new T.ConeGeometry(8, 2.6, 4), C.straw, 0, 7.6, 0).rotation.y = Math.PI / 4;
        for (let i = 0; i < 4; i++) box(.5, .5, .1, [C.white, C.gold, C.red, C.white][i], -4.5 + i * 3, 3.5, 1.56);
        tree(-10, 7, 1.6); tree(10, -7, 1.8); person(1, 4, C.gold); person(-1, 5, C.pink);
      },
      cave() { // Agongointo
        ground(C.laterite);
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = i ? 7 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r;
          const hole = add(new T.CylinderGeometry(1.2, 1.2, .1, 20), '#1E120C', x, .06, z); hole.receiveShadow = true; cyl(1.5, 1.6, .5, '#8A4A2A', x, 0, z, 20).material = M('#8A4A2A', {side: T.BackSide}); }
        box(4, 2.4, 3, C.straw, 10, 0, 6); add(new T.ConeGeometry(3.3, 1.6, 4), C.straw, 10, 2.4, 6).rotation.y = Math.PI / 4; tree(-11, -6, 1.5); tree(12, -8, 1.3);
      },
      hills() { // Dassa-Zoumè
        ground(C.grass, 40);
        [[0, 0, 7, 6], [-11, -6, 5, 4.5], [10, -8, 5.5, 5], [-8, 9, 4, 3.5], [11, 8, 4.5, 4]].forEach(([x, z, r, h]) => { const d = add(new T.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#9D9690', x, 0, z); d.scale.y = h / r; });
        box(2.4, 2.2, 3.4, C.white, 0, 5.7, 0); add(new T.ConeGeometry(2.2, 1.6, 4), C.sky, 0, 7.9, 0).rotation.y = Math.PI / 4; box(.12, 1.2, .12, C.gold, 0, 9.4, 0); box(.7, .12, .12, C.gold, 0, 9.8, 0);
        for (let i = 0; i < 10; i++) person(-6 + i * 1.3, 8 + (i % 2), [C.white, C.sky, C.pink][i % 3], .7);
        tree(-15, 2); tree(15, 0); tree(3, 13, 1.2);
      },
      lake() { // Ahémé, Bouche du Roy
        ground(site.id === 'boucheroy' ? C.sand : C.grass, 40); water(48, 26, 0, -4, .08);
        if (site.id === 'boucheroy') { water(90, 22, 0, -30, .05); for (let i = 0; i < 12; i++) { const x = -18 + i * 3.2; cyl(.15, .2, 1.4, C.wood, x, 0, 9 + (i % 2)); ball(1.1, '#2F6E3E', x, 1.9, 9 + (i % 2)); } }
        for (let i = 0; i < 5; i++) hut(-14 + i * 6.5, 13, 1.3);
        for (let i = 0; i < 4; i++) { const b = boat(0, 0); const p = person(0, 0, [C.pink, C.gold, C.red, C.sky][i], .6); const ph = i * 1.6;
          anim.push(t => { const x = Math.sin(t * .15 + ph) * 16, z = -6 + i * 2.5; b.position.set(x, .12, z); p.position.set(x, .47, z); }); }
        for (let i = 0; i < 8; i++) cyl(.07, .07, 2, C.wood, -8 + i * 2, 0, -10, 5);
        palm(-17, 9); palm(17, 10); palm(-12, 16, 1.1);
      },
      beach() { // Fidjrossè, Grand-Popo
        ground(C.sand, 40); water(100, 30, 0, -24, .05);
        const waves = []; for (let i = 0; i < 3; i++) { const w = add(new T.BoxGeometry(60, .12, .6), C.white, 0, .12, -9.5 - i * 2.2); waves.push(w); }
        anim.push(t => waves.forEach((w, i) => { w.position.z = -9.5 - i * 2.2 + Math.sin(t * .8 + i) * .8; }));
        for (let i = 0; i < 10; i++) palm(-20 + i * 4.4, 4 + (i % 3) * 3, 1 + (i % 2) * .2, .25 - (i % 3) * .08);
        [[-6, 0, C.pink], [2, 1, C.gold], [9, -1, C.sky]].forEach(([x, z, c]) => { cyl(.08, .08, 2.4, C.white, x, 0, z, 6); cone(1.6, .8, c, x, 2.4, z, 10); });
        boat(-12, -4, .3, C.pink); boat(14, -5, -.2, C.sky); person(-3, -2, C.red, .8); person(5, -3, C.gold, .8);
      },
      market() { // Dantokpa, artisanat, Adjarra
        ground('#C9B79A');
        const cols = [C.pink, C.gold, C.sky, C.red, '#2E9E6B', '#6C5CE7'];
        for (let i = 0; i < 12; i++) { const x = -12 + (i % 4) * 8, z = -8 + Math.floor(i / 4) * 8;
          for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) cyl(.07, .07, 2.4, C.wood, x + dx, 0, z + dz, 5);
          box(3.8, .12, 3, cols[i % 6], x, 2.4, z); box(3, .9, 2, C.wood, x, 0, z);
          for (let k = 0; k < 4; k++) ball(.3, [C.red, C.gold, '#2E9E6B', C.pink][(i + k) % 4], x - 1 + k * .65, 1.15, z); }
        for (let i = 0; i < 16; i++) { const p = person(-14 + (i * 7) % 28, -12 + (i * 5) % 24, cols[i % 6], .75); const ph = i; anim.push(t => { p.position.x += Math.sin(t * .5 + ph) * .006; }); }
      },
      monument() { // Étoile rouge
        ground('#8A8F95', 36); cyl(10, 10, .2, C.grass, 0, 0, 0, 40); cyl(2.5, 3, 1.2, C.stone, 0, .2, 0, 20);
        cyl(.7, .9, 10, C.white, 0, 1.4, 0, 12);
        const shape = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.1 : 2.6, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        const star = add(new T.ExtrudeGeometry(shape, {depth: .5, bevelEnabled: false}), C.red, 0, 13.6, -.25); anim.push(t => { star.rotation.y = t * .6; });
        for (let i = 0; i < 6; i++) { const car = box(2, .9, 1, [C.gold, C.pink, C.white][i % 3], 0, 0, 0); const ph = i / 6 * Math.PI * 2; anim.push(t => { const a = t * .3 + ph; car.position.set(Math.cos(a) * 14, .45, Math.sin(a) * 14); car.rotation.y = -a; }); }
      },
      savanna() { // Pendjari, parc W
        ground('#C9B36A', 40); if (site.id === 'parcw') water(80, 6, 0, -8, .06); else water(14, 8, -6, -6, .06);
        for (let i = 0; i < 9; i++) { const x = -16 + (i * 9) % 32, z = -14 + (i * 7) % 28; cyl(.2, .3, 3, C.wood, x, 0, z, 6); const c = add(new T.CylinderGeometry(2.6, 2.2, .6, 10), C.leaf, x, 3.3, z); }
        const elephant = (x, z, s = 1) => { const g = new T.Group(); g.position.set(x, 0, z); root.add(g); const m = M('#8E8A86');
          const b = new T.Mesh(new T.BoxGeometry(3 * s, 1.8 * s, 1.6 * s), m); b.position.y = 2.2 * s; g.add(b);
          [[-1, -.5], [-1, .5], [1, -.5], [1, .5]].forEach(([a, c]) => { const l = new T.Mesh(new T.CylinderGeometry(.3 * s, .3 * s, 1.5 * s, 8), m); l.position.set(a * s, .75 * s, c * s); g.add(l); });
          const h = new T.Mesh(new T.BoxGeometry(1.2 * s, 1.2 * s, 1.2 * s), m); h.position.set(1.9 * s, 2.6 * s, 0); g.add(h);
          const tr = new T.Mesh(new T.CylinderGeometry(.15 * s, .22 * s, 1.6 * s, 6), m); tr.position.set(2.5 * s, 1.8 * s, 0); g.add(tr);
          [-.75, .75].forEach(e => { const ear = new T.Mesh(new T.BoxGeometry(.2 * s, 1 * s, .9 * s), m); ear.position.set(1.5 * s, 2.8 * s, e * s); g.add(ear); });
          g.traverse(o => { o.castShadow = true; }); return g; };
        const herd = [elephant(4, 2), elephant(9, 5, .8), elephant(-2, 8, 1.1)];
        herd.forEach((g, i) => anim.push(t => { g.position.x += Math.sin(t * .2 + i) * .004; g.rotation.y = Math.sin(t * .1 + i) * .3; }));
        for (let i = 0; i < 6; i++) { const ant = box(1, .7, .4, '#B07A3A', -10 + i * 1.6, .9, 10 + (i % 2)); cyl(.06, .06, .9, '#B07A3A', -10 + i * 1.6, 0, 10 + (i % 2), 4); }
        box(4, 2.6, 3, '#E9D9B8', -15, 0, 12); add(new T.ConeGeometry(3.3, 1.6, 4), C.straw, -15, 2.6, 12).rotation.y = Math.PI / 4;
      },
      falls() { // Tanougou, Kota
        ground(C.grass, 40);
        const cliff = add(new T.BoxGeometry(34, 14, 10), '#7E6E62', 0, 7, -12);
        box(10, 2, 6, '#8C7B6E', -10, 0, -6); box(8, 3, 5, '#8C7B6E', 11, 0, -7);
        water(14, 10, 0, 1, .1);
        const fall = []; for (let i = 0; i < 6; i++) { const f = add(new T.PlaneGeometry(1.2, 14), M('#DDF1FB', {transparent: true, opacity: .75, side: T.DoubleSide}), -3 + i * 1.2, 7, -6.9); fall.push(f); }
        anim.push(t => fall.forEach((f, i) => { f.material.opacity = .55 + Math.sin(t * 6 + i) * .2; f.scale.x = 1 + Math.sin(t * 4 + i * 2) * .15; }));
        const foam = []; for (let i = 0; i < 10; i++) foam.push(ball(.5, C.white, -3 + Math.random() * 6, .3, -5 + Math.random() * 2));
        anim.push(t => foam.forEach((b, i) => { b.position.y = .25 + Math.abs(Math.sin(t * 3 + i)) * .5; }));
        for (let i = 0; i < 8; i++) tree(-16 + i * 4.6, -16, 1.2 + (i % 3) * .2); tree(-12, 8, 1.4); tree(12, 9, 1.5); person(5, 6, C.pink, .8); person(6.5, 6.5, C.gold, .8);
      },
      tata() { // Tata Somba
        ground('#C9A27E');
        const tata = (x, z, s = 1) => {
          [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5], [0, 2.2]].forEach(([dx, dz]) => { cyl(1.1 * s, 1.25 * s, 4.4 * s, '#A9673E', x + dx * s, 0, z + dz * s, 14); cone(1.3 * s, 2 * s, C.straw, x + dx * s, 4.4 * s, z + dz * s, 14); });
          box(4.4 * s, 2.8 * s, 3.4 * s, '#B5743F', x, 0, z); box(4.6 * s, .25 * s, 3.6 * s, '#8A4A2A', x, 2.8 * s, z);
          box(.9 * s, 1.5 * s, .1 * s, C.dark, x, 0, z + 1.72 * s); };
        tata(0, 0, 1.2); tata(-12, -7, .8); tata(11, -9, .85);
        tree(-10, 8, 1.8); tree(12, 7, 1.4); for (let i = 0; i < 3; i++) cyl(.6, .8, 2, '#8A4A2A', 5 + i * 1.8, 0, 6, 10);
      },
      huts() { // Taneka
        ground('#9B8B6A', 40); const hill = add(new T.SphereGeometry(16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#8E8466', 0, 0, 0); hill.scale.y = .35;
        for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 3 + (i % 5) * 2.4, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 5.6 * Math.sqrt(Math.max(0, 1 - (r / 16) ** 2)) - .3;
          const g = new T.Group(); g.position.set(x, y, z); root.add(g);
          const w = new T.Mesh(new T.CylinderGeometry(1, 1, 1.4, 12), M('#A9673E')); w.position.y = .7; w.castShadow = true; g.add(w);
          const rf = new T.Mesh(new T.ConeGeometry(1.4, 2, 12), M(C.straw)); rf.position.y = 2.4; rf.castShadow = true; g.add(rf);
          const pot = new T.Mesh(new T.SphereGeometry(.18, 8, 6), M(C.dark)); pot.position.y = 3.5; g.add(pot); }
        tree(-15, 6, 1.6); tree(15, -5, 1.4);
      }
    };

    /* ---------- construction ---------- */
    let loaded = false;
    if (site.model && T.GLTFLoader) {
      new T.GLTFLoader().load(site.model, g => { const obj = g.scene; const bb = new T.Box3().setFromObject(obj), sz = bb.getSize(new T.Vector3()).length();
        obj.scale.setScalar(26 / sz); obj.position.sub(bb.getCenter(new T.Vector3()).multiplyScalar(26 / sz)); obj.position.y += 4; obj.traverse(o => { o.castShadow = o.receiveShadow = true; }); root.add(obj); loaded = true; frame(); },
      undefined, () => { (B[KIND[site.id]] || B.memorial)(); });
    } else (B[KIND[site.id]] || B.memorial)();

    /* ---------- cadrage automatique : toute la maquette entre dans l'écran ---------- */
    const home = {pos: new T.Vector3(22, 15, 26), target: new T.Vector3(0, 3, 0)};
    function frame() {
      const bb = new T.Box3(); root.children.forEach(o => { if (!(o.geometry && o.geometry.type === 'CircleGeometry') && !(o.geometry && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width > 40)) bb.expandByObject(o); });
      if (bb.isEmpty()) return;
      const size = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3());
      const r = Math.max(size.x, size.z, size.y * 1.4) * .5, fov = camera.fov * Math.PI / 180, aspect = Math.min(1, camera.aspect);
      const dist = Math.min(64, Math.max(14, r / Math.sin(fov / 2) / Math.max(.55, aspect) * .78));
      home.target.set(c.x, Math.min(c.y, size.y * .45), c.z);
      home.pos.copy(new T.Vector3(.62, .45, .72).normalize().multiplyScalar(dist).add(home.target));
      camera.position.copy(home.pos); controls.target.copy(home.target); controls.maxDistance = dist * 1.8; controls.update();
    }
    frame();

    /* ---------- boucle d'affichage ---------- */
    const clock = new T.Clock(); let raf = 0, alive = true;
    const loop = () => { if (!alive) return; raf = requestAnimationFrame(loop); const tt = clock.getElapsedTime(); anim.forEach(f => f(tt)); controls.update(); renderer.render(scene, camera); };
    loop();
    const onResize = () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); };
    const ro = window.ResizeObserver ? new ResizeObserver(onResize) : null; ro ? ro.observe(container) : window.addEventListener('resize', onResize);
    controls.addEventListener('start', () => { controls.autoRotate = false; opts.onSpin && opts.onSpin(false); });

    return {
      reset() { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); },
      toggleSpin() { controls.autoRotate = !controls.autoRotate; return controls.autoRotate; },
      destroy() { alive = false; cancelAnimationFrame(raf); ro && ro.disconnect(); controls.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); Object.values(mats).forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove(); }
    };
  }
  window.BI3D = {open, KIND};
})();
