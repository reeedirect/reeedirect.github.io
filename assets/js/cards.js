/* ============ 卡片复习：真题名解（默认）+ 扩展卡组 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, esc = U.esc, D = App.data;

  const DECKS = [
    { id: 'zhenti', name: '真题名词解释', desc: '846 历年真题中的全部名词解释（含跨年同题）' },
    { id: 'concept', name: '核心概念卡', desc: '95 个知识节点，来自精讲、总结与讲义（扩展）' },
    { id: 'qimo', name: '期末名词解释', desc: '2022 期末 A/B 卷名词解释（扩展）' },
    { id: 'lianxi', name: '练习题名解', desc: '练习题中带答案的名词解释（扩展）' }
  ];
  const SCOPES = [['all', '全部'], ['due', '今日待学'], ['new', '未学'], ['done', '已掌握']];

  App.cardsState = App.cardsState || { deck: 'zhenti', scope: 'all', ids: [], idx: 0, flipped: false, tally: { 0: 0, 1: 0, 2: 0 } };

  function isZhenti(q) { return q.source === '846真题'; }
  function isQimo(q) { return q.source === '校内期末'; }
  function isLianxi(q) { return q.source === '其他高校试题' || q.source === '资料练习'; }

  function allItems(deck) {
    if (deck === 'concept') {
      return D.concepts.map(c => ({
        key: 'c:' + c.id, kind: 'c', id: c.id, front: c.name, en: c.en,
        tag: '第' + c.ch + '章', code: c.id.toUpperCase(),
        def: c.def, points: c.points || [], pitfalls: c.pitfalls || [],
        src: (c.src || []).slice(0, 2).map(x => x.doc + ' ' + (x.page || '')).join(' · '),
        qids: c.qids || []
      }));
    }
    const pred = deck === 'zhenti' ? isZhenti : deck === 'qimo' ? isQimo : isLianxi;
    return D.questions.filter(q => q.type === '名词解释' && pred(q))
      .sort((a, b) => (a.year - b.year) || String(a.stem).localeCompare(String(b.stem)))
      .map(q => ({
        key: 'q:' + q.id, kind: 'q', id: q.id, front: q.stem,
        tag: (q.year || '—') + ' 年', code: q.id.toUpperCase(),
        def: q.answer || '', points: q.points || [], pitfalls: [],
        src: [q.source, q.version, q.no ? '第' + q.no + '题' : ''].filter(Boolean).join(' · '),
        qid: q.id
      }));
  }

  function stateOf(key) { return App.store.get().review[key] || null; }
  function cardMastery(it) {
    if (it.kind === 'c') return App.mastery(it.id);
    const st = stateOf(it.key);
    if (!st) return 0;
    return st.last === 0 ? 1 : (st.last || 0);
  }
  function setCardMastery(it, v) {
    if (it.kind === 'c') App.setMastery(it.id, v, true);
    else {
      const s = App.store.get();
      if (v === 0) delete s.review[it.key];
      else App.schedule(it.key, v);
      App.store.save();
    }
    App.toast('已记为「' + App.MASTERY_LABEL[v] + '」');
  }
  App.openCardList = function () {
    const rows = [];
    DECKS.forEach(d => allItems(d.id).forEach(it => rows.push({ it: it, deck: d.name, deckId: d.id })));
    const counts = [0, 1, 2, 3].map(v => rows.filter(r => cardMastery(r.it) === v).length);
    let h = '<div class="modal-pad"><h3>全部卡片 · ' + rows.length + ' 张</h3>' +
      '<p class="small muted">按卡组列出全部卡片；可直接点四级掌握度修改，修改会同步到复习调度。</p>' +
      '<div class="card-list-filters">' +
      '<div class="cl-row"><b>卡组</b>' + DECKS.map(d => '<label><input type="checkbox" class="cl-deck" value="' + d.id + '" checked> ' + esc(d.name) + '</label>').join('') + '</div>' +
      '<div class="cl-row"><b>掌握</b>' + App.MASTERY_LABEL.map((x, i) => '<label><input type="checkbox" class="cl-m" value="' + i + '" checked><i class="mlg mlg' + i + '"></i> ' + x + '</label>').join('') +
      '<span class="small muted" id="cardListCount">显示 ' + rows.length + ' / ' + rows.length + ' 张</span></div></div>' +
      '<div class="map-legend" style="margin:8px 0 10px"><b style="font-weight:600">掌握度</b>' +
      ['未学', '模糊', '会', '熟练'].map((x, i) => '<span data-mcount="' + i + '"><i class="mlg mlg' + i + '"></i>' + x + ' <b class="mono">' + counts[i] + '</b></span>').join('') + '</div>' +
      '<div class="scroll" style="max-height:62vh"><table class="cmp-table card-list-table" style="font-size:12px"><thead><tr><th style="width:19%">卡组</th><th>卡片</th><th style="width:30%">掌握情况</th></tr></thead><tbody>';
    rows.forEach(r => {
      const it = r.it, m = cardMastery(it);
      h += '<tr data-key="' + esc(it.key) + '" data-deck="' + r.deckId + '" data-m="' + m + '"><td><span class="chip tiny">' + esc(r.deck) + '</span></td>' +
        '<td><div class="front">' + esc(it.front) + '</div><div class="sub">' + esc(it.tag || '') + (it.src ? ' · ' + esc(it.src) : '') + '</div></td>' +
        '<td><div class="mastery-pills">' + App.MASTERY_LABEL.map((lab, i) =>
          '<button class="mlv m' + i + (m === i ? ' on' : '') + '" data-act="cards-list-set" data-kind="' + it.kind + '" data-id="' + esc(it.id) + '" data-key="' + esc(it.key) + '" data-v="' + i + '">' + lab + '</button>').join('') +
        '</div></td></tr>';
    });
    h += '</tbody></table></div></div>';
    App.modal(h);
  };
  function dueItems(items) {
    const t = U.today();
    return items.filter(it => { const s = stateOf(it.key); return s && s.due && s.due <= t; });
  }
  function newItems(items) {
    const s = App.store.get();
    return items.filter(it => {
      if (stateOf(it.key)) return false;
      if (it.kind === 'c') return !s.mastery[it.id];
      return !s.attempts[it.id];
    });
  }

  function buildQueue(deck, scope) {
    const items = allItems(deck);
    const daily = App.store.get().dailyNew || 10;
    if (scope === 'all') return items.slice();
    if (scope === 'new') return shuffle(newItems(items));
    if (scope === 'due') return shuffle(dueItems(items)).concat(shuffle(newItems(items).slice(0, daily)));
    if (scope === 'done') return items.filter(it => { const st = stateOf(it.key); return (st && st.last === 2) || (it.kind === 'c' && App.mastery(it.id) >= 2); });
    return items.slice();
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  App.applyCardFilter = function () {
    const decks = $$('.cl-deck').filter(x => x.checked).map(x => x.value);
    const ms = $$('.cl-m').filter(x => x.checked).map(x => +x.value);
    let shown = 0, total = 0;
    $$('.card-list-table tbody tr').forEach(tr => {
      total++;
      const ok = decks.indexOf(tr.dataset.deck) >= 0 && ms.indexOf(+tr.dataset.m) >= 0;
      tr.hidden = !ok; if (ok) shown++;
    });
    const el = $('#cardListCount'); if (el) el.textContent = '显示 ' + shown + ' / ' + total + ' 张';
    [0, 1, 2, 3].forEach(v => {
      const n = $$('.card-list-table tbody tr').filter(tr => tr.querySelector('.mlv.m' + v + '.on')).length;
      const box = $('[data-mcount="' + v + '"] b'); if (box) box.textContent = n;
    });
  };

  App.view_cards = function (v, param) {
    const cs = App.cardsState;
    if (param === 'due') cs.scope = 'due';
    if (!cs.ids.length && !cs.finished) restart(cs.deck, cs.scope, true);
    render(v);
  };

  function restart(deck, scope, silent) {
    const cs = App.cardsState;
    cs.deck = deck || cs.deck;
    cs.scope = scope || cs.scope;
    cs.ids = buildQueue(cs.deck, cs.scope);
    cs.idx = 0; cs.flipped = false; cs.finished = false; cs.tally = { 0: 0, 1: 0, 2: 0 };
    if (!silent) App.render();
  }

  function render(v) {
    const cs = App.cardsState;
    const items = allItems(cs.deck);
    const total = cs.ids.length;
    const dueN = dueItems(items).length, newN = newItems(items).length;
    const s = App.store.get();
    const deck = DECKS.find(d => d.id === cs.deck) || DECKS[0];

    let h = '<h1 class="page-title">卡片复习</h1><p class="page-sub">默认背真题名词解释；概念卡、期末与练习题名解作为扩展卡组，按需选择。轻点翻面，左滑忘记、右滑记住、上滑模糊，键盘 1 / 2 / 3。</p>';

    h += '<div class="deck-tabs">' + DECKS.map(d => {
      const n = allItems(d.id).length;
      return '<button class="deck-tab ' + (cs.deck === d.id ? 'on' : '') + '" data-act="cards-deck" data-v="' + d.id + '">' +
        '<b>' + d.name + '</b><span>' + n + ' 张</span></button>';
    }).join('') +
      '<button class="cards-all-btn" data-act="cards-list">查看全部卡片</button></div>';
    h += '<div class="small muted" style="margin:-4px 0 10px">' + esc(deck.desc) + '。卡片不是题库题卡；要做题请去“题库训练”或“套卷模考”。</div>';

    h += '<div class="card-scope"><div class="row" style="gap:6px;flex-wrap:wrap">' +
      SCOPES.map(x => '<button class="btn sm ' + (cs.scope === x[0] ? 'on' : '') + '" data-act="cards-scope" data-v="' + x[0] + '">' + x[1] + '</button>').join('') +
      '<span class="small muted" style="margin-left:auto">共 <b class="mono">' + items.length + '</b> · 今日待学 <b class="mono">' + (dueN + Math.min(newN, s.dailyNew || 10)) +
      '</b> · 未学 <b class="mono">' + newN + '</b></span></div></div>';

    if (!total) {
      h += '<div class="card" style="text-align:center;padding:44px 20px">' +
        '<h3 style="font-family:var(--serif);margin:0 0 6px">这个范围没有卡片</h3>' +
        '<p class="small muted" style="margin:0 0 14px">换一个范围，或选择其他卡组。</p>' +
        '<div class="row" style="justify-content:center"><button class="btn primary" data-act="cards-scope" data-v="all">看全部</button>' +
        '<button class="btn" data-act="cards-deck" data-v="concept">看核心概念卡</button></div></div>';
      v.innerHTML = h; return;
    }

    if (cs.idx >= total) {
      h += '<div class="card" style="text-align:center;padding:38px 20px">' +
        '<h3 style="font-family:var(--serif);margin:0 0 4px">这一轮完成</h3>' +
        '<p class="small muted">' + esc(deck.name) + ' · 共 ' + total + ' 张 · 记住 <b class="mono">' + cs.tally[2] + '</b> · 模糊 <b class="mono">' + cs.tally[1] + '</b> · 忘记 <b class="mono">' + cs.tally[0] + '</b></p>' +
        '<div class="row" style="justify-content:center;margin-top:14px">' +
        '<button class="btn primary" data-act="cards-again">再来一轮</button>' +
        '<button class="btn" data-act="cards-deck" data-v="concept">去背概念卡</button>' +
        '<button class="btn" data-act="go-route" data-route="bank">去做题</button></div></div>';
      v.innerHTML = h; return;
    }

    const it = cs.ids[cs.idx];
    const fl = cs.flipped;
    const remain = total - cs.idx;

    h += '<div class="flash-wrap">';
    h += '<div class="flash-stage" id="flashStage">' +
      (remain > 2 ? '<div class="flash-ghost g2"></div>' : '') +
      (remain > 1 ? '<div class="flash-ghost g1"></div>' : '') +
      '<div class="flash-card ' + (fl ? 'flipped' : '') + '" id="flashCard">';

    if (!fl) {
      h += '<div class="flash-face front">' +
        '<div class="row" style="justify-content:space-between"><span class="chip accent">' + esc(deck.name) + '</span>' +
        '<span class="mono small muted">' + esc(it.code) + '</span></div>' +
        '<div class="flash-title">' + esc(it.front) + '</div>' +
        (it.en ? '<div class="flash-en mono">' + esc(it.en) + '</div>' : '') +
        '<div class="flash-hint">轻点翻面 · 左滑忘记 / 右滑记住 / 上滑模糊</div>' +
        '<div class="flash-meta">' + esc(it.tag) + ' · ' + (it.kind === 'c' ? '掌握度 ' + App.MASTERY_LABEL[App.mastery(it.id)] : '真题名词解释') + '</div></div>';
    } else {
      h += '<div class="flash-face back">' +
        '<div class="row" style="justify-content:space-between"><span class="chip">' + esc(it.front) + '</span>' +
        '<span class="mono small muted">' + esc(it.code) + '</span></div>' +
        '<div class="fb-def">' + esc(it.def || '（暂无参考答案）') + '</div>' +
        (it.points && it.points.length ? '<ul class="fb-points">' + it.points.slice(0, 5).map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') +
        (it.pitfalls && it.pitfalls.length ? '<div class="fb-pit">易错：' + esc(it.pitfalls[0]) + '</div>' : '') +
        '<div class="fb-src">' + esc(it.src || '') +
        (function () {
          const st = stateOf(it.key);
          if (!st || !st.due) return '';
          const d = U.diffDays(U.today(), st.due);
          return ' · 下次复习 ' + (d > 0 ? d + ' 天后' : '今天');
        })() + '</div></div>';
    }
    h += '</div></div>';

    h += '<div class="flash-side">' +
      '<div class="flash-count"><b class="mono">' + (cs.idx + 1) + '</b><span>/ ' + total + '</span></div>' +
      '<div class="progress"><i style="width:' + U.pct(cs.idx, total) + '%"></i></div>' +
      '<div class="flash-legend"><span><i class="lg lg0"></i>忘记 1</span><span><i class="lg lg1"></i>模糊 2</span><span><i class="lg lg2"></i>记住 3</span></div>' +
      '<button class="btn sm" data-act="cards-flip">翻面 / 返回题面</button>' +
      '<button class="btn sm" data-act="cards-open">' + (it.kind === 'c' ? '打开知识卡' : '查看题目') + '</button>' +
      '</div></div>';

    h += '<div class="flash-actions">' +
      '<button class="fbtn f0" data-act="cards-grade" data-g="0">忘记<span>1</span></button>' +
      '<button class="fbtn f1" data-act="cards-grade" data-g="1">模糊<span>2</span></button>' +
      '<button class="fbtn f2" data-act="cards-grade" data-g="2">记住<span>3</span></button>' +
      '</div>';

    h += '<p class="small muted" style="text-align:center;margin-top:10px">每日新卡上限 ' + (s.dailyNew || 10) + ' 张，可在“错题与复习 → 设置”调整。</p>';

    v.innerHTML = h;
    bindSwipe();
  }

  function current() {
    const cs = App.cardsState;
    return cs.ids[cs.idx];
  }

  function grade(g) {
    const cs = App.cardsState;
    const it = current();
    if (!it) return;
    if (it.kind === 'c') {
      const st = App.store.get();
      const cur = st.mastery[it.id] || 0;
      st.mastery[it.id] = g === 2 ? Math.max(cur, 2) : (g === 0 ? Math.min(cur, 1) : 1);
      st.lastChapter = D.byCid[it.id].ch;
      App.store.save();
    }
    App.schedule(it.key, g);
    App.store.save();
    cs.tally[g] = (cs.tally[g] || 0) + 1;
    if (g === 0) App.toast('已排入明日复习');
    cs.idx++;
    cs.flipped = false;
    App.render();
  }

  function flip() {
    App.cardsState.flipped = !App.cardsState.flipped;
    App.render();
  }

  let sx = 0, sy = 0, dragging = false, dx = 0, dy = 0, card = null;
  function bindSwipe() {
    card = $('#flashCard');
    if (!card) return;
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      dragging = true; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
      card.classList.add('dragging');
      card.setPointerCapture && card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', e => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      card.style.transform = 'translate(' + dx + 'px,' + Math.min(0, dy) * 0.35 + 'px) rotate(' + (dx / 26) + 'deg)';
      card.style.opacity = String(Math.max(0.55, 1 - Math.abs(dx) / 460));
    });
    card.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false; card.classList.remove('dragging');
      card.style.transform = ''; card.style.opacity = '';
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { flip(); return; }
      if (dx > 90) grade(2);
      else if (dx < -90) grade(0);
      else if (dy < -90) grade(1);
    });
    card.addEventListener('pointercancel', () => {
      dragging = false; card.classList.remove('dragging');
      card.style.transform = ''; card.style.opacity = '';
    });
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'cards-list') { App.openCardList(); return; }
    if (act === 'cards-list-set') {
      const v = +t.dataset.v, kind = t.dataset.kind, id = t.dataset.id, key = t.dataset.key;
      setCardMastery({ kind: kind, id: id, key: key }, v);
      const row = t.closest('tr');
      if (row) row.querySelectorAll('.mlv').forEach(b => b.classList.toggle('on', +b.dataset.v === v));
      if (row) row.dataset.m = String(v);
      App.applyCardFilter();
      return;
    }
    if (act === 'cards-deck') { App.cardsState.ids = []; restart(t.dataset.v, 'all'); return; }
    if (act === 'cards-scope') { restart(App.cardsState.deck, t.dataset.v); return; }
    if (act === 'cards-flip') { flip(); return; }
    if (act === 'cards-grade') { grade(+t.dataset.g); return; }
    if (act === 'cards-shuffle') {
      const cs = App.cardsState;
      cs.ids = cs.ids.slice(0, cs.idx).concat(shuffle(cs.ids.slice(cs.idx)));
      App.render(); return;
    }
    if (act === 'cards-open') {
      const it = current();
      if (!it) return;
      if (it.kind === 'c') App.openConcept(it.id);
      else { App.qUI = {}; App.bankState.session = { ids: [it.qid], idx: 0, t0: Date.now(), answers: {} }; App.go('bank'); }
      return;
    }
    if (act === 'cards-again') { restart(App.cardsState.deck, App.cardsState.scope); return; }
    if (act === 'go-route') { App.go(t.dataset.route); return; }
  });

  document.addEventListener('change', function (e) {
    if (e.target && (e.target.classList.contains('cl-deck') || e.target.classList.contains('cl-m'))) App.applyCardFilter();
  });

  document.addEventListener('keydown', function (e) {
    if (App.route.name !== 'cards') return;
    if (document.body.classList.contains('panel-open')) return;
    if (!$('#modal').hidden) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); flip(); }
    else if (e.key === '1') { e.preventDefault(); grade(0); }
    else if (e.key === '2') { e.preventDefault(); grade(1); }
    else if (e.key === '3') { e.preventDefault(); grade(2); }
  });
})();
