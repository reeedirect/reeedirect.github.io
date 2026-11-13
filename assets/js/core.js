/* ============ 核心：工具、存储、数据合并、路由、知识卡 ============ */
(function () {
  const App = (window.App = window.App || {});

  /* ---------- 工具 ---------- */
  const U = App.util = {
    $(s, r) { return (r || document).querySelector(s); },
    $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    today() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    addDays(base, n) {
      const d = new Date(base + 'T00:00:00');
      d.setDate(d.getDate() + n);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    diffDays(a, b) {
      return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
    },
    pct(a, b) { return b ? Math.round(a / b * 100) : 0; },
    h(s) { return U.esc(s); },
    hl(text, q) {
      if (!q) return U.esc(text);
      const safe = U.esc(text);
      const k = U.esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try { return safe.replace(new RegExp('(' + k + ')', 'gi'), '<mark>$1</mark>'); } catch (e) { return safe; }
    },
    debounce(fn, ms) {
      let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 240); };
    },
    uniq(a) { return Array.from(new Set(a)); }
  };
  const $ = U.$, $$ = U.$$, esc = U.esc;

  /* ---------- 图标 ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    map: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7.2 10.6 16M16 7.2 13.4 16M8.4 6h7.2"/>',
    bank: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tools: '<path d="M14.5 4.5a4.5 4.5 0 0 0-5.9 5.9L4 15v5h5l4.6-4.6a4.5 4.5 0 0 0 5.9-5.9l-2.8 2.8-2.9-2.9z"/>',
    review: '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="9"/>',
    src: '<path d="M5 4h9l5 5v11H5z"/><path d="M14 4v5h5"/><path d="M8 13h8M8 16.5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  App.icon = function (name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || '') + '">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- 存储 ---------- */
  const KEY = 'kb846:v1';
  const DEFAULT = {
    mastery: {}, fav: [], notes: {}, drafts: {}, review: {}, attempts: {}, wrong: {}, paperDone: {},
    examDate: '', dailyLimit: 15, dailyNew: 10, lastChapter: 7, lastExport: '', createdAt: U.today(),
    paperSession: null, paperRecords: []
  };
  let state = null;
  const fresh = () => JSON.parse(JSON.stringify(DEFAULT));
  function normalize(st) {
    ['mastery', 'notes', 'drafts', 'review', 'attempts', 'wrong', 'paperDone'].forEach(k => {
      if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {};
    });
    ['fav', 'paperRecords', 'recentSearch'].forEach(k => {
      if (!Array.isArray(st[k])) st[k] = [];
    });
    if (st.paperSession && typeof st.paperSession !== 'object') st.paperSession = null;
    if (typeof st.dailyLimit !== 'number') st.dailyLimit = 15;
    if (typeof st.dailyNew !== 'number') st.dailyNew = 10;
    if (typeof st.examDate !== 'string') st.examDate = '';
    if (!st.bankFilters || typeof st.bankFilters !== 'object') st.bankFilters = {};
  }
  App.store = {
    get() {
      if (state) return state;
      try {
        const raw = localStorage.getItem(KEY);
        state = raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
        normalize(state);
      } catch (e) { state = fresh(); }
      return state;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { App.toast('保存失败：浏览器存储空间不足或被禁用'); }
      App.updateBadges();
      try { if (window.AppSync && AppSync.onSave) AppSync.onSave(); } catch (e) { }
    },
    reset() {
      state = JSON.parse(JSON.stringify(DEFAULT));
      App.store.save();
    },
    reload() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) { state = Object.assign(fresh(), JSON.parse(raw)); normalize(state); }
      } catch (e) { }
      return state;
    },
    replace(obj) {
      let src = {};
      try { src = obj ? JSON.parse(JSON.stringify(obj)) : {}; } catch (e) { src = {}; }
      state = Object.assign(fresh(), src);
      normalize(state);
      App.store.save();
    },
    key() { return KEY; },
    normalize(fn) { return normalize(fn); }
  };

  // 多标签页：收到其他标签的写入时，合并到当前内存状态（不回写，避免 ping-pong）
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue);
      const local = state || fresh();
      const merged = Object.assign(fresh(), incoming);
      merged.mastery = Object.assign({}, local.mastery, incoming.mastery);
      merged.notes = Object.assign({}, local.notes, incoming.notes);
      merged.drafts = Object.assign({}, local.drafts, incoming.drafts);
      merged.attempts = Object.assign({}, local.attempts, incoming.attempts);
      merged.wrong = Object.assign({}, local.wrong, incoming.wrong);
      merged.review = Object.assign({}, local.review, incoming.review);
      merged.fav = U.uniq((local.fav || []).concat(incoming.fav || []));
      merged.paperRecords = (local.paperRecords || []).slice();
      (incoming.paperRecords || []).forEach(r => {
        if (!merged.paperRecords.some(x => x.at === r.at && x.pid === r.pid)) merged.paperRecords.push(r);
      });
      state = merged;
      normalize(state);
      if (App.render) App.render();
    } catch (err) { }
  });

  function autoPoints(answer) {
    const raw = String(answer || '').replace(/\s+/g, ' ').trim();
    if (!raw) return [];
    let parts = (raw.match(/[^。；;]+[。；;]?/g) || []).map(x => x.replace(/[。；;\s]+$/, '').trim()).filter(x => x.length >= 8);
    if (parts.length < 2) parts = raw.split(/[，,]/).map(x => x.trim()).filter(x => x.length >= 8);
    return parts.slice(0, 6);
  }

  /* ---------- 数据 ---------- */
  const D = App.data = { concepts: [], questions: [], chapters: [], byCid: {}, byQid: {}, byChapter: {} };
  function initData() {
    D.chapters = (window.KB_CHAPTERS || []).slice();
    D.concepts = [].concat(window.KB_CONCEPTS_A || [], window.KB_CONCEPTS_B || [], window.KB_CONCEPTS_C || []);
    const raw = [].concat(window.KB_QUESTIONS_1 || [], window.KB_QUESTIONS_2 || [], window.KB_QUESTIONS_3 || [], window.KB_QUESTIONS_4 || [], window.KB_QUESTIONS_5 || [],
      window.KB_QUESTIONS_6 || [], window.KB_QUESTIONS_7 || [], window.KB_QUESTIONS_8 || [], window.KB_QUESTIONS_9 || [], window.KB_QUESTIONS_10 || [], window.KB_QUESTIONS_11 || [], window.KB_QUESTIONS_12 || [], window.KB_CLONES || []);
    const map = {};
    raw.forEach(q => { map[q.id] = q; });
    raw.forEach(q => {
      if (q.ref && map[q.ref]) {
        const src = map[q.ref];
        if (!q.answer) q.answer = src.answer;
        if (!q.points) q.points = src.points;
        if (!q.hint) q.hint = src.hint;
        q.refTitle = src.stem;
        q.refYear = src.year;
      }
    });
    const nf = window.KB_NOFIX || {};
    const scoreDefault = { '选择': 2, '判断': 2, '填空': 2, '名词解释': 5, '简答': 10, '论述': 15, '材料': 30 };
    raw.forEach(q => {
      if (nf[q.id]) q.no = nf[q.id];
      if (!q.score) q.score = scoreDefault[q.type] || 2;
      if (!q.points || !q.points.length) {
        if (['名词解释', '简答', '论述', '材料'].indexOf(q.type) >= 0 && q.answer) {
          q.points = autoPoints(q.answer);
          if (q.points.length) q.pointsAuto = true;
        }
      }
    });
    D.questions = raw;
    D.byCid = {}; D.byQid = {}; D.byChapter = {};
    D.concepts.forEach(c => { D.byCid[c.id] = c; (D.byChapter[c.ch] = D.byChapter[c.ch] || []).push(c); });
    D.questions.forEach(q => {
      D.byQid[q.id] = q;
      q.concepts = q.concepts || [];
      q.concepts.forEach(cid => {
        const c = D.byCid[cid];
        if (c) (c.qids = c.qids || []).push(q.id);
      });
    });
    // 同题跨年归组（按题干归一化后的前 24 字）
    const norm = x => String(x || '').replace(/[\s，。、（）()【】\[\]？?：:；;·"“”]/g, '').slice(0, 24);
    const g = {};
    D.questions.forEach(q => { const k = norm(q.stem); (g[k] = g[k] || []).push(q.id); });
    D.dup = {};
    Object.keys(g).forEach(k => {
      if (g[k].length > 1) g[k].forEach(id => { D.dup[id] = g[k].filter(x => x !== id); });
    });
    D.papers = (window.KB_PAPERS || []).slice();
    D.byPaper = {};
    D.papers.forEach(p => { D.byPaper[p.id] = p; p.sections.forEach(s => s.ids.forEach(id => { if (D.byQid[id]) D.byQid[id].paper = p.id; })); });
    // 补齐未归类题目的章节：先沿 ref/cloneOf 找，再按关键词兜底
    const guess = function (q) {
      const t = (q.stem || '') + ' ' + (q.material || '');
      const rules = [
        [/E花结|T细胞|B细胞|免疫|抗体|抗原|疫苗|补体|淋巴细胞|干扰素/, 10],
        [/干重|湿重|比浊|血球计数/, 7],
        [/沙门|冷藏|渗透压|糖加工|食物中毒|菌落总数/, 12],
        [/斜面|试管|水的生理作用/, 5],
        [/药效|毒性|杀菌剂/, 7],
        [/^微生物|微生物\(/, 1],
        [/合成代/, 6],
        [/出芽/, 3],
        [/合成代谢|分解代谢/, 6],
        [/分子生物技术|环境保护|秸秆|沼气/, 9],
        [/公元9世纪|酿酒|微生物与人类|双刃剑/, 1],
        [/分类|鉴定|三域|五界|16S|双名法|系统发育/, 11],
        [/生态|循环|硝化|反硝化|固氮|富营养|污水|沼气|互生|共生|拮抗/, 9],
        [/菌落总数|大肠菌群|食品|腐败|保藏|消长|乳酸菌|酸奶|酱油|食物中毒|抽检/, 12],
        [/遗传|突变|质粒|转化|转导|接合|育种|复壮|保藏|基因/, 8],
        [/生长|灭菌|消毒|温度|pH|水分活度|代时|计数|平板|连续培养/, 7],
        [/代谢|发酵|呼吸|ATP|酶|途径|HMP|EMP|TCA|固氮酶/, 6],
        [/营养|培养基|碳源|氮源|生长因子|运输|主动运输/, 5],
        [/病毒|噬菌体|衣壳|亚病毒|类病毒/, 4],
        [/真菌|酵母|霉菌|菌丝|孢子|蕈菌/, 3],
        [/细菌|细胞壁|肽聚糖|芽孢|荚膜|鞭毛|放线菌|支原体|原核/, 2],
        [/微生物学|巴斯德|科赫|列文虎克|发展史|五大共性/, 1]
      ];
      for (const r of rules) if (r[0].test(t)) return r[1];
      return 0;
    };
    for (let pass = 0; pass < 2; pass++) {
      D.questions.forEach(q => {
        if (q.ch) return;
        const src = q.ref || q.cloneOf;
        if (src && D.byQid[src] && D.byQid[src].ch) { q.ch = D.byQid[src].ch; return; }
        if (q.concepts && q.concepts.length) {
          const c = D.byCid[q.concepts[0]];
          if (c && c.ch) { q.ch = c.ch; return; }
        }
        q.ch = guess(q);
      });
    }
    D.pages = (window.KB_PAGES || []).slice();
    D.sources = (window.KB_SOURCES || []).slice();
    D.freq = {};
    (window.KB_FREQ_NOTE || []).forEach(f => { D.freq[f.cid] = f.years; });
    D.compareExtra = (window.KB_COMPARE_EXTRA || []).slice();
  }
  App.initData = initData;

  /* ---------- 掌握度与复习 ---------- */
  const MASTERY_LABEL = ['未学', '模糊', '会', '熟练'];
  App.MASTERY_LABEL = MASTERY_LABEL;
  const DOC_FILE = {
    '教材考点精讲': '教材考点精讲.pdf', '教材考点精讲part2': '教材考点精讲.pdf',
    '复习讲义': '复习讲义.pdf', '知识点总结': '知识点总结.pdf',
    '真题-2012-2015年': '真题-2012-2015年.pdf', '真题合辑': '真题-2012-2015年.pdf',
    '真题': '真题-2012-2015年.pdf', '真题-2023': '真题-2023.pdf', '真题-2024': '真题-2024.pdf',
    '练习题': '练习题.pdf', '手写笔记': '手写笔记.pdf'
  };
  App.pdfHref = function (doc, page) {
    const f = DOC_FILE[String(doc || '').replace(/\.pdf$/i, '')];
    if (!f) return '';
    let p = String(page || '').match(/\d+/);
    if (!p) return '';
    return '../' + encodeURIComponent(f) + '#page=' + p[0];
  };
  App.pdfLink = function (doc, page, label) {
    const href = App.pdfHref(doc, page);
    if (!href) return '';
    return '<a class="pdf-link" href="' + href + '" target="_blank" rel="noopener">' + esc(label || '原页') + '</a>';
  };
  App.qPage = function (q) {
    return (window.KB_QPAGES || {})[q && q.id] || null;
  };

  App.statusAxes = function (q) {
    const ts = q.ts || (q.status === '待核' ? '机器识别未核' : '对照原文已核');
    const cs = q.cs || (q.status === '冲突' ? '存在冲突' : q.status === '待核' ? '暂无法确定' : '尚未学科校核');
    return { ts: ts, cs: cs };
  };
  App.mastery = cid => (App.store.get().mastery[cid] || 0);
  App.setMastery = function (cid, v, silent) {
    const s = App.store.get();
    s.mastery[cid] = v;
    s.lastChapter = (D.byCid[cid] || {}).ch || s.lastChapter;
    if (v === 0) delete s.review['c:' + cid];
    else if (v === 1) App.schedule('c:' + cid, 1);
    else if (v === 2) App.schedule('c:' + cid, 2);
    else if (v === 3) App.schedule('c:' + cid, 3);
    App.store.save();
    if (App.route.name === 'map' || App.route.name === 'home' || App.route.name === 'review' || App.route.name === 'cards') App.render();
    if (!silent) App.toast('已记为「' + MASTERY_LABEL[v] + '」');
  };
  App.schedule = function (key, grade) {
    const s = App.store.get();
    const it = s.review[key] || { iv: 0, reps: 0 };
    let iv;
    if (grade === 0) iv = 1;
    else if (grade === 1) iv = 3;
    else if (grade === 2) iv = it.reps ? Math.min(60, Math.max(7, Math.round((it.iv || 7) * 1.9))) : 7;
    else iv = 14;
    it.iv = iv; it.reps = (it.reps || 0) + 1; it.due = U.addDays(U.today(), iv); it.last = grade;
    s.review[key] = it;
  };
  App.dueItems = function () {
    const s = App.store.get(), t = U.today(), out = [];
    Object.keys(s.review).forEach(k => {
      if (k.indexOf('c:') !== 0) return;
      const it = s.review[k];
      if (it.due && it.due <= t) out.push({ cid: k.slice(2), due: it.due, iv: it.iv });
    });
    return out.sort((a, b) => (a.due < b.due ? -1 : 1));
  };
  App.localDay = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  App.dueCount = function () {
    const s = App.store.get(), t = U.today();
    let n = 0;
    Object.keys(s.review).forEach(k => { const it = s.review[k]; if (it && it.due && it.due <= t) n++; });
    return n;
  };
  App.wrongList = function () {
    const s = App.store.get();
    return Object.keys(s.wrong).map(qid => ({ qid, q: D.byQid[qid], w: s.wrong[qid] }))
      .filter(x => x.q).sort((a, b) => (a.w.at < b.w.at ? 1 : -1));
  };

  /* ---------- 提示与模态 ---------- */
  App.toast = function (msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1900);
  };
  App.modal = function (html, wide) {
    const m = $('#modal');
    m.innerHTML = '<div class="modal-inner' + (wide ? '' : '') + '"><button class="modal-close" data-act="modal-close">' + App.icon('close') + '</button>' + html + '</div>';
    m.hidden = false;
  };
  App.closeModal = function () { $('#modal').hidden = true; $('#modal').innerHTML = ''; };
  App.imageModal = function (src, title, note) {
    App.modal('<img src="' + esc(src) + '" alt="' + esc(title) + '">' +
      '<div class="modal-pad"><h3>' + esc(title) + '</h3><p class="small muted">' + esc(note || '') + '</p></div>');
  };


  /* ---------- 资料全文阅读（OCR） ---------- */
  function readerClip(text, q) {
    const raw = String(text || ''), qq = String(q || '').trim();
    let i = raw.toLowerCase().indexOf(qq.toLowerCase());
    if (i < 0) {
      const n = App.nzQuery(raw).toLowerCase().indexOf(App.nzQuery(qq).toLowerCase());
      if (n >= 0) i = Math.max(0, Math.min(raw.length - 1, n));
    }
    if (i < 0) return raw.slice(0, 180);
    const a = Math.max(0, i - 50), b = Math.min(raw.length, i + qq.length + 120);
    return (a > 0 ? '…' : '') + raw.slice(a, b) + (b < raw.length ? '…' : '');
  }
  App.openReader = function (doc, q) {
    const data = (window.KB_READER || {})[doc];
    if (!data) { App.toast('该资料暂无 OCR 全文'); return; }
    App.readerState = { doc: doc, q: q || '' };
    App.modal('<div class="reader-modal"><h3>' + esc(doc) + ' · OCR 全文</h3>' +
      '<p class="small muted">机器识别稿，未逐字校核；页码以 PDF 物理页为准。搜索会定位到包含关键词的段落。</p>' +
      '<div class="search-box" style="margin:10px 0"><input id="readerSearch" placeholder="在本文中搜索，如：芽孢 / 溶原 / 培养基" value="' + esc(q || '') + '"></div>' +
      '<div class="reader-body" id="readerBody"></div></div>');
    const inp = $('#readerSearch');
    if (inp) {
      let t;
      inp.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { App.readerState.q = inp.value.trim(); renderReader(); }, 220);
      });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { App.readerState.q = inp.value.trim(); renderReader(); } });
    }
    renderReader();
    setTimeout(function () {
      if (q) { const m = $('#readerBody mark'); if (m) m.scrollIntoView({ block: 'center' }); }
    }, 60);
  };
  function renderReader() {
    const st = App.readerState; if (!st) return;
    const data = (window.KB_READER || {})[st.doc]; const body = $('#readerBody');
    if (!data || !body) return;
    const q = st.q;
    const nq = App.nzQuery(q).toLowerCase();
    const hits = q ? data.sections.filter(s => App.nzQuery(s.x).toLowerCase().indexOf(nq) >= 0 || App.nzQuery(s.t).toLowerCase().indexOf(nq) >= 0) : data.sections;
    body.innerHTML = '<div class="small muted" style="margin-bottom:8px">' + (q ? '命中 ' + hits.length + ' 节' : '共 ' + data.sections.length + ' 节 · ' + data.chars + ' 字') + '</div>' +
      (hits.length ? hits.map((s, i) => '<section class="reader-sec" id="rsec' + i + '"><h4>' + U.hl(s.t, q) + '</h4>' +
        '<div class="reader-text">' + U.hl(q ? readerClip(s.x, q) : s.x, q) + '</div></section>').join('') :
        '<div class="callout">没有匹配，试试更短的词。</div>');
  }
  App.readerSearchAll = function (q) {
    const box = $('#docHits'); if (!box) return;
    const nq = App.nzQuery(q).toLowerCase();
    if (!nq) { box.innerHTML = ''; return; }
    const out = [];
    Object.keys(window.KB_READER || {}).forEach(doc => {
      (window.KB_READER[doc].sections || []).forEach(s => {
        if (App.nzQuery(s.x).toLowerCase().indexOf(nq) >= 0 || App.nzQuery(s.t).toLowerCase().indexOf(nq) >= 0) {
          out.push({ doc: doc, t: s.t, x: readerClip(s.x, q) });
        }
      });
    });
    box.innerHTML = '<div class="small muted" style="margin:8px 0">命中 ' + out.length + ' 节' + (out.length > 40 ? '（显示前 40 条）' : '') + '</div>' +
      (out.length ? out.slice(0, 40).map(x => '<button class="doc-hit" data-act="reader-open" data-doc="' + esc(x.doc) + '" data-q="' + encodeURIComponent(q) + '"><b>' + U.hl(x.t, q) + '</b><span>' + esc(x.doc) + '</span><p>' + U.hl(x.x, q) + '</p></button>').join('') : '<div class="callout">没有匹配。</div>');
  };

  /* ---------- 路由 ---------- */
  const ROUTES = {
    home: { title: '今日复习' }, map: { title: '知识地图' }, cards: { title: '卡片复习' }, bank: { title: '题库训练' },
    paper: { title: '套卷模考' }, tools: { title: '专题工具' }, image: { title: '识图练习' }, ask: { title: '问答' }, review: { title: '错题与复习' }, sources: { title: '资料原文' }
  };
  App.route = { name: 'home', param: null };
  App.go = function (name, param, push) {
    if (App.panelCid) App.closePanel();
    App.route = { name, param: param || null };
    if (push !== false) {
      const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
      if (location.hash !== h) history.pushState(null, '', h);
    }
    App.render();
  };
  App.parseHash = function () {
    const m = (location.hash || '').match(/^#\/([a-z]+)(?:\/(.+))?$/);
    if (m && ROUTES[m[1]]) App.route = { name: m[1], param: m[2] ? decodeURIComponent(m[2]) : null };
  };

  App.render = function () {
    const r = App.route, v = $('#view');
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.route === r.name));
    const t = (ROUTES[r.name] || ROUTES.home).title;
    $('#crumb').innerHTML = '<b>' + esc(t) + '</b>';
    window.scrollTo({ top: 0, behavior: 'auto' });
    v.innerHTML = '';
    const fn = App['view_' + r.name];
    if (fn) fn(v, r.param); else App.view_home(v);
    App.updateBadges();
    $('#rail').classList.remove('open');
  };

  App.updateBadges = function () {
    const s = App.store.get();
    const due = App.dueCount();
    const bDue = $('#badge-due');
    if (bDue) { bDue.textContent = due || ''; bDue.style.display = due ? '' : 'none'; }
    const bWrong = $('#badge-wrong');
    if (bWrong) { const n = App.wrongList().filter(x => !x.w.resolved).length; bWrong.textContent = n || ''; bWrong.style.display = n ? '' : 'none'; }
    const bCards = $('#badge-cards');
    if (bCards) { bCards.textContent = due || ''; bCards.style.display = due ? '' : 'none'; }
    const bBank = $('#badge-bank');
    if (bBank) bBank.textContent = D.questions.length;
  };

  /* ---------- 知识卡 ---------- */
  App.panelCid = null;
  App.openConcept = function (cid, opts) {
    const c = D.byCid[cid];
    if (!c) return;
    App.panelCid = cid;
    App.panelQuery = (opts && opts.q) || '';
    App.renderPanel();
    $('#panel').classList.add('open');
    document.body.classList.add('panel-open');
    if (App.panelQuery) {
      setTimeout(function () {
        const hit = $('#panel .qhit');
        if (hit) hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 60);
    }
  };
  App.closePanel = function () {
    $('#panel').classList.remove('open');
    document.body.classList.remove('panel-open');
    App.panelCid = null;
    App.panelQuery = '';
  };

  App.renderPanel = function () {
    const cid = App.panelCid; if (!cid) return;
    const c = D.byCid[cid], s = App.store.get();
    const m = App.mastery(cid);
    const fav = (s.fav || []).indexOf(cid) >= 0;
    const ch = D.chapters.find(x => x.id === c.ch) || {};
    const qids = c.qids || [];
    const freq = D.freq[cid];
    const recite = App.reciteMode;
    const hideMap = App.route.name === 'map' && App.mapState && App.mapState.mode === 'mind';
    const pq = App.panelQuery || '';
    const hl = (x) => U.hl(x, pq);
    const hasQ = (x) => !!pq && App.nzQuery(x || '').toLowerCase().indexOf(App.nzQuery(pq).toLowerCase()) >= 0;
    const qcls = (x) => hasQ(x) ? ' qhit' : '';

    let html = '<div class="panel-hd">' +
      '<button class="panel-close" data-act="panel-close">' + App.icon('close') + '</button>' +
      '<div class="row"><span class="chip accent">第' + c.ch + '章</span>' +
      (freq ? '<span class="chip warn tiny">批注年份 ' + freq.map(y => y === 26 ? '26*' : y).join('、') + '</span>' : '') +
      '</div>' +
      '<h3>' + hl(c.name) + '</h3>' +
      (c.en ? '<div class="en">' + esc(c.en) + '</div>' : '') +
      (c.aliases && c.aliases.length ? '<div class="small muted" style="margin-top:4px">别名：' + hl(c.aliases.join(' / ')) + '</div>' : '') +
      (hideMap ? '' : '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="concept-map" data-cid="' + cid + '">在知识地图中查看 →</button></div>') +
      '</div>';

    html += '<div class="panel-bd' + (recite ? ' recite' : '') + '" id="panelBody">';

    html += '<div class="k-sec"><h5>掌握程度</h5><div class="mastery">' +
      MASTERY_LABEL.map((t, i) => '<button data-act="mastery" data-v="' + i + '" class="mv' + i + (m === i ? ' on' : '') + '">' + t + '</button>').join('') +
      '</div></div>';

    if (recite) {
      html += '<div class="recite-tip">背诵模式：定义与要点已遮挡，先自己回忆，再点击灰色区域逐条揭示。</div>' +
        '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="recite-all">全部揭示</button>' +
        '<button class="btn sm" data-act="recite-hide">重新遮挡</button></div>';
    }

    html += '<div class="k-sec' + qcls(c.def) + '"><h5>一句话定义</h5>' +
      '<div class="k-def ' + (recite ? 'hideable' : '') + '">' + hl(c.def) + '</div></div>';

    if (c.points && c.points.length) {
      html += '<div class="k-sec' + (c.points.some(p => hasQ(p)) ? ' qhit' : '') + '"><h5>必须掌握的要点</h5><ul class="k-points">' +
        c.points.map(p => '<li class="' + (recite ? 'hideable' : '') + '">' + hl(p) + '</li>').join('') + '</ul></div>';
    }

    if (c.compare && c.compare.length) {
      c.compare.forEach(cp => { html += App.compareTable(cp, recite); });
    }

    if (c.pitfalls && c.pitfalls.length) {
      html += '<div class="k-sec' + (c.pitfalls.some(p => hasQ(p)) ? ' qhit' : '') + '"><h5>易错点</h5><div class="k-pit"><ul style="margin:0;padding:0 0 0 2px;list-style:disc inside">' +
        c.pitfalls.map(p => '<li>' + hl(p) + '</li>').join('') + '</ul></div></div>';
    }

    if (c.images && c.images.length) {
      html += '<div class="k-sec"><h5>图示</h5><div class="grid" style="gap:9px">' +
        c.images.map(im => '<figure class="fig" data-act="zoom" data-src="' + esc(im.src) + '" data-title="' + esc(im.cap) + '" data-note="' + esc(im.from || '') + '" style="margin:0">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(im.cap) + '" loading="lazy">' +
          '<figcaption>' + esc(im.cap) + (im.from ? ' · ' + esc(im.from) : '') + '</figcaption></figure>').join('') + '</div></div>';
    }

    if (c.src && c.src.length) {
      html += '<div class="k-sec"><h5>资料出处</h5><div class="src-list">' +
        c.src.map(x => '<div class="src-item"><b>' + esc(x.doc) + '</b><span class="muted">' + esc(x.page || '') + '</span>' +
          (x.note ? '<span class="muted small">' + esc(x.note) + '</span>' : '') +
          App.pdfLink(x.doc, x.page, '打开原页 ↗') + '</div>').join('') +
        '</div>' +
        (function () {
          const ps = (D.pages || []).filter(p => (p.concepts || []).indexOf(cid) >= 0);
          if (!ps.length) return '';
          return '<div class="row" style="margin-top:7px">' + ps.map(p =>
            '<button class="btn sm" data-act="zoom" data-src="' + esc(p.img) + '" data-title="' + esc(p.doc + ' 第' + p.page + '页 · ' + p.title) + '" data-note="' + esc(p.note) + '">查看原页 · ' + esc(p.doc) + ' p' + esc(p.page) + '</button>').join('') + '</div>';
        })() +
        '<div class="small muted" style="margin-top:6px">页码为 PDF 物理页（从1起算）；精讲 part2 的原PDF页＝part2页序号＋200。</div></div>';
    }

    if (qids.length) {
      html += '<div class="k-sec"><h5>相关试题 · ' + qids.length + ' 题</h5><div class="q-links">' +
        qids.slice(0, 14).map(qid => {
          const q = D.byQid[qid];
          return '<div class="q-link" data-act="goto-q" data-qid="' + qid + '"><span class="y">' + (q.year || '自测') + '</span>' +
            '<span class="t">' + esc(stripLen(q.stem, 34)) + '</span><span class="chip tiny">' + esc(q.type) + '</span></div>';
        }).join('') + '</div>' +
        (qids.length > 14 ? '<div class="small muted" style="margin-top:6px">仅显示前 14 题，更多请在题库按考点筛选。</div>' : '') + '</div>';
    }

    html += '<div class="k-sec"><h5>我的笔记</h5><textarea class="note-area" data-act="note" data-cid="' + cid + '" placeholder="记录自己的记忆口诀、易混点、老师强调的内容…">' + esc(s.notes[cid] || '') + '</textarea>' +
      '<div class="small muted" style="margin-top:5px">自动保存到本机浏览器</div></div>';

    html += '<div class="small muted" style="border-top:1px solid var(--line-2);padding-top:10px">' + esc(ch.note || '') + '</div>';
    html += '</div>';

    html += '<div class="panel-ft">' +
      '<button class="btn sm ' + (fav ? 'on' : '') + '" data-act="fav">' + App.icon('star', '') + (fav ? ' 已收藏' : ' 收藏') + '</button>' +
      '<button class="btn sm" data-act="toggle-recite">' + (recite ? '退出背诵' : '背诵模式') + '</button>' +
      '<button class="btn sm" data-act="ask-related" style="margin-left:auto">做关联题</button>' +
      '</div>';

    $('#panel').innerHTML = html;
  };

  function stripLen(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
  App.stripLen = stripLen;

  App.compareTable = function (cp, masked) {
    return '<div class="k-sec"><h5>' + esc(cp.title || '对比') + '</h5>' +
      '<div class="scroll" style="border:1px solid var(--line);border-radius:10px;overflow:hidden">' +
      '<table class="cmp-table"><thead><tr>' + cp.cols.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      cp.rows.map(r => '<tr>' + r.map((cell, i) => '<td' + (i > 0 && masked ? ' class="masked" data-act="unmask"' : '') + '>' + esc(cell) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      (masked ? '<div class="small muted" style="margin-top:5px">点击任意单元格可揭示该格内容。</div>' : '') + '</div>';
  };

  /* ---------- 事件委托 ---------- */
  App.bindGlobal = function () {
    document.addEventListener('click', function (e) {
      const t = e.target.closest('[data-act]');
      const act = t && t.dataset.act;

      if (e.target.closest('[data-route]')) {
        e.preventDefault();
        App.go(e.target.closest('[data-route]').dataset.route);
        return;
      }
      if (e.target.id === 'modal') { App.closeModal(); return; }

      if (!act) return;
      switch (act) {
        case 'panel-close': App.closePanel(); break;
        case 'mastery': App.setMastery(App.panelCid, +t.dataset.v); App.renderPanel(); break;
        case 'fav': {
          const s = App.store.get(), cid = App.panelCid;
          const i = s.fav.indexOf(cid);
          if (i >= 0) s.fav.splice(i, 1); else s.fav.push(cid);
          App.store.save(); App.renderPanel(); App.toast(i >= 0 ? '已取消收藏' : '已收藏');
          break;
        }
        case 'toggle-recite': App.reciteMode = !App.reciteMode; App.renderPanel(); break;
        case 'recite-all': $$('.hideable', $('#panelBody')).forEach(x => x.classList.add('shown')); break;
        case 'recite-hide': $$('.hideable', $('#panelBody')).forEach(x => x.classList.remove('shown')); break;
        case 'unmask': t.classList.remove('masked'); break;
        case 'zoom': App.imageModal(t.dataset.src, t.dataset.title, t.dataset.note); break;
        case 'sr-recent': {
          const i = $('#globalSearch');
          if (i) { i.value = t.dataset.q; i.dispatchEvent(new Event('input')); }
          break;
        }
        case 'sr-concept':
          App.closeModal(); App.openConcept(t.dataset.cid); break;
        case 'concept-map':
          App.closePanel(); App.focusConcept(t.dataset.cid); break;
        case 'reader-open':
          App.openReader(t.dataset.doc, t.dataset.q ? decodeURIComponent(t.dataset.q) : ''); break;
        case 'map-result': {
          const cid = t.dataset.cid, id = t.dataset.id;
          const q = t.dataset.q ? decodeURIComponent(t.dataset.q) : '';
          if (App.route.name === 'map' && App.mapState.mode === 'mind' && id && App.focusMapNode) App.focusMapNode(id);
          if (cid) App.openConcept(cid, { q: q });
          break;
        }
        case 'sr-q':
          App.closeModal();
          App.qUI = {};
          App.bankState.session = { ids: [t.dataset.qid], idx: 0, t0: Date.now(), answers: {} };
          App.go('bank'); break;
        case 'modal-close': App.closeModal(); break;
        case 'goto-q': App.closePanel(); App.go('bank', 'concept:' + t.dataset.qid); break;
        case 'ask-related': {
          const cid = App.panelCid, qids = (D.byCid[cid] || {}).qids || [];
          App.closePanel();
          if (!qids.length) { App.toast('该考点暂无关联题'); break; }
          App.bankState.concept = cid; App.bankState.session = null; App.bankState.q = '';
          App.bankState.restored = true;
          App.store.get().bankSession = null; App.store.save();
          App.go('bank');
          break;
        }
      }
    });

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (t.dataset && t.dataset.act === 'note') {
        const s = App.store.get();
        s.notes[t.dataset.cid] = t.value;
        App.store.save();
      }
      if (t.dataset && t.dataset.act === 'draft') {
        const s = App.store.get();
        s.drafts[t.dataset.qid] = t.value;
        App.store.save();
      }
    });

    document.addEventListener('click', function (e) {
      const h = e.target.closest('.hideable');
      if (h) h.classList.toggle('shown');
    });

    window.addEventListener('popstate', function () { App.parseHash(); App.render(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { App.closeModal(); App.closePanel(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); App.openSearch(); }
    });
  };

  /* ---------- 全局搜索 ---------- */
  function nzQuery(s) {
    return String(s || '').replace(/[\s\u3000]+/g, '').replace(/溶源/g, '溶原').replace(/革蓝/g, '革兰')
      .replace(/夹膜/g, '荚膜').replace(/基团移位/g, '基团转位').replace(/芽胞/g, '芽孢');
  }
  App.nzQuery = nzQuery;

  App.openSearch = function (kw) {
    App.modal('<div class="modal-pad search-modal"><h3>全站检索</h3>' +
      '<p class="small muted" style="margin:2px 0 12px">支持中文名、别名与英文；回车确认，Ctrl/⌘+K 随时唤起。</p>' +
      '<input id="globalSearch" placeholder="如：芽孢、G+、EMP、CFU、溶原…" value="' + esc(kw || '') + '">' +
      (function () {
        const r = (App.store.get().recentSearch || []).slice(0, 6);
        return r.length ? '<div class="row" style="margin-top:7px">' + r.map(x => '<button class="chip" data-act="sr-recent" data-q="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '';
      })() +
      '<label class="cb" style="margin:9px 0 2px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="srAns"> 同时检索答案与解析（练习时建议关闭）</label>' +
      '<div id="searchResults"></div></div>');
    const inp = $('#globalSearch');
    inp.focus(); inp.select();
    let composing = false;
    const run = () => {
      if (composing) return;
      const q0 = inp.value.trim();
      const q = nzQuery(q0);
      const box = $('#searchResults');
      if (!q) { box.innerHTML = '<div class="small muted" style="margin-top:14px">输入关键词开始检索。</div>'; return; }
      const st = App.store.get();
      st.recentSearch = [q0].concat((st.recentSearch || []).filter(x => x !== q0)).slice(0, 6);
      App.store.save();
      const cs = D.concepts.filter(c =>
        nzQuery(c.name).toLowerCase().includes(q.toLowerCase()) ||
        (c.aliases || []).some(a => nzQuery(a).toLowerCase().includes(q.toLowerCase())) ||
        (c.en || '').toLowerCase().includes(q.toLowerCase()) ||
        nzQuery(c.def).includes(q)
      ).slice(0, 8);
      const withAns = $('#srAns') && $('#srAns').checked;
      const qs = D.questions.filter(x =>
        nzQuery(x.stem).includes(q) || nzQuery(x.material || '').includes(q) ||
        (x.options || []).some(o => String(o).includes(q)) ||
        (withAns && ((x.answer || '').includes(q) || (x.explain || '').includes(q)))
      ).slice(0, 8);
      box.innerHTML =
        '<div class="sr-group"><h6>知识节点 · ' + cs.length + '</h6>' +
        (cs.length ? cs.map(c => '<div class="hit" data-act="sr-concept" data-cid="' + c.id + '"><b>' + U.hl(c.name, q) + '</b><span>第' + c.ch + '章 · ' + U.hl(App.stripLen(c.def, 56), q) + '</span></div>').join('') : '<div class="small muted">无匹配</div>') +
        '</div><div class="sr-group"><h6>题目 · ' + qs.length + '</h6>' +
        (qs.length ? qs.map(x => '<div class="hit" data-act="sr-q" data-qid="' + x.id + '"><b>' + (x.year || '自测') + ' · ' + esc(x.type) + ' · ' + U.hl(App.stripLen(x.stem, 40), q) + '</b><span class="muted">第' + x.ch + '章 · ' + esc(x.source) + (withAns ? ' · ' + esc(App.stripLen(x.answer || '', 50)) : '') + '</span></div>').join('') : '<div class="small muted">无匹配</div>') +
        '</div>';
    };
    inp.addEventListener('compositionstart', () => { composing = true; });
    inp.addEventListener('compositionend', () => { composing = false; run(); });
    inp.addEventListener('input', U.debounce(() => { if (!composing) run(); }, 160));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    $('#srAns').addEventListener('change', run);
    run();

  };
})();
