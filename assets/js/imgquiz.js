/* ============ 识图拖放：细菌芽孢结构 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, esc = U.esc;
  App.imgState = App.imgState || { placed: {}, sel: null, checked: false, order: null };

  const LAYERS = [
    { key: 'exosporium', name: '孢外壁', py: 46 },
    { key: 'coat', name: '芽孢衣', py: 78 },
    { key: 'cortex', name: '皮层', py: 112 },
    { key: 'wall', name: '芽孢壁', py: 150 },
    { key: 'membrane', name: '芽孢质膜', py: 182 },
    { key: 'core', name: '芽孢质（核心）', py: 214 }
  ];
  const EXTRA = [{ key: 'sporangium', name: '芽孢囊（营养细胞）', py: 300 }];
  const ALL = LAYERS.concat(EXTRA);

  const SLOT_X = 470, SLOT_W = 176, SLOT_H = 30;

  App.view_image = function (v) {
    v.innerHTML = '<h1 class="page-title">识图练习</h1><p class="page-sub">拖动或点选标签，标注细菌芽孢的层次结构。芽孢由外向内共六层，外面还有营养细胞残留的芽孢囊。</p>' +
      App.renderImgQuiz();
  };

  function refresh() {
    if (App.route.name === 'image') App.view_image($('#view'));
    else if (App.refreshTool) App.refreshTool();
  }

  App.renderImgQuiz = function () {
    const st = App.imgState;
    const placedKeys = Object.keys(st.placed);
    let h = '<div class="row" style="margin-bottom:10px">' +
      '<button class="btn" data-act="img-reset">重新开始</button>' +
      '<button class="btn" data-act="img-check">检查</button>' +
      '<button class="btn" data-act="img-answer">显示答案</button>' +
      '<span class="small muted">拖拽标签到右侧对应位置，或先点标签再点位置。</span></div>';

    if (!st.order) st.order = shuffle(ALL).map(l => l.key);
    const poolHtml = '<div class="label-pool" id="labelPool">' + st.order.map(k => ALL.find(x => x.key === k)).map(l => {
      const used = placedKeys.indexOf(l.key) >= 0;
      return '<span class="drag-label' + (used ? ' used' : '') + '" draggable="false" data-key="' + l.key + '" data-act="img-label">' + esc(l.name) + '</span>';
    }).join('') + '</div>';
    h += poolHtml;
    h += '<div class="img-quiz"><svg viewBox="0 0 680 420" id="sporeSvg" aria-label="芽孢结构标注练习">' +
      '<defs><radialGradient id="coreG" cx="50%" cy="45%">' +
      '<stop offset="0%" stop-color="#f3e6c8"/><stop offset="100%" stop-color="#e0c894"/></radialGradient></defs>' +
      /* 芽孢囊 */
      '<ellipse cx="235" cy="205" rx="196" ry="140" fill="#f6f3ea" stroke="#cfc8b8" stroke-width="1.2" stroke-dasharray="5 4"/>' +
      /* 各层 */
      '<ellipse cx="235" cy="205" rx="166" ry="115" fill="#fbf8ef" stroke="#cbb98d" stroke-width="2"/>' +
      '<ellipse cx="235" cy="205" rx="150" ry="100" fill="#f7efd9" stroke="#c2a86f" stroke-width="2"/>' +
      '<ellipse cx="235" cy="205" rx="128" ry="80" fill="#efe2c0" stroke="#b99a5c" stroke-width="2"/>' +
      '<ellipse cx="235" cy="205" rx="88" ry="52" fill="#f6edd8" stroke="#b99a5c" stroke-width="1.6"/>' +
      '<ellipse cx="235" cy="205" rx="78" ry="44" fill="#f1e6cd" stroke="#a98c52" stroke-width="1.4"/>' +
      '<ellipse cx="235" cy="205" rx="64" ry="34" fill="url(#coreG)" stroke="#9a7d45" stroke-width="1.4"/>' +
      '<text x="235" y="209" text-anchor="middle" font-size="10" fill="#6d5a32">核心</text>' +

      /* 引线 + 插槽 */
      ALL.map((l, i) => {
        const slotY = 42 + i * 50;
        const anchorY = l.key === 'sporangium' ? 205 - 140 : 205 - (l.py - 46) * 0 + (205 - l.py);
        const ay = l.key === 'sporangium' ? 78 : (205 - (l.ry || 0));
        const target = anchorFor(l.key);
        const placed = st.placed[l.key];
        const ok = st.checked && placed === l.key;
        const bad = st.checked && placed && placed !== l.key;
        const cls = ok ? ' slot-ok' : bad ? ' slot-bad' : '';
        return '<line x1="' + (target.x) + '" y1="' + target.y + '" x2="' + (SLOT_X - 8) + '" y2="' + (slotY + 15) + '" stroke="#d6cfbe" stroke-width="1"/>' +
          '<circle cx="' + target.x + '" cy="' + target.y + '" r="2.6" fill="#9a9384"/>' +
          '<g class="slot' + cls + '" data-zone="' + l.key + '" data-act="img-slot">' +
          '<rect x="' + SLOT_X + '" y="' + slotY + '" width="' + SLOT_W + '" height="' + SLOT_H + '" rx="8" fill="' + (placed ? '#fff' : '#fcfbf6') + '" stroke="' + (ok ? '#7fb393' : bad ? '#d8a49b' : '#ded7c7') + '" stroke-dasharray="' + (placed ? '0' : '4 3') + '"/>' +
          '<text x="' + (SLOT_X + SLOT_W / 2) + '" y="' + (slotY + 19) + '" text-anchor="middle" font-size="12" fill="' + (placed ? (ok ? '#2c7346' : bad ? '#a93a30' : '#20241f') : '#a8a294') + '">' +
          (placed ? esc(nameOf(placed)) : '拖到这里') + '</text></g>';
      }).join('') +
      '</svg></div>';

    if (st.checked) {
      const correct = ALL.filter(l => st.placed[l.key] === l.key).length;
      h += '<div class="callout ' + (correct === ALL.length ? '' : 'warn') + '"><b>检查结果：' + correct + ' / ' + ALL.length + ' 正确。</b>' +
        (correct === ALL.length ? '六个层次与芽孢囊全部对应正确。' : '红色为放置错误，可点击已放置的标签取回后重试。') + '</div>';
    }

    h += '<div class="callout">芽孢由外向内：孢外壁 → 芽孢衣 → 皮层 → 芽孢壁 → 芽孢质膜 → 芽孢质（核心），整体位于芽孢囊（营养细胞残留）内。' +
      '皮层膨胀、核心失水是渗透调节皮层膨胀学说的关键。</div>';
    return h;
  };

  function nameOf(key) { const l = ALL.find(x => x.key === key); return l ? l.name : key; }

  function anchorFor(key) {
    switch (key) {
      case 'sporangium': return { x: 235, y: 66 };
      case 'exosporium': return { x: 235, y: 90 };
      case 'coat': return { x: 235, y: 105 };
      case 'cortex': return { x: 235, y: 125 };
      case 'wall': return { x: 235, y: 153 };
      case 'membrane': return { x: 235, y: 161 };
      default: return { x: 235, y: 205 };
    }
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function place(zone, key) {
    const st = App.imgState;
    // 若该标签已在别处，先移除
    Object.keys(st.placed).forEach(z => { if (st.placed[z] === key) delete st.placed[z]; });
    st.placed[zone] = key; st.checked = false;
    refresh();
  }
  function unplace(zone) {
    const st = App.imgState;
    delete st.placed[zone]; st.checked = false; refresh();
  }
  App.imgUnplace = unplace;

  /* 统一拖拽：芽孢标签 -> 插槽；细胞壁成分 -> 分类列 */
  let drag = null, ghost = null, startX = 0, startY = 0;
  document.addEventListener('pointerdown', function (e) {
    const lab = e.target.closest('[data-act="img-label"]');
    const chip = e.target.closest('[data-act="wall-chip"]');
    const el = lab || chip;
    if (!el || el.classList.contains('used')) return;
    drag = { key: el.dataset.key, kind: lab ? 'img' : 'wall', moved: false };
    startX = e.clientX; startY = e.clientY;
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = el.textContent;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    document.body.appendChild(ghost);
    e.preventDefault();
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || !ghost) return;
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 6) drag.moved = true;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
  });
  function endDrag(e, cancelled) {
    if (!drag) return;
    const d = drag;
    if (ghost) { ghost.remove(); ghost = null; }
    drag = null;
    if (cancelled) { refresh(); return; }
    if (!d.moved) {
      if (d.kind === 'img') App.imgState.sel = App.imgState.sel === d.key ? null : d.key;
      else App.wallState.sel = App.wallState.sel === d.key ? null : d.key;
      refresh();
      return;
    }
    App._suppressClickUntil = Date.now() + 350;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (d.kind === 'img') {
      const slot = el && el.closest('[data-zone]');
      if (slot) place(slot.dataset.zone, d.key); else refresh();
    } else {
      const col = el && el.closest('[data-group]');
      if (col) App.wallPlace(d.key, col.dataset.group); else refresh();
    }
  }
  document.addEventListener('pointerup', function (e) { endDrag(e, false); });
  document.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  document.addEventListener('click', function (e) {
    if (Date.now() < (App._suppressClickUntil || 0)) return;
    const slot = e.target.closest('[data-act="img-slot"]');
    if (slot) {
      const st = App.imgState;
      if (st.sel) { place(slot.dataset.zone, st.sel); st.sel = null; }
      else if (st.placed[slot.dataset.zone]) unplace(slot.dataset.zone);
      return;
    }
    const btn = e.target.closest('[data-act]');
    const act = btn ? btn.dataset.act : '';
    if (act === 'img-reset') { App.imgState = { placed: {}, sel: null, checked: false, order: null }; refresh(); }
    if (act === 'img-check') { App.imgState.checked = true; refresh(); }
    if (act === 'img-answer') {
      const p = {}; ALL.forEach(l => p[l.key] = l.key);
      App.imgState.placed = p; App.imgState.checked = true; refresh();
    }
  });
})();

