/* ============ 知识地图 · 思维导图 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, esc = U.esc, D = App.data;

  const LEVEL_X = [0, 200, 400, 600, 790];
  const NODE_W = [210, 190, 240, 205, 240];
  const NODE_H = [46, 42, 40, 34, 30];
  const GAP = [18, 14, 10, 8];

  const PARTS = [
    { id: 'part1', name: '第一部分 基础知识与分类', chs: [1, 2, 3, 4] },
    { id: 'part2', name: '第二部分 生长与控制', chs: [5, 7] },
    { id: 'part3', name: '第三部分 遗传与进化', chs: [8] },
    { id: 'part4', name: '第四部分 生态与环境', chs: [9] },
    { id: 'part5', name: '第五部分 传染与免疫', chs: [10] },
    { id: 'part6', name: '第六部分 代谢与应用', chs: [6] },
    { id: 'part7', name: '第七部分 分类与鉴定', chs: [11] },
    { id: 'partF', name: '食品应用专题', chs: [12] }
  ];

  App.mmState = App.mmState || { k: 1, tx: 0, ty: 0, collapsed: null, q: '', hits: 0, built: false };

  function buildTree() {
    const st = App.mmState;
    if (st.tree) return st.tree;
    const root = { id: 'root', label: '846 食品微生物学', lv: 0, children: [] };
    PARTS.forEach(p => {
      const pn = { id: p.id, label: p.name, lv: 1, children: [] };
      p.chs.forEach(chId => {
        const ch = D.chapters.find(c => c.id === chId);
        if (!ch) return;
        const cn = { id: 'ch' + chId, label: '第' + chId + '章 ' + ch.name, lv: 2, ch: chId, children: [] };
        (D.byChapter[chId] || []).forEach(c => {
          const kn = { id: c.id, label: c.name, lv: 3, cid: c.id, children: [] };
          (c.points || []).slice(0, 4).forEach((p2, i) => {
            kn.children.push({ id: c.id + '-p' + i, label: p2, lv: 4, cid: c.id, children: [] });
          });
          cn.children.push(kn);
        });
        pn.children.push(cn);
      });
      root.children.push(pn);
    });
    st.tree = root;
    if (!st.collapsed) {
      st.collapsed = {};
      // 默认展开到大纲部分与章节，概念收起
      root.children.forEach(p => { });
    }
    return root;
  }

  function flatNodes() {
    const tree = buildTree();
    const out = [];
    (function walk(n, path) {
      const search = n.lv === 3 && n.cid && D.byCid[n.cid]
        ? [n.label, D.byCid[n.cid].en || '', (D.byCid[n.cid].aliases || []).join(' '), D.byCid[n.cid].def || '', (D.byCid[n.cid].pitfalls || []).join(' ')].join(' ')
        : n.label;
      out.push({ id: n.id, label: n.label, lv: n.lv, cid: n.cid || '', path: path.map(x => x.label).join(' / '), search });
      (n.children || []).forEach(c => walk(c, path.concat(n)));
    })(tree, []);
    return out;
  }
  App.mapSearchNodes = flatNodes;

  function qHas(text, q) {
    const nq = App.nzQuery(q).toLowerCase();
    return !!nq && App.nzQuery(text || '').toLowerCase().indexOf(nq) >= 0;
  }
  function qSnip(text, q) {
    const raw = String(text || ''), qq = String(q || '').trim();
    let i = raw.toLowerCase().indexOf(qq.toLowerCase());
    if (i < 0) {
      const n = App.nzQuery(raw).toLowerCase().indexOf(App.nzQuery(qq).toLowerCase());
      if (n >= 0) i = Math.max(0, Math.min(raw.length - 1, n));
    }
    if (i < 0) return App.stripLen(raw, 76);
    const a = Math.max(0, i - 28), b = Math.min(raw.length, i + qq.length + 42);
    return (a > 0 ? '…' : '') + raw.slice(a, b) + (b < raw.length ? '…' : '');
  }
  function conceptDetails(c, q) {
    const out = [];
    if (c.en && qHas(c.en, q)) out.push(['英文', c.en]);
    const alias = (c.aliases || []).find(a => qHas(a, q));
    if (alias) out.push(['别名', alias]);
    if (c.def && qHas(c.def, q)) out.push(['定义', qSnip(c.def, q)]);
    (c.pitfalls || []).forEach(p => { if (qHas(p, q)) out.push(['易错', qSnip(p, q)]); });
    return out;
  }

  App.mapSearchGroups = function (q) {
    const nodes = flatNodes();
    const groups = [], byCid = {};
    let total = 0;
    const ensure = (cid, pointNode) => {
      if (byCid[cid]) return byCid[cid];
      const cn = nodes.find(x => x.cid === cid && x.lv === 3);
      const c = D.byCid[cid] || {};
      const g = { cid, kind: '概念', label: c.name || cid, path: cn ? cn.path : '', parentId: cn ? cn.id : cid, details: [], children: [], parentMatched: false };
      byCid[cid] = g; groups.push(g); return g;
    };
    nodes.forEach(n => {
      if (n.lv === 0) return;
      if (!qHas(n.search, q)) return;
      if (n.lv === 4 && n.cid) {
        const g = ensure(n.cid, n);
        g.children.push({ id: n.id, label: n.label, text: qSnip(n.label, q) });
        total++;
      } else if (n.lv === 3 && n.cid) {
        const g = ensure(n.cid, n);
        g.parentMatched = true;
        g.details = conceptDetails(D.byCid[n.cid] || {}, q);
        total++;
      } else {
        groups.push({ cid: '', kind: n.lv === 1 ? '部分' : '章节', label: n.label, path: n.path, parentId: n.id, details: [], children: [], parentMatched: true });
        total++;
      }
    });
    groups.sort((a, b) => {
      const ka = a.kind === '概念' ? 0 : 1, kb = b.kind === '概念' ? 0 : 1;
      if (ka !== kb) return ka - kb;
      return (b.parentMatched ? 1 : 0) - (a.parentMatched ? 1 : 0) || b.children.length - a.children.length;
    });
    return { total, groups };
  };

  App.mapResultsHTML = function (q) {
    const data = App.mapSearchGroups(q);
    const qe = encodeURIComponent(q || '');
    const rootless = p => String(p || '').split(' / ').slice(1).join(' / ');
    const attr = (n, extra) => ' data-act="map-result" data-id="' + esc(n.id || '') + '"' +
      (n.cid ? ' data-cid="' + esc(n.cid) + '"' : '') + ' data-q="' + qe + '"' + (extra || '');
    let out = '<div class="mm-res-head">匹配 <b>' + data.total + '</b> 个节点 · <b>' + data.groups.length + '</b> 个知识点/条目</div>';
    if (!data.groups.length) return out + '<div class="mm-res-empty">没有匹配，试试更短的词或英文/别名。</div>';
    out += '<div class="mm-groups">';
    data.groups.forEach(g => {
      const src = g.kind === '概念' ? ('概念 · ' + rootless(g.path)) : (g.kind + ' · ' + rootless(g.path));
      out += '<div class="mm-group"><button class="mm-group-hd"' + attr({ id: g.parentId, cid: g.cid }) + '>' +
        '<b>' + U.hl(g.label, q) + '</b><span class="mm-kind">' + g.kind + '</span>' +
        '<span class="mm-src">' + esc(src) + '</span></button>';
      g.details.forEach(d => {
        out += '<div class="mm-detail"><em>' + d[0] + '</em> · ' + U.hl(d[1], q) + '</div>';
      });
      if (g.children.length) {
        out += '<div class="mm-children">' + g.children.map(ch =>
          '<button class="mm-child"' + attr({ id: ch.id, cid: g.cid }) + '><b>要点 · ' + U.hl(ch.label, q) + '</b>' +
          '<span>来自「' + esc(g.label) + '」</span></button>').join('') + '</div>';
      }
      out += '</div>';
    });
    return out + '</div>';
  };

  function isCollapsed(n) {
    const st = App.mmState;
    if (n.lv === 0) return st.collapsed[n.id] === true; // 根默认展开，显示七个部分
    return st.collapsed[n.id] !== false;                 // 部分及以下默认收起
  }

  function visibleChildren(n) { return isCollapsed(n) ? [] : n.children; }

  function measure(n) {
    const h = NODE_H[n.lv];
    const kids = visibleChildren(n);
    if (!kids.length) return h;
    let sum = 0;
    kids.forEach((k, i) => { sum += measure(k) + (i ? GAP[Math.min(n.lv, 3)] : 0); });
    return Math.max(h, sum);
  }

  function place(n, x, top) {
    const H = measure(n);
    n.x = x; n.y = top + H / 2; n.h = NODE_H[n.lv]; n.w = NODE_W[n.lv];
    const kids = visibleChildren(n);
    if (!kids.length) return;
    let cy = top;
    kids.forEach((k, i) => {
      if (i) cy += GAP[Math.min(n.lv, 3)];
      k.side = n.side;
      const step = LEVEL_X[Math.min(k.lv, 4)] - LEVEL_X[Math.min(n.lv, 4)];
      place(k, x + (n.side === 'L' ? -1 : 1) * step, cy);
      cy += measure(k);
    });
  }

  // 固定左右分配：只在首次布局时按静态高度均衡一次，之后不随展开变化
  function computeSides(root) {
    const st = App.mmState;
    if (st.sides) return st.sides;
    const stat = p => {
      let sum = 0;
      p.children.forEach((c, i) => { sum += NODE_H[2] + (i ? 14 : 0); });
      return Math.max(NODE_H[1], sum);
    };
    const order = root.children.map(p => ({ p: p, h: stat(p) })).sort((a, b) => b.h - a.h);
    let rs = 0, ls = 0;
    const sides = {};
    order.forEach(x => {
      if (rs <= ls) { sides[x.p.id] = 'R'; rs += x.h; }
      else { sides[x.p.id] = 'L'; ls += x.h; }
    });
    st.sides = sides;
    return sides;
  }

  function layout() {
    const root = buildTree();
    const sides = computeSides(root);
    const right = root.children.filter(p => sides[p.id] === 'R');
    const left = root.children.filter(p => sides[p.id] === 'L');
    // 分别测量两侧高度
    let rh = 0, lh = 0;
    right.forEach((p, i) => { rh += measure(p) + (i ? 26 : 0); });
    left.forEach((p, i) => { lh += measure(p) + (i ? 26 : 0); });
    const H = Math.max(rh, lh, 300) + 120;
    root.x = 0; root.y = 0; root.w = NODE_W[0]; root.h = NODE_H[0];
    let ry = -rh / 2, ly = -lh / 2;
    right.forEach((p, i) => {
      p.side = 'R';
      place(p, LEVEL_X[1], ry);
      ry += measure(p) + 26;
    });
    left.forEach((p, i) => {
      p.side = 'L';
      place(p, -LEVEL_X[1], ly);
      ly += measure(p) + 26;
    });
    const nodes = [];
    (function walk(n) { nodes.push(n); visibleChildren(n).forEach(walk); })(root);
    const maxR = Math.max.apply(null, nodes.filter(n => n.x >= 0).map(n => n.x + n.w / 2).concat([300]));
    const minL = Math.min.apply(null, nodes.filter(n => n.x < 0).map(n => n.x - n.w / 2).concat([-300]));
    return { root, nodes, minX: minL - 60, maxX: maxR + 60, minY: -H / 2, maxY: H / 2, H: H };
  }

  function trunc(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function nodeFill(n) {
    if (n.lv === 0) return { fill: '#14655a', stroke: '#0e4a42', text: '#fff' };
    if (n.lv === 1) return { fill: '#e7f1ee', stroke: '#a9cfc6', text: '#0e4a42' };
    if (n.lv === 2) return { fill: '#f6f2e7', stroke: '#d8cdb4', text: '#3f3a2c' };
    if (n.lv === 3) {
      const m = App.mastery(n.cid);
      const map = [
        { fill: '#f8f6f0', stroke: '#cfc8b9', text: '#4b463d' },
        { fill: '#fff5e2', stroke: '#e0b15a', text: '#6f4500' },
        { fill: '#edf5fc', stroke: '#9bbddf', text: '#1e4f83' },
        { fill: '#e9f6ef', stroke: '#8bc5a8', text: '#145c3d' }
      ];
      return map[m] || map[0];
    }
    return { fill: '#fcfbf7', stroke: '#e8e2d4', text: '#555b52' };
  }

  function renderSvg() {
    const box = $('#mmCanvas');
    if (!box) return;
    const L = layout();
    const st = App.mmState;
    const W = L.maxX - L.minX, H = L.maxY - L.minY;
    const q = st.q.trim();
    const qn = q ? App.nzQuery(q).toLowerCase() : '';
    let hits = 0, totalHits = 0;

    const link = (p, c) => {
      const dir = c.x >= p.x ? 1 : -1;
      const x1 = p.x + dir * (p.w / 2), y1 = p.y;
      const x2 = c.x - dir * (c.w / 2), y2 = c.y;
      const mx = (x1 + x2) / 2;
      return '<path d="M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2 + '" fill="none" stroke="#d5ddd7" stroke-width="1.2"/>';
    };

    let paths = '', nodes = '';
    (function walk(n) {
      visibleChildren(n).forEach(c => { paths += link(n, c); walk(c); });
    })(L.root);

    if (qn) {
      totalHits = App.mapSearchGroups(st.q).total;
    }
    const MCOL = ['#9e988b', '#d8860b', '#2f6fb3', '#1f8a5b'];
    L.nodes.forEach(n => {
      const col = nodeFill(n);
      const mast = n.lv === 3 ? App.mastery(n.cid) : 0;
      const isHit = n.lv > 0 && qn && App.nzQuery((n.lv === 3 && n.cid && D.byCid[n.cid] ? [n.label, D.byCid[n.cid].en || '', (D.byCid[n.cid].aliases || []).join(' '), D.byCid[n.cid].def || '', (D.byCid[n.cid].pitfalls || []).join(' ')] : n.label)).toLowerCase().indexOf(qn) >= 0;
      if (isHit) hits++;
      const hidden = isCollapsed(n) && n.children.length;
      const dir = n.x >= 0 ? 1 : -1;
      const tx = n.x - n.w / 2 + 12;
      const maxChars = n.lv === 4 ? 20 : n.lv === 3 ? 16 : n.lv === 2 ? 18 : 16;
      const isFocus = st.focus && n.cid === st.focus && n.lv === 3;
      nodes += '<g class="mm-node lv' + n.lv + (isHit ? ' hit' : '') + (isFocus ? ' focus' : '') + '" data-node="' + n.id + '" data-cid="' + (n.cid || '') + '" data-lv="' + n.lv + '" style="cursor:pointer"><title>' + esc(n.label) + '</title>' +
        '<rect x="' + (n.x - n.w / 2) + '" y="' + (n.y - n.h / 2) + '" width="' + n.w + '" height="' + n.h + '" rx="' + (n.lv <= 1 ? 10 : 8) + '" fill="' + (isHit ? '#fff8dc' : col.fill) + '" stroke="' + (isHit ? '#d9a441' : col.stroke) + '" stroke-width="' + (n.lv <= 1 ? 1.4 : 1) + '"/>' +
        '<text x="' + tx + '" y="' + (n.y + 4) + '" font-size="' + (n.lv === 0 ? 14 : n.lv === 1 ? 12.5 : 12) + '" fill="' + col.text + '" font-weight="' + (n.lv <= 2 ? 600 : 400) + '">' + esc(trunc(n.label, maxChars)) + '</text>' +
        (n.lv === 3 ? '<circle cx="' + (n.x + n.w / 2 - 11) + '" cy="' + n.y + '" r="5.2" fill="' + MCOL[mast] + '" stroke="#fff" stroke-width="1.6"><title>掌握度：' + App.MASTERY_LABEL[mast] + '</title></circle>' : '') +
        (hidden ? '<g class="mm-toggle" data-toggle="' + n.id + '">' +
          '<circle cx="' + (n.x + dir * (n.w / 2 + 10)) + '" cy="' + n.y + '" r="8" fill="#fff" stroke="#c9d3cc"/>' +
          '<text x="' + (n.x + dir * (n.w / 2 + 10)) + '" y="' + (n.y + 4) + '" font-size="11" text-anchor="middle" fill="#5c6a62">' + n.children.length + '</text></g>' : '') +
        '</g>';
    });

    st.hits = hits;
    st.lastL = L;
    box.innerHTML = '<svg id="mmSvg" viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid meet">' +
      '<g id="mmView">' + paths + nodes + '</g></svg>';
    if (!st.inited) { fit(); st.inited = true; } else applyTransform();
    const cnt = $('#mmHit');
    if (cnt) cnt.textContent = q ? ('匹配 ' + totalHits + ' 个节点') : ('共 ' + L.nodes.length + ' 个可见节点');
    bindCanvas();
  }

  function applyTransform() {
    const st = App.mmState;
    const g = $('#mmView');
    if (g) g.setAttribute('transform', 'translate(' + st.tx + ',' + st.ty + ') scale(' + st.k + ')');
    const z = $('#mmZoom');
    if (z) z.textContent = Math.round(st.k * 100) + '%';
  }

  let pan = null;
  function bindCanvas() {
    const svg = $('#mmSvg');
    if (!svg) return;
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const st = App.mmState;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const mx = vb.x + (e.clientX - rect.left) / rect.width * vb.width;
      const my = vb.y + (e.clientY - rect.top) / rect.height * vb.height;
      const k2 = Math.min(2.2, Math.max(0.25, st.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      st.tx = mx - (mx - st.tx) * (k2 / st.k);
      st.ty = my - (my - st.ty) * (k2 / st.k);
      st.k = k2;
      applyTransform();
    }, { passive: false });

    svg.addEventListener('pointerdown', e => {
      if (e.target.closest('[data-node]')) return;
      pan = { x: e.clientX, y: e.clientY, tx: App.mmState.tx, ty: App.mmState.ty };
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('panning');
    });
    svg.addEventListener('pointermove', e => {
      if (!pan) return;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const sx = vb.width / rect.width, sy = vb.height / rect.height;
      App.mmState.tx = pan.tx + (e.clientX - pan.x) * sx;
      App.mmState.ty = pan.ty + (e.clientY - pan.y) * sy;
      applyTransform();
    });
    svg.addEventListener('pointerup', () => { pan = null; svg.classList.remove('panning'); });
    svg.addEventListener('pointercancel', () => { pan = null; svg.classList.remove('panning'); });
  }

  function fit() {
    const st = App.mmState, L = st.lastL;
    if (!L) return;
    const W = L.maxX - L.minX, H = L.maxY - L.minY;
    const k = Math.min(1.1, 1100 / W, 540 / H);
    st.k = k;
    st.tx = 600 - (L.minX + L.maxX) / 2 * k;
    st.ty = 310 - (L.minY + L.maxY) / 2 * k;
    applyTransform();
  }
  App.mmFitNow = fit;

  App.mmZoom = function (d) {
    const st = App.mmState;
    const k2 = Math.min(2.6, Math.max(0.12, st.k + d));
    const cx = 600, cy = 310;
    st.tx = cx - (cx - st.tx) * (k2 / st.k);
    st.ty = cy - (cy - st.ty) * (k2 / st.k);
    st.k = k2;
    applyTransform();
  };
  App.mmZoomOld = function (d) {
    const st = App.mmState;
    st.k = Math.min(2.2, Math.max(0.25, st.k + d));
    applyTransform();
  };
  App.mmFit = function () { fit(); };

  App.renderMindmap = function () {
    const st = App.mmState;
    buildTree();
    if (!st.center) { st.tx = 0; st.ty = 0; st.k = 1; st.center = true; }
    let h = '<div class="mm-toolbar">' +
      '<div class="mm-search">' + App.icon('search') + '<input id="mmSearch" placeholder="搜索节点、概念或要点，如：芽孢 / 溶原 / CFU" value="' + esc(st.qInput || st.q || '') + '"><button class="btn sm" data-act="mm-search-run">搜索</button></div>' +
      '<button class="btn sm" data-act="mm-expand">全部展开</button>' +
      '<button class="btn sm" data-act="mm-collapse">全部收起</button>' +
      '<div class="mm-zoom"><button data-act="mm-zoom" data-d="-0.12">−</button><span id="mmZoom">100%</span><button data-act="mm-zoom" data-d="0.12">＋</button></div>' +
      '<button class="btn sm" data-act="mm-fit">适配</button>' +
      '<span class="small muted" id="mmHit">共 0 个可见节点</span>' +
      '</div>';

    h += '<div class="mm-legend"><span><i class="mlg mlg0"></i>未学</span><span><i class="mlg mlg1"></i>模糊</span><span><i class="mlg mlg2"></i>会</span><span><i class="mlg mlg3"></i>熟练</span>' +
      '<span class="muted">滚轮缩放 · 拖拽空白平移 · 点节点展开/收起，点概念打开知识卡</span></div>';
    h += '<div class="mm-layout"><div class="mm-canvas" id="mmCanvas"></div><aside class="mm-results" id="mmResults"></aside></div>';
    h += '<div class="callout" style="margin-top:10px">结构：根 → 大纲部分 → 章节 → 概念 → 要点。默认只展开到七个部分，点击部分/章节逐级展开。' +
      '第六部分（代谢与应用）独立成部分；第八部分（展望）并入相关章节，避免重复节点。</div>';
    return h;
  };

  App.mmBind = function () {
    const st = App.mmState;
    renderSvg();
    renderResults();
    const inp = $('#mmSearch');
    if (!inp) return;
    let composing = false;
    const run = () => {
      st.qInput = inp.value;
      st.q = inp.value.trim();
      if (st.q) expandToHits(st.q);
      renderSvg();
      renderResults();
      if (st.q) {
        const qn = App.nzQuery(st.q).toLowerCase();
        const hit = flatNodes().find(n => App.nzQuery(n.search).toLowerCase().indexOf(qn) >= 0);
        if (hit) {
          const L = st.lastL;
          const node = (L.nodes || []).find(n => n.id === hit.id);
          if (node) {
            st.k = 0.85; st.tx = 600 - node.x * st.k; st.ty = 310 - node.y * st.k;
            applyTransform();
          }
        }
      }
    };
    App.mmRunSearch = run;
    inp.addEventListener('compositionstart', () => { composing = true; });
    inp.addEventListener('compositionend', () => { composing = false; st.qInput = inp.value; });
    inp.addEventListener('input', () => { st.qInput = inp.value; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !composing) { e.preventDefault(); run(); } });
  };

  function renderResults() {
    const box = $('#mmResults');
    if (!box) return;
    const st = App.mmState, q = (st.q || '').trim();
    box.hidden = !q;
    if (!q) { box.innerHTML = ''; return; }
    box.innerHTML = App.mapResultsHTML(q);
  }

  function expandToHits(q) {
    const qn = App.nzQuery(q).toLowerCase();
    const st = App.mmState;
    const tree = buildTree();
    let n = 0;
    (function walk(node, path) {
      if (n >= 50) return;
      const hit = App.nzQuery(node.lv === 3 && node.cid && D.byCid[node.cid] ? [node.label, D.byCid[node.cid].en || '', (D.byCid[node.cid].aliases || []).join(' '), D.byCid[node.cid].def || ''].join(' ') : node.label).toLowerCase().indexOf(qn) >= 0;
      if (hit) {
        n++;
        path.forEach(p => { st.collapsed[p.id] = false; });
      }
      node.children.forEach(c => walk(c, path.concat([node])));
    })(tree, []);
  }

  function findPath(root, cid) {
    let out = null;
    (function walk(n, path) {
      if (out) return;
      if (n.cid === cid && n.lv === 3) { out = path.concat(n); return; }
      (n.children || []).forEach(c => walk(c, path.concat(n)));
    })(root, []);
    return out || [];
  }

  App.focusConcept = function (cid) {
    const st = App.mmState;
    st.focus = cid; st.q = ''; st.qInput = '';
    st.collapsed = st.collapsed || {};
    const tree = buildTree();
    const path = findPath(tree, cid);
    path.forEach((n, i) => {
      if (i < path.length - 1 && n.lv >= 0) st.collapsed[n.id] = false;
    });
    if (path.length) st.collapsed[path[path.length - 1].id] = true; // 只展开到概念，要点仍收起
    if (App.mapState) App.mapState.mode = 'mind';
    if (App.route.name === 'map') App.render(); else App.go('map');
    setTimeout(function () {
      renderSvg();
      const L = st.lastL;
      const n = (L.nodes || []).find(x => x.cid === cid && x.lv === 3);
      if (n) {
        st.k = 0.95;
        st.tx = 600 - n.x * st.k;
        st.ty = 310 - n.y * st.k;
        applyTransform();
      }
    }, 40);
  };

  /* 事件 */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (t) {
      const act = t.dataset.act;
      if (act === 'mm-zoom') { App.mmZoom(+t.dataset.d); return; }
      if (act === 'mm-fit') { App.mmFit(); return; }
      if (act === 'mm-expand') {
        const st = App.mmState;
        st.collapsed = {};
        const tree = buildTree();
        (function walk(n) {
          if (n.lv >= 0 && n.lv <= 4) st.collapsed[n.id] = false;
          n.children.forEach(walk);
        })(tree);
        renderSvg(); renderResults(); fit(); return;
      }
      if (act === 'mm-collapse') {
        const st = App.mmState;
        st.collapsed = {};
        const tree = buildTree();
        (function walk(n) { st.collapsed[n.id] = n.lv > 0; n.children.forEach(walk); })(tree);
        renderSvg(); renderResults(); fit(); return;
      }
      if (act === 'mm-search-run') { if (App.mmRunSearch) App.mmRunSearch(); return; }
      if (act === 'mm-hit') {
        const id = t.dataset.id;
        const tree = buildTree();
        const n = findNode(tree, id);
        if (n) { focusNode(n); }
        return;
      }
    }
    const node = e.target.closest('[data-node]');
    if (node) {
      const id = node.dataset.node, cid = node.dataset.cid, lv = +node.dataset.lv;
      const tree = buildTree();
      const n = findNode(tree, id);
      if (!n) return;
      if (e.target.closest('[data-toggle]')) {
        toggle(n); renderSvg(); return;
      }
      if (lv === 3 || lv === 4) {
        if (cid) App.openConcept(cid);
        if (lv === 3) { toggle(n); renderSvg(); }
        return;
      }
      toggle(n);
      renderSvg();
    }
  });

  function focusNode(n) {
    const st = App.mmState;
    const tree = buildTree();
    const path = [];
    (function walk(x, acc) {
      if (x.id === n.id) { path.push(...acc, x); return true; }
      for (const c of x.children || []) if (walk(c, acc.concat(x))) return true;
      return false;
    })(tree, []);
    path.forEach((x, i) => { if (i < path.length - 1) st.collapsed[x.id] = false; });
    if (n.lv === 3) st.collapsed[n.id] = true;
    st.focus = n.cid || '';
    renderSvg(); renderResults();
    const L = st.lastL;
    const node = (L.nodes || []).find(x => x.id === n.id);
    if (node) { st.k = 0.95; st.tx = 600 - node.x * st.k; st.ty = 310 - node.y * st.k; applyTransform(); }
  }

  App.focusMapNode = function (id) {
    const n = findNode(buildTree(), id);
    if (n) focusNode(n);
  };

  function findNode(root, id) {
    if (root.id === id) return root;
    for (const c of root.children || []) { const r = findNode(c, id); if (r) return r; }
    return null;
  }
  function toggle(n) {
    App.mmState.collapsed[n.id] = !isCollapsed(n);
  }
})();
