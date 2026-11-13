/* ============ 真题检索 + 概念问答 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, esc = U.esc, D = App.data;
  App.askState = App.askState || { tab: 'lookup', result: null, qa: null };

  const EXAMPLES = [
    '芽孢为什么耐热',
    '革兰氏染色最关键的一步',
    '菌落总数和大肠菌群的区别',
    'EMP 与 ED 途径',
    '食品中微生物的消长规律'
  ];

  function terms(q) {
    const out = [];
    q.trim().split(/[\s,，。、；;？?！!]+/).forEach(w => { if (w.length >= 2) out.push(w); });
    if (out.length === 1 && out[0].length > 4) {
      const s = out[0];
      for (let i = 0; i + 2 <= s.length && i < 14; i++) out.push(s.slice(i, i + 2));
    }
    return U.uniq(out).filter(t => t.length >= 2).slice(0, 20);
  }

  function scoreConcept(c, q, ts) {
    const name = c.name, alias = (c.aliases || []).join(' ');
    let sc = 0;
    if (name === q) sc += 40;
    if (q.indexOf(name) >= 0 && name.length >= 2) sc += 16;
    if (name.indexOf(q) >= 0 && q.length >= 2) sc += 14;
    if (alias.indexOf(q) >= 0 && q.length >= 2) sc += 10;
    ts.forEach(t => {
      if (name.indexOf(t) >= 0) sc += 7;
      if (alias.indexOf(t) >= 0) sc += 4;
      if ((c.en || '').toLowerCase().indexOf(t.toLowerCase()) >= 0) sc += 4;
      if ((c.def || '').indexOf(t) >= 0) sc += 2;
    });
    return sc;
  }

  function bigrams(s) {
    const set = new Set();
    const t = (App.nzQuery ? App.nzQuery(s) : s).replace(/[\s，。、；：？！“”‘’（）()【】\[\]·.,;:?!\-—_/\\]/g, '');
    for (let i = 0; i + 2 <= t.length; i++) set.add(t.slice(i, i + 2));
    return set;
  }
  function overlap(a, b) {
    if (!a.size || !b.size) return { j: 0, inter: 0 };
    let n = 0;
    a.forEach(x => { if (b.has(x)) n++; });
    return { j: n / Math.max(a.size, b.size), inter: n };
  }

  function qNo(q) {
    const p = q.paper && D.byPaper[q.paper];
    if (!p) return '';
    for (const s of p.sections) {
      const i = s.ids.indexOf(q.id);
      if (i >= 0) return s.name.replace(/^[一二三四五六]、/, '').replace(/题$/, '') + ' 第 ' + (i + 1) + ' 题';
    }
    return '';
  }

  App.lookup = function (raw) {
    raw = (raw || '').trim();
    if (!raw) return null;
    const ts = terms(raw);
    const cRank = D.concepts.map(c => ({ c: c, s: scoreConcept(c, raw, ts) })).filter(x => x.s > 3).sort((a, b) => b.s - a.s);
    const topC = cRank.slice(0, 3);
    const cids = topC.map(x => x.c.id);
    const nameOf = id => (D.byCid[id] || {}).name || id;
    const gq = bigrams(raw);
    const longQuery = gq.size >= 10;

    const hits = D.questions.map(q => {
      let score = 0, why = '';
      if (longQuery) {
        const o = overlap(gq, bigrams(q.stem + ' ' + (q.material || '')));
        if (o.j >= 0.24 && o.inter >= 8) { score = Math.round(55 + o.j * 45); why = '题干高度相似'; }
      }
      if (!score) {
        const shared = (q.concepts || []).filter(c => cids.indexOf(c) >= 0);
        if (shared.length) { score = shared.length >= 2 ? 90 : 82; why = '同一考点：' + nameOf(shared[0]); }
      }
      if (!score) {
        const tHit = ts.filter(t => (App.nzQuery ? App.nzQuery(q.stem) : q.stem).indexOf(t) >= 0).length;
        if (tHit >= 2) { score = Math.min(85, 58 + tHit * 6); why = '关键词命中 ' + tHit + ' 个'; }
      }
      return { q: q, score: score, why: why };
    }).filter(x => x.score > 0 && x.q.source === '846真题')
      .sort((a, b) => b.score - a.score || (b.q.year - a.q.year));

    const years = U.uniq(hits.map(x => x.q.year)).sort();
    return { raw: raw, concepts: topC, hits: hits.slice(0, 12), total: hits.length, years: years, best: hits.length ? hits[0].score : 0 };
  };

  /* ---------------- 视图 ---------------- */
  App.view_ask = function (v) {
    const st = App.askState;
    let h = '<h1 class="page-title">真题检索与问答</h1><p class="page-sub">先查“这道题历年考过吗”，再决定要不要看解释。检索只基于已收录的 846 真题、期末题与练习题，不预测未来出题。</p>';

    h += '<div class="ask-tabs">' +
      '<button class="' + (st.tab === 'lookup' ? 'on' : '') + '" data-act="ask-tab" data-v="lookup">这道题考过吗</button>' +
      '<button class="' + (st.tab === 'qa' ? 'on' : '') + '" data-act="ask-tab" data-v="qa">概念问答</button>' +
      '</div>';

    if (st.tab === 'lookup') {
      h += '<div class="card ask-box"><div class="look-row">' +
        '<textarea id="lookupInput" class="lookup-input" rows="2" placeholder="粘贴完整题干，或输入知识点／自己的说法，例如：芽孢为什么耐热、革兰氏染色最关键的一步">' + esc(st.raw || '') + '</textarea>' +
        '<button class="btn primary ask-btn" data-act="lookup-run">查询证据<span class="small mono">Ctrl ↵</span></button></div>' +
        '<div class="ask-sug">' + EXAMPLES.map(s => '<button class="chip" data-act="lookup-eg" data-q="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
        '</div>';
      h += '<div id="lookupOut">' + (st.result ? renderLookup(st.result) : renderLookupIntro()) + '</div>';
    } else {
      h += '<div class="card ask-box"><div class="row">' +
        '<input id="askInput" class="ask-input" placeholder="例如：芽孢为什么耐热？选择培养基和鉴别培养基有什么区别？" value="' + esc(st.qaRaw || '') + '">' +
        '<button class="btn primary" data-act="ask-run">提问</button></div>' +
        '<div class="ask-sug">' + EXAMPLES.map(s => '<button class="chip" data-act="ask-sug" data-q="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div></div>';
      h += '<div id="askOut">' + (st.qa ? renderAnswer(st.qa) : '') + '</div>';
    }
    v.innerHTML = h;

    const li = $('#lookupInput');
    if (li) li.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runLookup(); });
    const ai = $('#askInput');
    if (ai) ai.addEventListener('keydown', e => { if (e.key === 'Enter') runQA(); });
    function runLookup() { st.raw = $('#lookupInput').value; st.result = App.lookup(st.raw); App.view_ask($('#view')); }
    function runQA() { st.qaRaw = $('#askInput').value; st.qa = App.askSearch(st.qaRaw); App.view_ask($('#view')); }
    App._runLookup = runLookup; App._runQA = runQA;
  };

  function renderLookupIntro() {
    return '<div class="card" style="padding:30px 24px;text-align:center">' +
      '<h3 style="font-family:var(--serif);margin:0 0 6px">这道题，历年真题考过吗？</h3>' +
      '<p class="small muted" style="max-width:520px;margin:0 auto">粘贴题干或输入考点，系统会拆出对应知识节点，回到题库中检出关联真题，并给出年份、题型、原卷页码与关联理由。</p>' +
      '<div class="evidence-note" style="margin-top:16px">已收录 846 真题 2012—2025（其中 2021、2022 为用户回忆的考点记录，无选择题原题）；期末与练习题不计入年份统计。</div></div>';
  }

  function renderLookup(r) {
    if (!r) return '';
    let h = '';
    if (!r.hits.length) {
      h += '<div class="card"><div class="callout warn"><b>未检出关联真题。</b>已收录范围内没有找到与该问题对应的题目。这不等于“不会考”，只说明现有资料没有覆盖。' +
        '可以换一个更具体的说法，或到知识地图确认考点名称。</div></div>';
      return h;
    }

    h += '<div class="evidence-summary"><div class="es-main">' +
      '<div class="es-num"><b>' + r.total + '</b><span>道关联真题</span></div>' +
      '<div class="es-meta"><div>年份覆盖：<b>' + r.years.join('、') + '</b></div>' +
      '<div>最高相关度：<b>' + r.best + '%</b> · 检索模式：本地考点与题干索引</div></div></div>' +
      '<div class="es-badge">只基于已收录资料<br><span>不预测未来必然出题</span></div></div>';

    const yc = {};
    r.hits.forEach(x => { yc[x.q.year] = (yc[x.q.year] || 0) + 1; });
    const maxY = Math.max.apply(null, Object.keys(yc).map(y => yc[y]));
    h += '<div class="card ev-years-card"><div class="small muted" style="margin-bottom:6px">年份分布（按检出题目数）</div>' +
      '<div class="ev-years">' + Object.keys(yc).sort().map(y =>
        '<div class="ev-y"><b>' + yc[y] + '</b><i style="height:' + Math.round(6 + yc[y] / maxY * 22) + 'px"></i><span>' + y + '</span></div>').join('') +
      '</div></div>';

    if (r.concepts.length) {
      h += '<div class="card" style="padding:13px 16px"><div class="small muted" style="margin-bottom:6px">拆解的考点</div>' +
        '<div class="row">' + r.concepts.map(x => '<button class="chip accent" data-act="open-c" data-cid="' + x.c.id + '">' +
          esc(x.c.name) + ' <span class="mono" style="opacity:.6">' + x.c.id.toUpperCase() + '</span></button>').join('') + '</div></div>';
    }

    h += '<div class="small muted" style="margin:16px 0 8px">真题依据 · ' + r.total + ' 条（按相关度排序，最多显示 12 条）</div>';
    h += r.hits.map(x => {
      const q = x.q, pg = App.qPage(q);
      const no = qNo(q);
      return '<div class="ev-card">' +
        '<div class="ev-hd"><span class="ev-year">' + q.year + '</span>' +
        '<span class="chip">' + esc(q.type) + '</span>' +
        '<span class="chip ' + (x.why === '题干高度相似' ? 'ok' : 'accent') + '">' + (x.why === '题干高度相似' ? '题干相似' : '考点关联') + ' · ' + x.score + '%</span>' +
        '<span class="ev-why">' + esc(x.why) + '</span></div>' +
        '<div class="ev-stem">' + esc(App.stripLen(q.stem, 150)) + '</div>' +
        '<div class="ev-meta">' + [q.source, q.version, no, pg ? '资料 p' + pg.page : '', q.status === '冲突' ? '答案存疑' : ''].filter(Boolean).map(esc).join(' · ') + '</div>' +
        '<div class="ev-acts"><button class="btn sm" data-act="lookup-open" data-qid="' + q.id + '">查看题目</button>' +
        (pg ? App.pdfLink(pg.doc, pg.page, '原卷 p' + pg.page + ' ↗') : '') +
        ((q.concepts || [])[0] ? '<span class="small muted">考点：' + esc((D.byCid[q.concepts[0]] || {}).name || '') + '</span>' : '') +
        '</div></div>';
    }).join('');

    h += '<div class="evidence-note">检索口径：题目来自本地题库；年份为该题在 846 真题中出现的记录，跨年同题分别保留。相关度由题干相似度与考点匹配计算，是检索排序指标，不是出题概率。</div>';
    return h;
  }

  /* ---------------- 概念问答 ---------------- */
  function renderAnswer(r) {
    if (!r || !r.q) return '';
    if (!r.evidence || r.evidence < 7) {
      const near = D.concepts.map(c => ({ c: c, s: (c.name.indexOf(r.q) >= 0 || r.q.indexOf(c.name) >= 0) ? 9 : 0 })).filter(x => x.s).slice(0, 4);
      return '<div class="card"><div class="callout warn"><b>证据不足。</b>知识库里没有与该问题直接对应的节点或题目，我不做推测性回答。' +
        '可以换一个更具体的概念名，或从下面的相近节点进入。</div>' +
        (near.length ? '<div class="row">' + near.map(x => '<button class="chip accent" data-act="open-c" data-cid="' + x.c.id + '">' + esc(x.c.name) + '</button>').join('') + '</div>' : '') +
        '<p class="small muted" style="margin-top:10px">可尝试：“芽孢”“革兰氏染色”“生长曲线”“选择培养基”。</p></div>';
    }
    const c = r.concepts[0].c;
    const others = r.concepts.slice(1).map(x => x.c);
    let h = '<div class="card ask-answer">';
    h += '<div class="row" style="margin-bottom:6px"><span class="chip accent">本地检索</span>' +
      '<span class="chip">' + esc(c.name) + '</span><span class="small muted">匹配度 ' + r.evidence + '</span></div>';
    h += '<h3 class="ask-title">' + esc(c.name) + '</h3>';
    if (c.en) h += '<div class="small muted mono" style="margin:-4px 0 8px">' + esc(c.en) + '</div>';
    h += '<div class="ask-sec"><h5>定义</h5><p>' + esc(c.def) + '</p></div>';
    if (c.points && c.points.length) {
      h += '<div class="ask-sec"><h5>要点</h5><ol class="ans-block pts">' + c.points.slice(0, 6).map(p => '<li>' + esc(p) + '</li>').join('') + '</ol></div>';
    }
    if (c.pitfalls && c.pitfalls.length) {
      h += '<div class="ask-sec"><h5>易错与校核提示</h5><div class="k-pit"><ul style="margin:0;padding:0 0 0 2px;list-style:disc inside">' +
        c.pitfalls.slice(0, 3).map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div></div>';
    }
    const src = (c.src || []).slice(0, 3);
    if (src.length) {
      h += '<div class="ask-sec"><h5>出处</h5><div class="src-list">' + src.map(x =>
        '<div class="src-item"><b>' + esc(x.doc) + '</b><span class="muted">' + esc(x.page || '') + '</span>' + App.pdfLink(x.doc, x.page, '打开原页 ↗') + '</div>').join('') + '</div></div>';
    }
    const qids = (c.qids || []).slice(0, 4);
    if (qids.length) {
      h += '<div class="ask-sec"><h5>相关真题</h5><div class="q-links">' + qids.map(id => {
        const q = D.byQid[id];
        return '<div class="q-link" data-act="ask-open-q" data-qid="' + id + '"><span class="y">' + (q.year || '自测') + '</span><span class="t">' + esc(App.stripLen(q.stem, 40)) + '</span><span class="chip tiny">' + esc(q.type) + '</span></div>';
      }).join('') + '</div></div>';
    }
    if (others.length) {
      h += '<div class="ask-sec"><h5>还可能相关</h5><div class="row">' + others.map(o =>
        '<button class="chip" data-act="open-c" data-cid="' + o.id + '">' + esc(o.name) + '</button>').join('') + '</div></div>';
    }
    h += '<div class="ask-note">以上内容由本地知识卡拼接，未调用外部模型。若与教材表述不一致，以教材与任课教师讲解为准；涉及“冲突/待核”的内容已在知识卡中标注。</div></div>';
    return h;
  }

  App.askSearch = function (q) {
    q = (q || '').trim();
    if (!q) return null;
    const ts = terms(q);
    const cs = D.concepts.map(c => ({ c: c, s: scoreConcept(c, q, ts) })).filter(x => x.s > 3)
      .sort((a, b) => b.s - a.s).slice(0, 3);
    const qs = D.questions.filter(x => x.stem.indexOf(q) >= 0 ||
      (ts.length > 1 && ts.filter(t => x.stem.indexOf(t) >= 0).length >= 2)).slice(0, 5);
    return { q: q, ts: ts, concepts: cs, questions: qs, evidence: cs.length ? cs[0].s : 0 };
  };

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'ask-tab') { App.askState.tab = t.dataset.v; App.view_ask($('#view')); return; }
    if (act === 'lookup-run') { App._runLookup && App._runLookup(); return; }
    if (act === 'lookup-eg') { App.askState.raw = t.dataset.q; App.askState.result = App.lookup(t.dataset.q); App.view_ask($('#view')); return; }
    if (act === 'lookup-open') {
      App.qUI = {};
      App.bankState.session = { ids: [t.dataset.qid], idx: 0, t0: Date.now(), answers: {} };
      App.go('bank'); return;
    }
    if (act === 'ask-run') { App._runQA && App._runQA(); return; }
    if (act === 'ask-sug') { App.askState.qaRaw = t.dataset.q; App.askState.qa = App.askSearch(t.dataset.q); App.view_ask($('#view')); return; }
    if (act === 'ask-open-q') {
      App.qUI = {};
      App.bankState.session = { ids: [t.dataset.qid], idx: 0, t0: Date.now(), answers: {} };
      App.go('bank');
    }
  });
})();
