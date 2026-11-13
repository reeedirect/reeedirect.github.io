/* ============ 题库训练 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, esc = U.esc, D = App.data;
  const TYPE_ORDER = ['名词解释', '选择', '判断', '填空', '简答', '论述', '材料'];

  App.qUI = {}; // qid -> {pick, sub, lvl}

  function years() {
    return U.uniq(D.questions.map(q => q.year).filter(y => y)).sort();
  }

  function filtered() {
    const st = App.bankState, s = App.store.get();
    return D.questions.filter(q => {
      if (st.year && String(q.year) !== String(st.year)) return false;
      if (st.ch && String(q.ch) !== String(st.ch)) return false;
      if (st.type && q.type !== st.type) return false;
      if (st.source && q.source !== st.source) return false;
      if (st.status && q.status !== st.status) return false;
      if (st.concept && (q.concepts || []).indexOf(st.concept) < 0) return false;
      if (st.done) {
        const a = s.attempts[q.id];
        if (st.done === 'todo' && a) return false;
        if (st.done === 'ok' && !(a && a.ok)) return false;
        if (st.done === 'bad' && !(a && !a.ok)) return false;
      }
      if (st.q) {
        const k = st.q.toLowerCase();
        const hay = [q.stem, q.answer, q.explain, (q.options || []).join(' '), (q.material || '')].join(' ').toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    }).sort((a, b) => ((a.year || 9999) - (b.year || 9999)) || (a.id > b.id ? 1 : -1));
  }

  App.view_bank = function (v, param) {
    const st = App.bankState;
    if (!st.session && !st.restored) {
      const saved = App.store.get().bankSession;
      if (saved && saved.ids && saved.ids.length && saved.ids.every(id => D.byQid[id]) && saved.idx >= 0 && saved.idx < saved.ids.length) {
        saved.t0 = Date.now();
        st.session = saved;
      } else if (saved) {
        clearPersist();
      }
      st.restored = true;
    }
    if (param && param.indexOf('concept:') === 0) {
      App.qUI = {};
      st.session = { ids: [param.slice(8)], idx: 0, t0: Date.now(), answers: {} };
      st.concept = '';
    }
    let h = '<h1 class="page-title">题库训练</h1><p class="page-sub">按年份、章节、题型、来源与校核状态筛选。答案默认折叠，按“提示 → 要点 → 完整答案”逐级展开；含冲突或数字待核的题不进入自动判分。</p>';

    h += App.bankFilters();

    if (st.session) { renderSession(v); return; }

    const list = filtered();
    const s = App.store.get();
    const done = list.filter(q => s.attempts[q.id]).length;
    const objs = list.filter(q => (q.type === '选择' || q.type === '判断') && q.grade === 'auto' && s.attempts[q.id]);
    const ok = objs.filter(q => s.attempts[q.id].ok).length;

    const cnt = {};
    list.forEach(q => { cnt[q.source] = (cnt[q.source] || 0) + 1; });
    const parts = ['846真题', '校内期末', '其他高校试题', '资料练习', '生成自测'].filter(k => cnt[k]).map(k => k + ' ' + cnt[k]);
    h += '<div class="stat-line"><span>筛选出 <b>' + list.length + '</b> 题（' + parts.join(' · ') + '）</span>' +
      '<span>已作答 <b>' + done + '</b></span>' +
      '<span>客观题正确率 <b>' + (objs.length ? U.pct(ok, objs.length) + '%' : '—') + '</b></span>' +
      '<span>错题本 <b>' + App.wrongList().length + '</b></span></div>';

    h += '<div class="row" style="margin-bottom:14px">' +
      '<button class="btn primary" data-act="start-session">' + App.icon('play') + ' 开始练习（最多12题）</button>' +
      '<button class="btn" data-act="start-random">随机 8 题</button>' +
      '<button class="btn" data-act="clear-filter">清除筛选</button>' +
      (st.concept ? '<span class="chip accent">仅看考点：' + esc((D.byCid[st.concept] || {}).name || '') + '</span>' : '') +
      '</div>';

    if (!list.length) {
      h += '<div class="callout">当前条件没有题目。可清除筛选，或到知识地图按考点查看关联题。</div>';
    } else {
      const lim = App.bankState.limit || 60;
      h += list.slice(0, lim).map(q => App.qCard(q)).join('');
      if (list.length > lim) h += '<div class="row" style="justify-content:center;margin:14px 0"><button class="btn" data-act="more-q">再显示 60 题（' + (list.length - lim) + ' 题未显示）</button></div>';
    }
    v.innerHTML = h;
    bindBank(v);
  };

  App.bankFilters = function () {
    const st = App.bankState;
    let h = '<div class="filters">';
    h += '<div class="filter-row">' +
      '<div class="search-box" style="max-width:280px">' + App.icon('search') +
      '<input id="qSearch" placeholder="检索题干、选项、答案…" value="' + esc(st.q) + '"></div>' +
      '<select class="f" data-f="year"><option value="">全部年份</option>' +
      years().map(y => '<option ' + (String(st.year) === String(y) ? 'selected' : '') + '>' + y + '</option>').join('') + '</select>' +
      '<select class="f" data-f="ch"><option value="">全部章节</option>' +
      D.chapters.map(c => '<option value="' + c.id + '" ' + (String(st.ch) === String(c.id) ? 'selected' : '') + '>第' + c.id + '章 ' + esc(c.short) + '</option>').join('') +
      (D.questions.some(q => !q.ch) ? '<option value="0" ' + (String(st.ch) === '0' ? 'selected' : '') + '>未归类</option>' : '') + '</select>' +
      '<select class="f" data-f="type"><option value="">全部题型</option>' +
      TYPE_ORDER.map(t => '<option ' + (st.type === t ? 'selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '</div>';
    h += '<div class="filter-row">' +
      '<select class="f" data-f="source"><option value="">全部来源</option>' +
      U.uniq(D.questions.map(q => q.source)).map(x => '<option ' + (st.source === x ? 'selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
      '<select class="f" data-f="done"><option value="">做题状态不限</option>' +
      '<option value="todo" ' + (st.done === 'todo' ? 'selected' : '') + '>未做</option>' +
      '<option value="ok" ' + (st.done === 'ok' ? 'selected' : '') + '>做对</option>' +
      '<option value="bad" ' + (st.done === 'bad' ? 'selected' : '') + '>做错</option></select>' +
      '<select class="f" data-f="status"><option value="">校核状态不限</option>' +
      [['已核', '题面答案已核'], ['待核', '待核／数字存疑'], ['冲突', '答案存在冲突']].map(x =>
        '<option value="' + x[0] + '" ' + (st.status === x[0] ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select>' +
      '<span class="small muted" style="margin-left:auto">年份按正文核定，不按文件名截断</span>' +
      '</div></div>';
    return h;
  };

  /* ---------- 题目卡 ---------- */
  App.qCard = function (q) {
    const s = App.store.get();
    const ui = App.qUI[q.id] = App.qUI[q.id] || { pick: '', sub: false, lvl: 0 };
    const sess = App.bankState.session;
    if (ui.lvl) { // 兼容旧会话：把层级迁成独立开关
      if (ui.lvl >= 1) ui.hint = true;
      if (ui.lvl >= 2) ui.pts = true;
      if (ui.lvl >= 3) ui.ans = true;
      ui.lvl = 0;
    }
    const sa = sess && sess.answers[q.id];
    if (sa && !ui.sub) { ui.sub = true; ui.pick = sa.pick || ''; ui.ans = true; }
    const att = s.attempts[q.id];
    const isObj = (q.type === '选择' || q.type === '判断');
    const canAuto = isObj && q.grade === 'auto';
    const multi = q.multi || (q.correct || '').length > 1;

    let h = '<div class="q-card" data-qid="' + q.id + '">';
    h += '<div class="q-hd"><span class="no">' + (q.year ? q.year + ' 年' : '自测') + ' · ' + esc(q.type) + '</span>' +
      '<span class="chip accent">' + esc(q.source) + '</span>' +
      (q.version && q.version !== '原卷影印' ? '<span class="chip">' + esc(q.version) + '</span>' : '') +
      (function () {
        const ax = App.statusAxes(q);
        const t1 = ax.ts === '对照原文已核' ? '已核' : ax.ts === '机器识别未核' ? '未核' : '存疑';
        const t2 = ax.cs === '存在冲突' ? '冲突' : ax.cs === '暂无法确定' ? '待定' : '未校';
        return '<span class="chip tiny" title="转写状态：' + esc(ax.ts) + '">转写·' + t1 + '</span>' +
          '<span class="chip tiny ' + (t2 === '冲突' ? 'danger' : t2 === '待定' ? 'warn' : '') + '" title="内容状态：' + esc(ax.cs) + '">内容·' + t2 + '</span>';
      })() +
      (q.ch ? '<span class="chip">第' + q.ch + '章</span>' : '<span class="chip">未归类</span>') +
      ((D.dup[q.id] || []).length ? '<span class="chip blue tiny" title="题干相同或高度相似，跨年出现记录分别保留">同题 ×' + ((D.dup[q.id] || []).length + 1) +
        '（' + D.dup[q.id].map(x => (D.byQid[x] || {}).year || '自测').join('、') + '）</span>' : '') +
      (function () {
        const pg = App.qPage(q);
        if (pg) return App.pdfLink(pg.doc, pg.page, '原卷 p' + pg.page + ' ↗');
        if (q.source === '校内期末' && q.no) return '<span class="chip" title="docx 无 PDF 物理页，按题号定位">期末卷 · 第' + q.no + '题</span>';
        return '';
      })() +
      (att ? '<span class="chip ' + (att.ok ? 'ok' : 'danger') + '" style="margin-left:auto">' + (att.ok ? '上次做对' : '上次做错') + '</span>' : '') +
      '</div>';

    h += '<div class="q-stem">' + esc(q.stem) + '</div>';
    if (q.material) h += '<div class="material">' + esc(q.material) + '</div>';
    const fig = q.img ? { src: q.img, cap: q.imgNote || '题目配图' } : (window.KB_QFIG || {})[q.id];
    if (fig) h += '<figure class="q-fig" data-act="zoom" data-src="' + esc(fig.src) + '" data-title="' + esc(fig.cap) + '" data-note="' + esc(q.stem) + '">' +
      '<img src="' + esc(fig.src) + '" alt="' + esc(fig.cap) + '" loading="lazy"><figcaption>' + esc(fig.cap) + '</figcaption></figure>';

    if (q.options && q.options.length) {
      const keys = q.type === '判断' ? ['T', 'F'] : q.options.map((o, i) => 'ABCDE'[i]);
      h += '<div class="opts" data-multi="' + (multi ? '1' : '') + '">' + q.options.map((o, i) => {
        const k = keys[i];
        let cls = 'opt';
        if (ui.sub) {
          const corr = (q.correct || '').indexOf(k) >= 0;
          const picked = ui.pick.indexOf(k) >= 0;
          if (corr) cls += ' right';
          else if (picked) cls += ' wrong';
        } else if (ui.pick.indexOf(k) >= 0) cls += ' sel';
        return '<button class="' + cls + '" data-act="pick" data-qid="' + q.id + '" data-k="' + k + '"' + (ui.sub ? ' disabled' : '') + '>' +
          '<span class="k">' + k + '</span><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>';
    }

    if (q.table) h += App.matTable(q, ui);

    if (q.statusNote) h += '<div class="q-meta-note">校核说明：' + esc(q.statusNote) + '</div>';
    if (isObj && !canAuto) h += '<div class="q-meta-note">本题因答案存疑不自动判分，可先作答，再点“完整答案”自行核对。</div>';

    if (!isObj) {
      h += '<div style="margin-top:10px"><div class="small muted" style="margin-bottom:4px">先写下你的答案（自动保存，可留空直接看要点）</div>' +
        '<textarea class="note-area" data-act="draft" data-qid="' + q.id + '" placeholder="试着按“定义—要点—例子”的顺序写，再展开要点核对覆盖情况…">' +
        esc(s.drafts[q.id] || '') + '</textarea></div>';
    }

    h += '<div class="q-actions">';
    if (canAuto && !ui.sub) {
      h += '<button class="btn primary sm" data-act="submit" data-qid="' + q.id + '">提交答案</button>';
    }
    if (ui.sub && canAuto) {
      const okNow = isCorrect(q, ui.pick);
      h += '<span class="verdict ' + (okNow ? 'ok' : 'no') + '">' + (okNow ? '回答正确' : '回答错误') +
        ' · 正确答案 ' + esc(q.type === '判断' ? (q.correct === 'T' ? '正确' : '错误') : q.correct) + '</span>';
    }
    const rbtn = (sec, label, open, show) => show ? '<button class="btn sm' + (open ? ' on' : '') + '" data-act="reveal" data-qid="' + q.id + '" data-sec="' + sec + '" aria-expanded="' + (open ? 'true' : 'false') + '" title="点击展开／收起">' + label + (open ? ' ↑' : ' ↓') + '</button>' : '';
    h += rbtn('hint', '提示', ui.hint, !!q.hint) +
      rbtn('pts', '要点', ui.pts, !!(q.points && q.points.length)) +
      rbtn('ans', '完整答案', ui.ans, true) +
      '</div>';

    const showBox = ui.hint || ui.pts || ui.ans;
    h += '<div class="ans-box' + (showBox ? '' : ' hidden') + '">';
    if (ui.hint && q.hint) h += '<div class="callout" style="margin-top:0"><b>提示：</b>' + esc(q.hint) + '</div>';
    if (ui.pts && q.points && q.points.length) {
      h += '<div class="small muted" style="margin:8px 0 5px">' + (q.pointsAuto ? '参考要点（自动拆分，仅供自评）' : '参考要点（自评时逐条核对）') + '</div>' +
        '<ol class="ans-block pts">' + q.points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ol>';
    }
    if (ui.ans && q.answer) {
      if (isObj) {
        h += '<div class="ans-block"><b>正确答案：</b>' + esc(q.type === '判断' ? (q.correct === 'T' ? '正确' : q.correct === 'F' ? '错误' : '待核') : (q.correct || '待核')) + '</div>';
      }
      if (!isObj) {
        h += '<div class="small muted" style="margin:12px 0 5px">完整参考答案</div>' +
          '<div class="ans-block">' + esc(q.answer) + '</div>';
      }
      if (q.explain) h += '<div class="callout" style="margin-top:10px"><b>解析：</b>' + esc(q.explain) + '</div>';
      if (q.refTitle) h += '<div class="small muted" style="margin-top:8px">参考回答与 ' + q.refYear + ' 年「' + esc(App.stripLen(q.refTitle, 28)) + '」同源，可对照表述差异。</div>';
    }
    h += '</div>';

    if (!isObj || !canAuto) {
      h += '<div class="self-assess"><span class="small muted" style="align-self:center;margin-right:2px">自评：</span>' +
        '<button data-act="self" data-qid="' + q.id + '" data-g="2">会</button>' +
        '<button data-act="self" data-qid="' + q.id + '" data-g="1">模糊</button>' +
        '<button data-act="self" data-qid="' + q.id + '" data-g="0">不会</button>' +
        (att ? '<span class="small muted" style="align-self:center">已记录：' + (att.ok ? '会' : '待加强') + '</span>' : '') +
        '</div>';
    }

    h += '<div class="q-concepts"><span class="small muted">关联知识：</span>' +
      (q.concepts && q.concepts.length
        ? q.concepts.map(cid => {
            const c = D.byCid[cid]; if (!c) return '';
            return '<button class="concept-link" data-act="goto-concept-id" data-cid="' + cid + '">' + esc(c.name) + '</button>';
          }).join('<span class="muted">、</span>')
        : (q.ch && q.source === '846真题' ? '<button class="concept-link" data-act="goto-chapter" data-ch="' + q.ch + '">第' + q.ch + '章概念</button><span class="muted" style="font-size:10.5px">（暂无精确关联）</span>' : '<span class="muted">暂无精确关联</span>')) +
      '</div>';
    h += '</div>';
    return h;
  };

  App.matTable = function (q, ui) {
    const t = q.table;
    ui.tbl = ui.tbl || {};
    const LAB = { low: '≤ m', mid: 'm ~ M', high: '> M' };
    const ORDER = ['', 'low', 'mid', 'high'];
    let correct = 0, total = 0, answered = 0;
    let h = '<div class="mat-block"><div class="small muted" style="margin-bottom:6px">' + esc(t.title) +
      '（m＝' + t.m.toLocaleString() + '，M＝' + t.M.toLocaleString() + '）</div>' +
      '<table class="judge-table"><thead><tr><th style="text-align:left">样品</th><th>检验值（CFU/g）</th></tr></thead><tbody>';
    t.rows.forEach((r, ri) => {
      h += '<tr><td style="text-align:left">' + esc(r.name) + '</td><td><div class="mvals">' + r.vals.map((v, vi) => {
        const key = ri + '-' + vi;
        const pick = ui.tbl[key] || '';
        const right = v > t.M ? 'high' : v > t.m ? 'mid' : 'low';
        total++;
        let cls = 'mval';
        if (pick) cls += ' set';
        if (pick) answered++;
        if (ui.tblChecked && pick) { if (pick === right) { cls += ' ok'; correct++; } else cls += ' bad'; }
        return '<button class="' + cls + '" data-act="mat-cell" data-qid="' + q.id + '" data-key="' + key + '">' +
          '<b>' + v.toLocaleString() + '</b><span>' + (pick ? LAB[pick] : '未判') + '</span></button>';
      }).join('') + '</div></td></tr>';
    });
    h += '</tbody></table><div class="row" style="margin-top:8px">' +
      '<button class="btn sm primary" data-act="mat-check" data-qid="' + q.id + '">检查判定</button>' +
      '<button class="btn sm" data-act="mat-reset" data-qid="' + q.id + '">清空</button>' +
      (ui.tblChecked ? '<span class="verdict ' + (correct === answered && answered === total ? 'ok' : 'mid') + '">' +
        (answered ? correct + ' / ' + answered + ' 格正确' : '尚未判定任何格') +
        (answered < total ? '，还有 ' + (total - answered) + ' 格未判' : (correct === total ? '，判定规则已掌握' : '，个别格判错：先看是否超过 M')) +
        '</span>' : '') +
      '</div></div>';
    return h;
  };

  function isCorrect(q, pick) {
    if (!q.correct || !pick) return false;
    const a = pick.split('').sort().join(''), b = q.correct.split('').sort().join('');
    return a === b;
  }

  function record(q, ok, ans) {
    const s = App.store.get();
    const prev = s.attempts[q.id] || {};
    s.attempts[q.id] = { ok: !!ok, ans: ans || '', at: new Date().toISOString(), n: (prev.n || 0) + 1 };
    if (ok) { if (s.wrong[q.id]) { s.wrong[q.id].resolved = new Date().toISOString(); s.wrong[q.id].cause = s.wrong[q.id].cause || ''; } }
    else {
      if (s.wrong[q.id]) { delete s.wrong[q.id].resolved; s.wrong[q.id].at = new Date().toISOString(); s.wrong[q.id].ans = ans || ''; }
      else s.wrong[q.id] = { cause: '', at: new Date().toISOString(), ans: ans || '', ver: q.status || '', ansText: (q.answer || '').slice(0, 90) };
      const cid = (q.concepts || [])[0];
      if (cid) App.schedule('c:' + cid, 0);
      if (cid) s.mastery[cid] = Math.min(s.mastery[cid] || 0, 1);
    }
    App.store.save();
  }
  App.recordAnswer = record;

  /* ---------- 练习模式 ---------- */
  function renderSession(v) {
    const s = App.bankState.session;
    const q = D.byQid[s.ids[s.idx]];
    if (!q) { App.bankState.session = null; App.view_bank(v); return; }
    const done = Object.keys(s.answers).length;
    const el = Math.floor((Date.now() - s.t0) / 1000);
    const mm = String(Math.floor(el / 60)).padStart(2, '0'), ss = String(el % 60).padStart(2, '0');

    let h = '<div class="practice-bar"><button class="btn sm" data-act="exit-session">退出</button>' +
      '<span class="mono small">' + (s.idx + 1) + ' / ' + s.ids.length + '</span>' +
      '<div class="pbar"><i style="width:' + U.pct(s.idx + 1, s.ids.length) + '%"></i></div>' +
      '<span class="timer" id="pTimer">' + mm + ':' + ss + '</span>' +
      '<button class="btn sm" data-act="session-sheet">答题卡</button></div>';

    h += App.qCard(q);

    h += '<div class="row" style="margin-top:12px">' +
      '<button class="btn" data-act="prev-q"' + (s.idx === 0 ? ' disabled' : '') + '>上一题</button>' +
      '<button class="btn primary" data-act="next-q">' + (s.idx === s.ids.length - 1 ? '完成练习' : '下一题') + '</button>' +
      '<span class="small muted" style="margin-left:auto">已作答 ' + done + ' / ' + s.ids.length + '</span></div>';

    v.innerHTML = h;

    if (window._pTimer) clearInterval(window._pTimer);
    window._pTimer = setInterval(() => {
      const t = $('#pTimer'); if (!t) { clearInterval(window._pTimer); return; }
      const d = Math.floor((Date.now() - s.t0) / 1000);
      t.textContent = String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
    }, 1000);
  }

  function sessionSheet() {
    const s = App.bankState.session;
    const html = '<div class="modal-pad"><h3>答题卡</h3><p class="small muted">绿色为做对，红色为做错，灰色为未作答。点击题号跳转。</p><div class="sheet">' +
      s.ids.map((id, i) => {
        const a = s.answers[id];
        const cls = i === s.idx ? 'cur' : (a ? (a.ok ? 'done' : 'bad') : '');
        return '<a class="' + cls + '" data-act="jump-q" data-i="' + i + '">' + (i + 1) + '</a>';
      }).join('') + '</div></div>';
    App.modal(html);
  }

  /* ---------- 事件绑定 ---------- */
  function bindBank(v) {
    const inp = $('#qSearch');
    if (inp) {
      let composing = false;
      const run = function () {
        App.bankState.q = inp.value.trim(); App.view_bank(v);
        const n = $('#qSearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      };
      inp.addEventListener('compositionstart', () => { composing = true; });
      inp.addEventListener('compositionend', () => { composing = false; run(); });
      inp.addEventListener('input', U.debounce(() => { if (!composing) run(); }, 260));
    }
    $$('.filters select[data-f]').forEach(sel => {
      let touched = false;
      sel.addEventListener('pointerdown', () => { touched = true; });
      sel.addEventListener('keydown', () => { touched = true; });
      sel.addEventListener('change', function () {
        const f = this.dataset.f;
        if (!touched) { App.bankState[f] = this.value; return; } // 浏览器刷新恢复表单，不当作筛选操作
        touched = false;
        if (App.bankState[f] === this.value) return;
        App.bankState[f] = this.value;
        App.store.get().bankFilters = {
          year: App.bankState.year, ch: App.bankState.ch, type: App.bankState.type,
          source: App.bankState.source, status: App.bankState.status, done: App.bankState.done || ''
        };
        App.store.save();
        App.bankState.session = null;
        App.bankState.restored = true;
        clearPersist();
        App.view_bank(v);
      });
    });
  }

  /* 点击分发：题库相关动作 */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const qid = t.dataset.qid;
    const q = qid ? D.byQid[qid] : null;
    const st = App.bankState;

    if (act === 'pick') {
      const ui = App.qUI[qid] = App.qUI[qid] || { pick: '', sub: false, lvl: 0 };
      if (ui.sub) return;
      const multi = q.multi || (q.correct || '').length > 1;
      if (multi) {
        const arr = ui.pick.split('');
        const i = arr.indexOf(t.dataset.k);
        if (i >= 0) arr.splice(i, 1); else arr.push(t.dataset.k);
        ui.pick = arr.sort().join('');
      } else ui.pick = t.dataset.k;
      rerenderCard(qid);
      return;
    }

    if (act === 'submit') {
      const ui = App.qUI[qid] || {};
      if (!ui.pick) { App.toast('请先选择答案'); return; }
      ui.sub = true; ui.lvl = 3;
      const ok = isCorrect(q, ui.pick);
      record(q, ok, ui.pick);
      if (st.session) { st.session.answers[qid] = { ok, pick: ui.pick }; persistSession(); }
      rerenderCard(qid);
      App.toast(ok ? '回答正确' : '回答错误，已加入错题本');
      return;
    }

    if (act === 'reveal') {
      const ui = App.qUI[qid] = App.qUI[qid] || { pick: '', sub: false };
      const sec = t.dataset.sec;
      if (sec) ui[sec] = !ui[sec];
      rerenderCard(qid);
      return;
    }

    if (act === 'self') {
      const g = +t.dataset.g;
      const ui = App.qUI[qid] || {};
      if (!ui.hint && !ui.pts && !ui.ans) { App.toast('建议先展开要点再自评'); }
      record(q, g >= 2, '自评' + ['不会', '模糊', '会'][g]);
      if (st.session) { st.session.answers[qid] = { ok: g >= 2 }; persistSession(); }
      rerenderCard(qid);
      App.toast(g >= 2 ? '已记为“会”' : '已排入明日复习');
      return;
    }

    if (act === 'mat-cell') {
      const ui = App.qUI[qid] = App.qUI[qid] || { pick: '', sub: false, lvl: 0, tbl: {} };
      ui.tbl = ui.tbl || {};
      const key = t.dataset.key;
      const ORDER = ['', 'low', 'mid', 'high'];
      ui.tbl[key] = ORDER[(ORDER.indexOf(ui.tbl[key] || '') + 1) % ORDER.length];
      ui.tblChecked = false;
      rerenderCard(qid);
      return;
    }
    if (act === 'mat-check') {
      const ui = App.qUI[qid] = App.qUI[qid] || { pick: '', sub: false, lvl: 0, tbl: {} };
      ui.tblChecked = true; rerenderCard(qid); return;
    }
    if (act === 'mat-reset') {
      const ui = App.qUI[qid] = App.qUI[qid] || { pick: '', sub: false, lvl: 0, tbl: {} };
      ui.tbl = {}; ui.tblChecked = false; rerenderCard(qid); return;
    }

    if (act === 'goto-concept') {
      const cid = (q.concepts || [])[0];
      if (!cid) { App.toast('该题未关联知识节点'); return; }
      App.go('map'); App.openConcept(cid);
      return;
    }
    if (act === 'goto-concept-id') {
      App.openConcept(t.dataset.cid); return;
    }
    if (act === 'goto-chapter') {
      const ch = +t.dataset.ch;
      App.mapState.mode = 'list'; App.mapState.open = {}; App.mapState.open[ch] = true;
      App.go('map');
      setTimeout(function () {
        const el = document.querySelector('.chapter[data-ch="' + ch + '"]');
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 80);
      return;
    }

    if (act === 'start-session' || act === 'start-random') {
      let ids;
      if (act === 'start-random') {
        const pool = filtered();
        ids = shuffle(pool.map(q => q.id)).slice(0, 8);
      } else {
        ids = filtered().slice(0, 12).map(q => q.id);
      }
      if (!ids.length) { App.toast('当前筛选没有题目'); return; }
      App.qUI = {};
      st.session = { ids, idx: 0, t0: Date.now(), answers: {} };
      st.restored = true;
      persistSession();
      App.view_bank($('#view'));
      return;
    }
    if (act === 'more-q') { App.bankState.limit = (App.bankState.limit || 60) + 60; App.view_bank($('#view')); return; }
    if (act === 'clear-filter') {
      Object.assign(st, { year: '', ch: '', type: '', source: '', status: '', done: '', q: '', concept: '', session: null, limit: 60, restored: true });
      App.store.get().bankFilters = { year: '', ch: '', type: '', source: '', status: '', done: '' };
      App.store.save();
      clearPersist();
      App.view_bank($('#view'));
      return;
    }
    if (act === 'exit-session') {
      if (!st.session) { App.closeModal(); st.session = null; App.view_bank($('#view')); return; }
      if (Object.keys(st.session.answers).length && !confirm('退出后本次作答记录仍保留在题目历史中，但答题卡进度将丢失。确定退出？')) return;
      st.session = null; clearPersist(); App.view_bank($('#view')); return;
    }
    if (act === 'prev-q') { st.session.idx = Math.max(0, st.session.idx - 1); persistSession(); App.view_bank($('#view')); return; }
    if (act === 'next-q') {
      if (st.session.idx >= st.session.ids.length - 1) { finishSession(); return; }
      st.session.idx++; persistSession(); App.view_bank($('#view')); return;
    }
    if (act === 'session-sheet') { sessionSheet(); return; }
    if (act === 'jump-q') {
      st.session.idx = +t.dataset.i; App.closeModal(); App.view_bank($('#view')); return;
    }

    /* 复习 / 错题 */
    if (act === 'rev') {
      const cid = t.dataset.cid, g = +t.dataset.g;
      App.schedule('c:' + cid, g);
      const s = App.store.get();
      const cur = s.mastery[cid] || 0;
      s.mastery[cid] = g === 2 ? Math.max(cur, 2) : (cur === 3 ? 3 : 1);
      App.store.save();
      App.view_review($('#view'));
      App.toast('已安排下次复习');
      return;
    }
    if (act === 'redo') {
      App.qUI = {};
      st.session = { ids: [qid], idx: 0, t0: Date.now(), answers: {} };
      st.restored = true;
      App.go('bank');
      return;
    }
    if (act === 'del-wrong') {
      const s = App.store.get(); delete s.wrong[qid]; App.store.save();
      App.view_review($('#view')); App.toast('已移出错题本'); return;
    }

    /* 地图相关 */
    if (act === 'open-c') { App.openConcept(t.dataset.cid); return; }
    if (act === 'chapter') {
      const box = t.closest('.chapter'), id = box.dataset.ch;
      App.mapState.open[id] = !App.mapState.open[id];
      box.classList.toggle('open');
      return;
    }
    if (act === 'map-mode') { App.mapState.mode = t.dataset.v; if (App.panelCid) App.renderPanel(); App.view_map($('#view')); return; }
    if (act === 'map-expand') { D.chapters.forEach(c => App.mapState.open[c.id] = true); App.view_map($('#view')); return; }
    if (act === 'map-collapse') { App.mapState.open = {}; App.view_map($('#view')); return; }

    /* 首页 */
    if (act === 'home-continue') {
      const ch = App.store.get().lastChapter;
      App.mapState.open = {}; App.mapState.open[ch] = true; App.mapState.q = ''; App.mapState.mode = 'list';
      App.go('map'); return;
    }
    if (act === 'home-due') { App.go('review'); return; }
    if (act === 'session-review') { App.closeModal(); App.go('review'); return; }
    if (act === 'review-to-cards') { App.cardsState.ids = []; App.cardsState.deck = 'zhenti'; App.cardsState.scope = 'due'; App.go('cards', 'due'); return; }
    if (act === 'home-cards') { App.cardsState.ids = []; App.cardsState.deck = 'zhenti'; App.go('cards', 'due'); return; }
    if (act === 'home-wrong') { App.go('review'); return; }
    if (act === 'map-mode-x') { App.mapState.mode = 'mind'; App.go('map'); return; }
    if (act === 'map-mode-y') {
      const ch = App.store.get().lastChapter;
      const c = (D.byChapter[ch] || D.concepts)[0];
      App.mapState.mode = 'mind'; App.go('map');
      if (c) App.openConcept(c.id);
      return;
    }
    if (act === 'home-paper') { App.go('paper'); return; }
    if (act === 'home-ask') { App.go('ask'); return; }
    if (act === 'home-drill') {
      const pool = D.questions.filter(q => q.grade === 'auto');
      App.qUI = {};
      st.session = { ids: shuffle(pool.map(q => q.id)).slice(0, 8), idx: 0, t0: Date.now(), answers: {} };
      st.restored = true;
      App.go('bank');
      return;
    }

    /* 设置 */
    if (act === 'save-settings') {
      const s = App.store.get();
      const d = $('#examDate'), l = $('#dailyLimit');
      s.examDate = d ? d.value : s.examDate;
      s.dailyLimit = l ? Math.max(5, Math.min(80, +l.value || 15)) : s.dailyLimit;
      const nw = $('#dailyNew');
      s.dailyNew = nw ? Math.max(0, Math.min(50, +nw.value || 0)) : (s.dailyNew || 10);
      App.cardsState.ids = [];
      App.store.save(); App.toast('设置已保存'); App.view_review($('#view')); return;
    }
    if (act === 'export') { exportData(); return; }
    if (act === 'import') { importData(); return; }
    if (act === 'reset') {
      if (!confirm('将清空本机的掌握度、笔记、错题与复习记录，且不可恢复。建议先导出备份。确定继续？')) return;
      App.store.reset(); App.toast('已清空本机记录'); App.render(); return;
    }
  });

  function rerenderCard(qid) {
    const card = document.querySelector('.q-card[data-qid="' + qid + '"]');
    if (!card) return;
    const q = D.byQid[qid];
    const tmp = document.createElement('div');
    tmp.innerHTML = App.qCard(q);
    const fresh = tmp.firstElementChild;
    card.replaceWith(fresh);
    if (App.bankState.session) {
      // 保持计时与进度条
    }
  }
  App.rerenderCard = rerenderCard;

  function persistSession() {
    const st = App.bankState;
    App.store.get().bankSession = st.session ? { ids: st.session.ids, idx: st.session.idx, t0: st.session.t0, answers: st.session.answers } : null;
    App.store.save();
  }
  function clearPersist() { App.store.get().bankSession = null; App.store.save(); }

  function finishSession() {
    const st = App.bankState;
    const ans = Object.keys(st.session.answers);
    const ok = ans.filter(k => st.session.answers[k].ok).length;
    const total = st.session.ids.length;
    App.modal('<div class="modal-pad"><h3>练习结束</h3>' +
      '<p class="small muted">本次共 ' + total + ' 题，已作答 ' + ans.length + ' 题，答对（含自评“会”）' + ok + ' 题。</p>' +
      '<div class="result"><b>' + (ans.length ? U.pct(ok, ans.length) + '%' : '—') + '</b> 正确率' +
      '<ul class="steps"><li>错题已自动进入错题本，可在“错题与复习”里标注错因。</li>' +
      '<li>答错题关联的知识节点已排入明日复习。</li>' +
      '<li>建议对错题所在章节做一次导图遮挡回忆。</li></ul></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="exit-session">返回题库</button>' +
      '<button class="btn" data-act="session-review">去错题本</button></div></div>');
    st.session = null; clearPersist();
  }

  document.addEventListener('change', function (e) {
    const t = e.target.closest('select[data-act="cause"]');
    if (!t) return;
    const s = App.store.get();
    if (s.wrong[t.dataset.qid]) { s.wrong[t.dataset.qid].cause = t.value; App.store.save(); App.toast('已记录错因：' + (t.value || '未标')); }
  });

  function ansLabel(q, v) {
    if (!v) return '—';
    if (v.indexOf('自评') === 0) return v;
    if (q && q.type === '判断') return v === 'T' ? '正确' : v === 'F' ? '错误' : v;
    return v;
  }

  function localDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- 导出 / 导入 ---------- */
  function exportData() {
    const s = App.store.get();
    s.lastExport = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify({ _format: 'kb846', _version: 1, exportedAt: new Date().toISOString(), data: s }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '846复习记录-' + U.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    App.store.save();
    App.toast('已导出备份文件');
  }
  function importData() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      const f = this.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = function () {
        try {
          const obj = JSON.parse(String(r.result));
          const data = obj && obj.data ? obj.data : obj;
          if (!data || typeof data !== 'object') throw new Error('格式不符');
          if (!confirm('导入将覆盖当前本机记录（掌握度、笔记、错题、复习队列）。建议先导出当前记录。确定导入？')) return;
          App.store.replace(data);
          App.toast('导入完成');
          App.render();
        } catch (err) {
          App.toast('导入失败：不是有效的备份文件');
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }
  App.exportData = exportData;
})();