/* ============ 细胞壁成分归类（G+ / G- / 共有） ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, esc = U.esc;
  const ITEMS = [
    { id: 'teichoic', name: '磷壁酸', group: 'gp' },
    { id: 'bridge', name: '肽桥', group: 'gp' },
    { id: 'lps', name: '脂多糖（LPS）', group: 'gm' },
    { id: 'outer', name: '外膜', group: 'gm' },
    { id: 'periplasm', name: '周质空间', group: 'gm' },
    { id: 'lpp', name: '脂蛋白', group: 'gm' },
    { id: 'peptido', name: '肽聚糖', group: 'both' },
    { id: 'tetra', name: '四肽尾', group: 'both' }
  ];
  const GROUPS = [['gp', 'G+ 特有'], ['gm', 'G− 特有'], ['both', '两者共有']];
  App.wallState = App.wallState || { buckets: {}, checked: false, sel: null };

  App.renderWallSort = function () {
    const st = App.wallState;
    const pool = ITEMS.filter(x => !st.buckets[x.id]);
    let h = '<div class="row" style="margin-bottom:10px">' +
      '<button class="btn" data-act="wall-reset">重新开始</button>' +
      '<button class="btn" data-act="wall-check">检查</button>' +
      '<span class="small muted">把成分拖到对应列，或先点成分再点列。注意：肽聚糖与四肽尾是两者共有。</span></div>';
    h += '<div class="wall-grid">' + GROUPS.map(g => {
      const ids = Object.keys(st.buckets).filter(k => st.buckets[k] === g[0]);
      return '<div class="wall-col" data-group="' + g[0] + '" data-act="wall-col">' +
        '<h5>' + g[1] + '</h5><div class="wall-drop">' +
        (ids.length ? ids.map(id => {
          const it = ITEMS.find(x => x.id === id);
          const ok = st.checked && it.group === g[0];
          const bad = st.checked && it.group !== g[0];
          return '<span class="wall-chip ' + (ok ? 'ok' : bad ? 'bad' : '') + '" data-act="wall-pick" data-id="' + id + '">' + esc(it.name) + '</span>';
        }).join('') : '<span class="muted small">拖到这里</span>') +
        '</div></div>';
    }).join('') + '</div>';
    h += '<div class="label-pool">' + (pool.length ? pool.map(x =>
      '<span class="drag-label" draggable="false" data-key="' + x.id + '" data-act="wall-chip">' + esc(x.name) + '</span>').join('') : '<span class="small muted">全部已归类</span>') + '</div>';
    if (st.checked) {
      const right = ITEMS.filter(x => st.buckets[x.id] === x.group).length;
      h += '<div class="callout ' + (right === ITEMS.length ? '' : 'warn') + '"><b>' + right + ' / ' + ITEMS.length + ' 归类正确。</b>' +
        (right === ITEMS.length ? '细胞壁成分的种属差异已掌握。' : '红色为放错，点击可取回重放。') + '</div>';
    }
    h += '<div class="callout">判断口诀：磷壁酸只在 G+；脂多糖、外膜、周质空间、脂蛋白只在 G−；肽聚糖骨架与四肽尾两类都有，差别在肽桥与交联度。</div>';
    return h;
  };

  App.wallPlace = function (id, group) {
    const st = App.wallState;
    st.buckets[id] = group; st.checked = false; st.sel = null;
    if (App.refreshTool) App.refreshTool();
  };

  document.addEventListener('click', function (e) {
    if (Date.now() < (App._suppressClickUntil || 0)) return;
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'wall-col') {
      const st = App.wallState;
      if (st.sel) { App.wallPlace(st.sel, t.dataset.group); }
      return;
    }
    if (act === 'wall-pick') {
      const st = App.wallState;
      delete st.buckets[t.dataset.id]; st.checked = false;
      if (App.refreshTool) App.refreshTool();
      return;
    }
    if (act === 'wall-reset') { App.wallState = { buckets: {}, checked: false, sel: null }; if (App.refreshTool) App.refreshTool(); return; }
    if (act === 'wall-check') { App.wallState.checked = true; if (App.refreshTool) App.refreshTool(); return; }
  });
})();
