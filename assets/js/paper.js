/* ============ 套卷模考 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, esc = U.esc, D = App.data;
  App.paperState = App.paperState || { pid: null };

  const TYPE_LABEL = { '名词解释': '名词解释', '选择': '选择题', '判断': '判断题', '填空': '填空题', '简答': '简答题', '论述': '论述题', '材料': '材料题' };
  const SELF_TYPES = ['填空', '名词解释', '简答', '论述', '材料'];

  function localDay(iso) {
    const d = new Date(iso || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function session() { return App.store.get().paperSession; }
  function saveSession(s) {
    const st = App.store.get();
    st.paperSession = s;
    st.paperDone = st.paperDone || {};
    Object.keys(s.answers || {}).forEach(qid => {
      const a = s.answers[qid];
      if (a && (a.pick || (a.text && a.text.trim())) && !st.paperDone[qid]) {
        st.paperDone[qid] = { at: new Date().toISOString(), pid: s.pid };
      }
    });
    App.store.save();
  }

  function paperQs(p) {
    const ids = [];
    p.sections.forEach(s => s.ids.forEach(id => ids.push(id)));
    return ids.map(id => D.byQid[id]).filter(Boolean);
  }
  function scoreOf(p, q) {
    for (const s of p.sections) if (s.ids.indexOf(q.id) >= 0) return (s.score && s.score[q.type]) || q.score || 2;
    return q.score || 2;
  }

  /* ---------------- 视图入口 ---------------- */
  App.view_paper = function (v, param) {
    const s = session();
    if (s && s.paperDef && !D.byPaper[s.pid]) D.byPaper[s.pid] = s.paperDef;
    if (param === 'resume' && s && !s.submitted) {
      App.paperState.pid = s.pid;
      renderExam(v);
      return;
    }
    if (param && D.byPaper[param]) { App.paperState.pid = param; renderDetail(v, param); return; }
    renderList(v);
  };

  function renderList(v) {
    const s = session();
    const records = App.store.get().paperRecords || [];
    let h = '<h1 class="page-title">套卷模考</h1><p class="page-sub">按年份做整套卷：答题卡、倒计时、交卷判分与主观题自评。缺题、缺答案的年份标为“部分试卷”，不会冒充完整卷。</p>';

    if (s && !s.submitted) {
      const p = D.byPaper[s.pid];
      h += '<div class="callout warn" style="display:flex;align-items:center;gap:12px;justify-content:space-between">' +
        '<span>有一场未交卷的考试：<b>' + esc(p ? p.title : s.pid) + '</b>，已答 ' + Object.keys(s.answers).length + '/' + s.ids.length + ' 题。</span>' +
        '<button class="btn primary sm" data-act="resume-paper">继续考试</button></div>';
    }

    h += '<div class="paper-card custom-card" data-act="custom-open"><b>＋ 自定义组卷</b>' +
      '<div class="pc-meta">按章节、题型、题量与时长生成一份练习卷</div>' +
      '<div class="pc-go">设置条件 →</div></div>';

    const groups = [{ name: '846 考研真题', list: D.papers.filter(p => p.source !== '校内期末') },
                    { name: '校内期末卷', list: D.papers.filter(p => p.source === '校内期末') }];
    groups.forEach(g => {
      if (!g.list.length) return;
      h += '<h2 class="sec"><span class="num">' + (g.name === '校内期末卷' ? 'B' : 'A') + '</span>' + g.name + '</h2>';
      h += '<div class="grid g3">' + g.list.map(p => {
        const lv = p.level.indexOf('完整') === 0 ? 'ok' : (p.level.indexOf('基本完整') === 0 || p.level.indexOf('回忆') === 0) ? 'accent' : 'warn';
        return '<div class="paper-card" data-act="open-paper" data-pid="' + p.id + '">' +
          '<div class="row" style="margin-bottom:6px"><span class="chip ' + lv + '">' + esc(p.level) + '</span>' +
          '<span class="chip">' + esc(p.version) + '</span></div>' +
          '<b>' + esc(p.title) + '</b>' +
          '<div class="pc-meta">' + p.have + ' / ' + p.want + ' 题 · ' + p.duration + ' 分钟' + (p.total ? ' · ' + p.total + ' 分' : '') + '</div>' +
          '<div class="progress" style="margin-top:8px"><i style="width:' + U.pct(p.have, p.want) + '%"></i></div>' +
          '<div class="pc-go">进入试卷 →</div></div>';
      }).join('') + '</div>';
    });

    if (records.length) {
      h += '<h2 class="sec"><span class="num">C</span>成绩记录</h2><div class="card" style="padding:8px 14px">' +
        records.slice().reverse().slice(0, 8).map(r => {
          const p = D.byPaper[r.pid];
          return '<div class="spread" style="padding:7px 0;border-bottom:1px dashed var(--line-2)">' +
            '<span>' + esc(p ? p.title : (r.title || r.pid)) + '<span class="small muted"> · ' + esc(localDay(r.at)) + '</span></span>' +
            '<span class="mono">' + r.score + ' / ' + r.max + ' 分<span class="small muted">（客观 ' + r.objective + ' + 自评 ' + r.self + '）</span></span></div>';
        }).join('') + '</div>';
    }

    h += '<div class="callout"><b>计分说明：</b>客观题自动判分；填空题与主观题在交卷后由你按参考答案自评（0 / 半分 / 满分）。标“冲突”的题不参与自动判分，避免把存疑答案算成你的错。</div>';
    v.innerHTML = h;
  }

  function renderDetail(v, pid) {
    const p = D.byPaper[pid];
    const qs = paperQs(p);
    const rec = (App.store.get().paperRecords || []).filter(r => r.pid === pid).slice(-1)[0];
    const maxAll = p.sections.reduce((sum, s) => sum + s.ids.reduce((a, id) => a + (D.byQid[id] ? scoreOf(p, D.byQid[id]) : 0), 0), 0);
    let h = '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="paper-back">← 返回套卷列表</button></div>';
    h += '<h1 class="page-title">' + esc(p.title) + '</h1>' +
      '<p class="page-sub">' + esc(p.note) + '</p>';
    h += '<div class="grid g4" style="margin-bottom:16px">' +
      '<div class="tile"><h4>题量</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink)">' + p.have + ' / ' + p.want + '</p><span class="small muted">已整理 / 原卷' + (p.total ? '' : ' · 按题库 ' + maxAll + ' 分') + '</span></div>' +
      '<div class="tile"><h4>时长与满分</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink)">' + p.duration + ' 分钟</p><span class="small muted">' + esc(p.totalNote) + '</span></div>' +
      '<div class="tile"><h4>完整度</h4><p style="font-size:15px;color:var(--ink)">' + esc(p.level) + '</p><span class="small muted">' + (p.want - p.have > 0 ? '缺 ' + (p.want - p.have) + ' 题' : p.level === '完整' ? '题量与答案齐备' : '题量齐，质量限制见说明') + '</span></div>' +
      '<div class="tile"><h4>上次成绩</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink)">' + (rec ? rec.score + ' / ' + rec.max : '—') + '</p><span class="small muted">' + (rec ? esc(App.localDay(rec.at)) : '尚未交卷') + '</span></div>' +
      '</div>';

    h += '<div class="card"><h3 class="sub" style="margin-top:0">卷面结构</h3>' +
      p.sections.map(s => {
        const miss = s.want - s.ids.length;
        return '<div class="spread" style="padding:7px 0;border-bottom:1px dashed var(--line-2)">' +
          '<span>' + esc(s.name) + '<span class="small muted"> · ' + s.ids.length + ' 题' + (miss > 0 ? '（缺 ' + miss + '）' : '') + '</span></span>' +
          '<span class="small mono muted">共 ' + s.ids.reduce((a, id) => a + (D.byQid[id] ? scoreOf(p, D.byQid[id]) : 0), 0) + ' 分</span></div>';
      }).join('') +
      '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="start-paper" data-pid="' + p.id + '">' + (rec ? '再考一次' : '开始整卷') + '</button>' +
      '<button class="btn" data-act="preview-paper" data-pid="' + p.id + '">先看题目清单</button>' +
      '<span class="small muted">交卷后可在结果页逐题自评</span></div></div>';

    const qsAll = paperQs(p);
    const pending = qsAll.filter(q => q.status === '冲突' || q.status === '待核').length;
    const gaps = p.sections.filter(s => s.want > s.ids.length).map(s => s.name + ' 缺 ' + (s.want - s.ids.length) + ' 题');
    h += '<div class="callout">' + (gaps.length ? '<b>缺口：</b>' + esc(gaps.join('；')) + '。缺口来自初版未逐题录入或原资料缺题/答案不全，未用生成题冒充原卷。' : '本卷题量与答案齐备。') +
      (p.cloneIds && p.cloneIds.length ? ' 含 ' + p.cloneIds.length + ' 道跨年同题补录，已在题目上标注“同题跨年”。' : '') +
      (pending ? ' 另有 ' + pending + ' 题答案待核或存在冲突，交卷时不计分。' : '') + '</div>';
    v.innerHTML = h;
  }

  /* ---------------- 开考 ---------------- */
  function startPaper(pid) {
    const p = D.byPaper[pid];
    const old = session();
    if (old && !old.submitted && old.pid !== pid && !confirm('还有一场未交卷的考试，开始新考试将放弃它的作答。继续？')) return;
    const ids = paperQs(p).map(q => q.id);
    const s = { pid: pid, ids: ids, idx: 0, answers: {}, flags: {}, left: p.duration * 60, startedAt: Date.now(), submitted: false, scores: {} };
    saveSession(s);
    App.paperState.pid = pid;
    App.go('paper', 'resume');
  }
  App.startPaper = startPaper;

  /* ---------------- 考试 ---------------- */
  let timer = null;
  function renderExam(v) {
    const s = session(), p = D.byPaper[s.pid];
    if (!p) { App.store.get().paperSession = null; App.store.save(); renderList(v); return; }
    const q = D.byQid[s.ids[s.idx]];
    const answered = Object.keys(s.answers).filter(k => {
      const a = s.answers[k]; return a && (a.pick || (a.text && a.text.trim()));
    }).length;

    let h = '<div class="exam-bar">' +
      '<span class="chip accent">' + esc(p.title) + '</span>' +
      '<span class="mono small">' + (s.idx + 1) + ' / ' + s.ids.length + '</span>' +
      '<div class="pbar"><i style="width:' + U.pct(answered, s.ids.length) + '%"></i></div>' +
      '<span class="timer" id="paperTimer">' + fmt(s.left) + '</span>' +
      '<button class="btn sm" data-act="paper-sheet">答题卡</button>' +
      '<button class="btn sm primary" data-act="paper-submit">交卷</button></div>';

    h += '<div class="paper-body"><div class="paper-q">' + examQuestion(p, q, s) + '</div>' +
      '<aside class="paper-side">' + miniSheet(s) +
      '<div class="small muted" style="margin-top:10px">已作答 ' + answered + ' / ' + s.ids.length + '；标记 ' + Object.keys(s.flags || {}).length + ' 题。</div>' +
      '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="paper-prev"' + (s.idx === 0 ? ' disabled' : '') + '>上一题</button>' +
      '<button class="btn sm primary" data-act="paper-next">' + (s.idx >= s.ids.length - 1 ? '最后一题' : '下一题') + '</button></div>' +
      '</aside></div>';

    v.innerHTML = h;
    startTimer();
  }

  function examQuestion(p, q, s) {
    const a = s.answers[q.id] || {};
    const score = scoreOf(p, q);
    let h = '<div class="q-hd"><span class="no">第 ' + (q.no || (s.idx + 1)) + ' 题</span>' +
      '<span class="chip">' + esc(q.type) + '</span><span class="chip">' + score + ' 分</span>' +
      (q.cloneOf ? '<span class="chip blue tiny">同题跨年</span>' : '') +
      '<button class="btn sm ' + (s.flags && s.flags[q.id] ? 'on' : '') + '" style="margin-left:auto" data-act="exam-flag" data-qid="' + q.id + '">' + (s.flags && s.flags[q.id] ? '已标记' : '标记') + '</button></div>';
    h += '<div class="q-stem">' + esc(q.stem) + '</div>';
    if (q.material) h += '<div class="material">' + esc(q.material) + '</div>';
    if (q.options && q.options.length) {
      const keys = q.type === '判断' ? ['T', 'F'] : q.options.map((_, i) => 'ABCDE'[i]);
      const multi = q.multi || (q.correct || '').length > 1;
      h += '<div class="opts">' + q.options.map((o, i) => {
        const k = keys[i];
        const sel = multi ? (a.pick || '').indexOf(k) >= 0 : a.pick === k;
        return '<button class="opt ' + (sel ? 'sel' : '') + '" data-act="exam-pick" data-qid="' + q.id + '" data-k="' + k + '">' +
          '<span class="k">' + k + '</span><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>';
      if (multi) h += '<div class="small muted">多选题：可选择多个选项</div>';
    } else {
      h += '<div style="margin-top:10px"><div class="small muted" style="margin-bottom:4px">作答区（自动保存）</div>' +
        '<textarea class="note-area exam-input" data-act="exam-input" data-qid="' + q.id + '" placeholder="' + (q.type === '填空' ? '按空依次填写，用分号隔开…' : '按“定义—要点—例子”的顺序作答…') + '">' + esc(a.text || '') + '</textarea></div>';
    }
    return h;
  }

  function miniSheet(s) {
    return '<div class="sheet">' + s.ids.map((id, i) => {
      const a = s.answers[id] || {};
      const done = a.pick || (a.text && a.text.trim());
      const cls = i === s.idx ? 'cur' : (done ? 'done' : '');
      return '<a class="' + cls + (s.flags && s.flags[id] ? ' flag' : '') + '" data-act="paper-jump" data-i="' + i + '">' + (i + 1) + '</a>';
    }).join('') + '</div>';
  }

  /* ---------------- 计时 ---------------- */
  function startTimer() {
    if (timer) clearInterval(timer);
    const s = session();
    if (!s) return;
    let tick = 0;
    timer = setInterval(() => {
      const cur = session();
      if (!cur || cur.submitted) { clearInterval(timer); return; }
      if (App.route.name !== 'paper') return; // 离开考试页时暂停
      cur.left = Math.max(0, cur.left - 1);
      const el = $('#paperTimer');
      if (el) el.textContent = fmt(cur.left);
      tick++;
      if (tick % 10 === 0) { App.store.get().paperSession = cur; App.store.save(); }
      if (cur.left <= 0) { clearInterval(timer); App.toast('考试时间到，已自动交卷'); doSubmit(true); }
    }, 1000);
  }
  function fmt(sec) {
    sec = Math.max(0, sec | 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  /* ---------------- 交卷与结果 ---------------- */
  function doSubmit(auto) {
    const s = session(); if (!s || s.submitted) return;
    const ta = $('.exam-input');
    if (ta && ta.dataset.qid) {
      s.answers[ta.dataset.qid] = Object.assign({}, s.answers[ta.dataset.qid], { text: ta.value });
      saveSession(s);
    }
    if (!auto) {
      const unanswered = s.ids.filter(id => { const a = s.answers[id]; return !(a && (a.pick || (a.text && a.text.trim()))); }).length;
      if (!confirm('确定交卷？' + (unanswered ? '还有 ' + unanswered + ' 题未作答。' : '所有题目均已作答。'))) return;
    }
    if (timer) clearInterval(timer);
    s.submitted = true; s.submitAt = Date.now(); s.archived = false;
    saveSession(s);
    App.paperState.pid = s.pid;
    App.route = { name: 'paper', param: null };
    App.render();
  }

  function renderResult(v) {
    const s = session(), p = D.byPaper[s.pid];
    if (!p) { renderList(v); return; }
    const list = paperQs(p);
    let obj = 0, self = 0, max = 0, right = 0, objN = 0, ungraded = 0;
    list.forEach(q => {
      const sc = scoreOf(p, q);
      const r = judge(p, q, s);
      if (r.kind === 'ungraded') { ungraded++; return; }
      max += sc;
      if (r.kind === 'obj') { objN++; if (r.ok) { obj += sc; right++; } }
      else { self += (s.scores[q.id] || 0) * sc; }
    });
    const used = s.submitAt ? Math.round((s.submitAt - s.startedAt) / 60000) : 0;

    let h = '<div class="result-hero"><div><span class="chip accent">' + esc(p.title) + '</span>' +
      '<h1>' + Math.round(obj + self) + '<span class="small muted"> / ' + Math.round(max) + ' 分</span></h1>' +
      '<p class="small">客观题 ' + Math.round(obj) + ' 分 · 自评 ' + Math.round(self) + ' 分 · 用时约 ' + used + ' 分钟' +
      (ungraded ? ' · ' + ungraded + ' 题因答案存疑不计分' : '') + '</p></div>' +
      '<div class="result-nums"><b>' + (objN ? Math.round(right / objN * 100) : 0) + '%</b><span>客观题正确率</span></div></div>';

    h += '<div class="callout warn">主观题得分需要你逐题自评：对照参考答案，选择 0 / 半分 / 满分。自评不是“看起来像”，而是核对要点是否覆盖。</div>';

    list.forEach((q, i) => {
      const r = judge(p, q, s);
      const a = s.answers[q.id] || {};
      const sc = scoreOf(p, q);
      const badge = r.kind === 'obj' ? (r.ok ? '<span class="chip ok">正确</span>' : '<span class="chip danger">错误</span>')
        : r.kind === 'ungraded' ? '<span class="chip warn">答案存疑·不计分</span>'
          : '<span class="chip ' + (s.scores[q.id] >= 1 ? 'ok' : s.scores[q.id] > 0 ? 'accent' : '') + '">自评 ' + Math.round((s.scores[q.id] || 0) * sc) + ' / ' + sc + '</span>';
      h += '<div class="q-card"><div class="q-hd"><span class="no">' + (i + 1) + '</span>' +
        '<span class="chip">' + esc(q.type) + '</span>' + badge +
        (q.cloneOf ? '<span class="chip blue tiny">同题跨年</span>' : '') + '</div>' +
        '<div class="q-stem">' + esc(q.stem) + '</div>';
      if (q.options && q.options.length) {
        const keys = q.type === '判断' ? ['T', 'F'] : q.options.map((_, k) => 'ABCDE'[k]);
        h += '<div class="opts' + (r.kind === 'obj' ? '' : ' plain') + '">' + q.options.map((o, k) => {
          const key = keys[k];
          let cls = 'opt';
          if (r.kind === 'obj') {
            if ((q.correct || '').indexOf(key) >= 0) cls += ' right';
            else if ((a.pick || '').indexOf(key) >= 0) cls += ' wrong';
          } else if (a.pick === key) cls += ' sel';
          return '<span class="' + cls + '" style="cursor:default"><span class="k">' + key + '</span><span>' + esc(o) + '</span></span>';
        }).join('') + '</div>';
      }
      if (!q.options || !q.options.length) {
        h += '<div class="ans-compare"><div><div class="small muted">你的作答</div><div class="ans-block">' + (a.text ? esc(a.text) : '<span class="muted">未作答</span>') + '</div></div>' +
          '<div><div class="small muted">' + App.answerLabel(q) + '</div><div class="ans-block">' +
          (q.answer ? esc(q.answer) : '<span class="muted">' + (q.source === '生成自测' ? '本页自拟题，原资料无对应题' : '资料未提供文字答案') + '</span>') +
          '</div></div></div>';
        if (q.points && q.points.length) {
          h += '<div class="small muted" style="margin-top:8px">' + App.pointsLabel(q) + '</div>' +
            '<ol class="ans-block pts">' + q.points.slice(0, 10).map(p => '<li>' + esc(p) + '</li>').join('') + '</ol>';
        }
      }
      if (q.options && q.options.length && r.kind !== 'obj') {
        h += '<div class="small muted" style="margin-top:6px">参考答案：' + esc(q.answer || '—') + '</div>';
      }
      if (SELF_TYPES.indexOf(q.type) >= 0) {
        h += '<div class="row" style="margin-top:8px"><span class="small muted">自评得分：</span>' +
          [['0', 0], ['半分', 0.5], ['满分', 1]].map(x => '<button class="btn sm ' + ((s.scores[q.id] || 0) === x[1] ? 'on' : '') + '" data-act="paper-score" data-qid="' + q.id + '" data-v="' + x[1] + '">' + x[0] + '</button>').join('') +
          '<span class="small muted">' + Math.round((s.scores[q.id] || 0) * sc) + ' / ' + sc + ' 分</span></div>';
      }
      if (q.statusNote) h += '<div class="q-meta-note">' + esc(q.statusNote) + '</div>';
      h += '</div>';
    });

    h += '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="paper-save">保存成绩</button>' +
      '<button class="btn" data-act="paper-again" data-pid="' + p.id + '">再考一次</button>' +
      '<button class="btn" data-act="paper-exit">返回套卷列表</button></div>';
    v.innerHTML = h;
  }

  function judge(p, q, s) {
    const a = s.answers[q.id] || {};
    if (q.grade === 'auto' && q.correct) {
      const pick = a.pick || '';
      const ok = pick && pick.split('').sort().join('') === q.correct.split('').sort().join('');
      return { kind: 'obj', ok: !!ok };
    }
    if (SELF_TYPES.indexOf(q.type) >= 0) return { kind: 'self' };
    return { kind: 'ungraded' };
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const s = session();

    if (act === 'open-paper') { App.go('paper', t.dataset.pid); return; }
    if (act === 'paper-exit') {
      if (s && s.submitted) { s.archived = true; saveSession(s); }
      App.paperState.pid = null; App.go('paper'); return;
    }
    if (act === 'custom-open') {
      App.modal('<div class="modal-pad" style="min-width:min(460px,90vw)"><h3>自定义组卷</h3>' +
        '<p class="small muted">从题库按条件抽题，生成一份可计时、可交卷、可自评的练习卷。不是原卷，不参与套卷完整度统计。</p>' +
        '<div class="calc" style="grid-template-columns:1fr 1fr">' +
        '<div><label>章节</label><select id="csCh" class="f" style="width:100%"><option value="">全部章节</option>' +
        D.chapters.map(c => '<option value="' + c.id + '">第' + c.id + '章 ' + esc(c.short) + '</option>').join('') + '</select></div>' +
        '<div><label>题量</label><select id="csN" class="f" style="width:100%"><option>10</option><option selected>15</option><option>20</option><option>30</option></select></div>' +
        '<div><label>时长（分钟）</label><select id="csT" class="f" style="width:100%"><option>30</option><option selected>45</option><option>60</option><option>90</option></select></div>' +
        '<div><label>范围</label><select id="csS" class="f" style="width:100%"><option value="">全部题库</option><option value="846真题">只要 846 真题</option><option value="校内期末">只要期末题</option></select></div>' +
        '</div><div class="row" style="margin-top:14px"><button class="btn primary" data-act="custom-start">生成并开始</button>' +
        '<span class="small muted">只抽有答案或可自评的题</span></div></div>');
      return;
    }
    if (act === 'custom-start') {
      const ch = $('#csCh').value, n = +$('#csN').value, t = +$('#csT').value, src = $('#csS').value;
      let pool = D.questions.filter(q => (!ch || String(q.ch) === ch) && (!src || q.source === src));
      pool = pool.filter(q => q.grade !== 'none' || q.answer);
      if (!pool.length) { App.toast('该条件下没有可用题目'); return; }
      const picked = [];
      const byType = {};
      pool.forEach(q => (byType[q.type] = byType[q.type] || []).push(q));
      const order = ['名词解释', '选择', '判断', '填空', '简答', '论述', '材料'];
      let i = 0;
      while (picked.length < Math.min(n, pool.length)) {
        let added = false;
        order.forEach(tp => {
          const arr = byType[tp];
          if (arr && arr.length && picked.length < n) {
            const q = arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
            if (q) { picked.push(q); added = true; }
          }
        });
        if (!added) break;
      }
      const score = { '选择': 2, '判断': 2, '填空': 2, '名词解释': 5, '简答': 10, '论述': 15, '材料': 15 };
      const def = { id: 'custom-' + Date.now(), year: 0, title: '自定义组卷', source: '自组卷',
        version: ch ? '第' + ch + '章' : '全部章节', duration: t, total: null,
        totalNote: '按题型估算分值，非原卷', sections: [{ name: '自组题', types: order, score: score, ids: picked.map(q => q.id), want: picked.length }],
        have: picked.length, want: picked.length, level: '自定义', cloneIds: [],
        note: '按“' + (ch ? '第' + ch + '章' : '全部章节') + ' · ' + (src || '全部题库') + '”生成，共 ' + picked.length + ' 题；不计入原卷统计。' };
      D.byPaper[def.id] = def;
      App.closeModal();
      const old = session();
      if (old && !old.submitted && !confirm('开始新的自组卷将放弃当前未交卷的考试，继续？')) return;
      const sess = { pid: def.id, ids: def.sections[0].ids, idx: 0, answers: {}, flags: {}, left: t * 60, startedAt: Date.now(), submitted: false, scores: {}, paperDef: def };
      saveSession(sess);
      App.route = { name: 'paper', param: 'resume' };
      App.render();
      return;
    }
    if (act === 'paper-back') { App.paperState.pid = null; App.go('paper'); return; }
    if (act === 'start-paper') {
      const p = D.byPaper[t.dataset.pid];
      if (p.have < p.want && !confirm('该卷仍缺 ' + (p.want - p.have) + ' 题（' + p.level + '），是否继续？')) return;
      startPaper(t.dataset.pid); return;
    }
    if (act === 'preview-paper') {
      const p = D.byPaper[t.dataset.pid];
      const qs = paperQs(p);
      App.modal('<div class="modal-pad"><h3>' + esc(p.title) + ' · 题目清单</h3>' +
        '<p class="small muted">共 ' + qs.length + ' 题，按卷面顺序排列。</p>' +
        qs.map((q, i) => '<div class="q-link" style="margin-bottom:4px"><span class="y">' + (i + 1) + '</span><span class="t">' + esc(q.stem) + '</span><span class="chip tiny">' + esc(q.type) + '</span></div>').join('') +
        '<div class="row" style="margin-top:12px"><button class="btn primary" data-act="start-paper" data-pid="' + p.id + '">开始整卷</button></div></div>');
      return;
    }
    if (act === 'resume-paper') { App.go('paper', 'resume'); return; }

    if (!s) return;

    if (act === 'exam-pick') {
      const qid = t.dataset.qid, k = t.dataset.k, q = D.byQid[qid];
      const multi = q.multi || (q.correct || '').length > 1;
      const cur = s.answers[qid] || {};
      if (multi) {
        const arr = (cur.pick || '').split('');
        const i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else arr.push(k);
        cur.pick = arr.sort().join('');
      } else cur.pick = k;
      s.answers[qid] = cur; saveSession(s); App.render();
      return;
    }
    if (act === 'exam-flag') {
      s.flags = s.flags || {};
      if (s.flags[t.dataset.qid]) delete s.flags[t.dataset.qid]; else s.flags[t.dataset.qid] = 1;
      saveSession(s); App.render(); return;
    }
    if (act === 'paper-prev') { s.idx = Math.max(0, s.idx - 1); saveSession(s); App.render(); return; }
    if (act === 'paper-next') { s.idx = Math.min(s.ids.length - 1, s.idx + 1); saveSession(s); App.render(); return; }
    if (act === 'paper-jump') { s.idx = +t.dataset.i; saveSession(s); App.closeModal(); App.render(); return; }
    if (act === 'paper-sheet') {
      App.modal('<div class="modal-pad"><h3>答题卡</h3><p class="small muted">绿＝已作答，圆点＝已标记，粗框＝当前题。点击跳转。</p>' +
        '<div class="sheet">' + s.ids.map((id, i) => {
          const a = s.answers[id] || {}; const done = a.pick || (a.text && a.text.trim());
          return '<a class="' + (i === s.idx ? 'cur' : done ? 'done' : '') + (s.flags && s.flags[id] ? ' flag' : '') + '" data-act="paper-jump" data-i="' + i + '">' + (i + 1) + '</a>';
        }).join('') + '</div></div>');
      return;
    }
    if (act === 'paper-submit') { doSubmit(false); return; }
    if (act === 'paper-score') {
      s.scores[t.dataset.qid] = +t.dataset.v; saveSession(s); App.render(); return;
    }
    if (act === 'paper-save') {
      const p = D.byPaper[s.pid];
      const list = paperQs(p);
      let obj = 0, self = 0, max = 0;
      list.forEach(q => { const sc = scoreOf(p, q); const r = judge(p, q, s); if (r.kind === 'ungraded') return; max += sc; if (r.kind === 'obj') { if (r.ok) obj += sc; } else if (r.kind === 'self') self += (s.scores[q.id] || 0) * sc; });
      const rec = { pid: s.pid, title: p.title, at: new Date().toISOString(), score: Math.round(obj + self), max: Math.round(max), objective: Math.round(obj), self: Math.round(self) };
      App.store.get().paperRecords.push(rec);
      App.store.get().paperSession = null;
      App.store.save();
      App.toast('成绩已保存');
      App.go('paper');
      return;
    }
    if (act === 'paper-again') { startPaper(t.dataset.pid); return; }
  });

  document.addEventListener('input', U.debounce(function (e) {
    const t = e.target;
    if (!t.dataset || t.dataset.act !== 'exam-input') return;
    const s = session(); if (!s || s.submitted) return;
    const qid = t.dataset.qid;
    s.answers[qid] = Object.assign({}, s.answers[qid], { text: t.value });
    saveSession(s);
    const bar = document.querySelector('.exam-bar .pbar i');
    if (bar) {
      const answered = Object.keys(s.answers).filter(k => { const a = s.answers[k]; return a && (a.pick || (a.text && a.text.trim())); }).length;
      bar.style.width = U.pct(answered, s.ids.length) + '%';
    }
  }, 300));

  // 结果页
  const origRender = App.render;
  App.render = function () {
    const s = session();
    if (App.route.name === 'paper' && s && s.submitted && !s.archived && !App.route.param) {
      if (s.paperDef && !D.byPaper[s.pid]) D.byPaper[s.pid] = s.paperDef;
      const v = $('#view');
      $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.route === 'paper'));
      $('#crumb').innerHTML = '<b>套卷模考</b><span class="sep">/</span>成绩与自评';
      renderResult(v);
      App.updateBadges();
      $('#rail').classList.remove('open');
      return;
    }
    return origRender.apply(this, arguments);
  };
})();
