/* ============ 视图：今日复习、知识地图、资料原文、错题与复习 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, esc = U.esc, D = App.data;
  App.bankState = App.bankState || Object.assign(
    { year: '', ch: '', type: '', source: '', status: '', q: '', session: null, concept: '' },
    (App.store.get().bankFilters || {})
  );

  /* ---------------- 今日复习 ---------------- */
  App.view_home = function (v) {
    const s = App.store.get();
    const total = D.concepts.length;
    const examN = D.questions.filter(q => q.source === '846真题').length;
    const genN = D.questions.length - examN;
    const mastered = D.concepts.filter(c => App.mastery(c.id) >= 2).length;
    const due = App.dueItems();
    const dueAll = App.dueCount();
    const wrongAll = App.wrongList();
    const wrong = wrongAll.filter(x => !x.w.resolved);
    const att = Object.keys(s.attempts);
    const okN = att.filter(k => s.attempts[k].ok).length;
    const cardStats = App.cardStats ? App.cardStats() : { done: 0, total: 0 };
    const paperDone = Object.keys(App.store.get().paperDone || {}).length;
    const chMeta = D.chapters.find(c => c.id === s.lastChapter) || D.chapters[6] || D.chapters[0];

    let days = null;
    if (s.examDate) days = U.diffDays(U.today(), s.examDate);

    let h = '';
    h += '<div class="hero"><div class="hero-count">' + (days === null ? '<b>—</b><span>未设置考试日期</span>' :
      (days >= 0 ? '<b>' + days + '</b><span>天后考试</span>' : '<b>' + Math.abs(days) + '</b><span>天前已过考试日期</span>')) + '</div>' +
      '<h1>846 食品微生物学 · 复习工作台</h1>' +
      '<p>以大纲组织知识，以历年题检验掌握，以原文支撑核查。核心阅读、检索与训练不依赖联网。</p>' +
      '<div class="hero-stats">' +
      '<div><b>' + total + '</b><span>知识节点</span></div>' +
      '<div><b>' + D.questions.length + '</b><span>题库总题量</span></div>' +
      '<div><b>' + D.papers.length + '</b><span>套卷</span></div>' +
      '<div><b>' + mastered + '</b><span>已掌握节点</span></div>' +
      '<div><b>' + cardStats.done + '</b><span>已复习卡片</span></div>' +
      '<div><b>' + paperDone + '</b><span>已做试卷题</span></div>' +
      '<div><b>' + dueAll + '</b><span>今日到期</span></div>' +
      '</div></div>';

    h += '<div class="grid g3">';
    h += '<div class="tile clickable" data-act="home-continue"><h4><span class="ico">→</span>继续上次章节</h4>' +
      '<p>第' + chMeta.id + '章 ' + esc(chMeta.name) + '</p><div class="go">进入知识地图</div></div>';
    h += '<div class="tile clickable" data-act="home-cards"><h4><span class="ico">▤</span>卡片复习</h4>' +
      '<p>默认 77 张真题名词解释；概念卡与期末、练习题名解可另选</p><div class="go">开始翻卡</div></div>';
    h += '<div class="tile clickable" data-act="home-wrong"><h4><span class="ico">×</span>待重做错题</h4>' +
      '<p>' + (wrong.length ? wrong.length + ' 道题记录在错题本' : '还没有错题记录') + '</p><div class="go">打开错题本</div></div>';
    h += '<div class="tile clickable" data-act="home-drill"><h4><span class="ico">▷</span>短时专项</h4>' +
      '<p>从题库随机抽 8 题，覆盖各章与题型</p><div class="go">立即开始</div></div>';
    h += '<div class="tile clickable" data-act="home-paper"><h4><span class="ico">卷</span>整卷模考</h4>' +
      '<p>' + D.papers.filter(x => x.have === x.want).length + ' 套题量完整卷可选，含 2023—2025 真题与两套期末</p><div class="go">进入套卷</div></div>';
    h += '<div class="tile clickable" data-act="home-ask"><h4><span class="ico">?</span>问答</h4>' +
      '<p>用自然语言提问，从知识卡检索答案并给出来源</p><div class="go">去提问</div></div>';
    h += '</div>';

    h += '<h2 class="sec"><span class="num">01</span>下一步学什么</h2>';
    if (due.length) {
      const cap = s.dailyLimit || 8;
      h += '<div class="small muted" style="margin:-2px 0 8px">今日上限 ' + cap + ' 项，可到“错题与复习”调整。</div>';
      h += '<div class="due-list">' + due.slice(0, cap).map(it => {
        const c = D.byCid[it.cid];
        if (!c) return '';
        return '<div class="due-item" data-act="open-c" data-cid="' + c.id + '">' +
          '<span class="dot m' + App.mastery(c.id) + '"></span>' +
          '<span class="nm">' + esc(c.name) + '</span>' +
          '<span class="ch">第' + c.ch + '章</span><span class="chip warn tiny">到期 ' + esc(it.due) + '</span></div>';
      }).join('') + '</div>';
    } else {
      const pool = (D.byChapter[s.lastChapter] || D.concepts).filter(c => App.mastery(c.id) < 2).slice(0, 6);
      h += '<div class="callout">今天没有到期的复习卡。下面按“尚未掌握 + 高频考点”推荐 6 个节点，可作为今日起点。</div>';
      h += '<div class="due-list">' + pool.map(c =>
        '<div class="due-item" data-act="open-c" data-cid="' + c.id + '">' +
        '<span class="dot m' + App.mastery(c.id) + '"></span><span class="nm">' + esc(c.name) + '</span>' +
        '<span class="ch">第' + c.ch + '章</span>' + (D.freq[c.id] ? '<span class="chip tiny">批注 ' + D.freq[c.id].length + ' 年</span>' : '') + '</div>').join('') + '</div>';
    }

    h += '<h2 class="sec"><span class="num">02</span>一条完整的学习路径</h2>';
    h += '<div class="grid g4">' +
      '<div class="tile clickable" data-act="map-mode-x"><h4><span class="ico">1</span>先回忆</h4><p>在知识地图打开本章，用背诵模式遮挡定义与要点，逐条自述。</p><div class="go">去知识地图</div></div>' +
      '<div class="tile clickable" data-act="map-mode-y"><h4><span class="ico">2</span>再核对</h4><p>打开知识卡对照要点与对比表，必要时查看资料原页与手写笔记。</p><div class="go">看知识卡</div></div>' +
      '<div class="tile clickable" data-act="home-drill"><h4><span class="ico">3</span>做关联题</h4><p>按考点筛题，先答再看“提示 → 要点 → 答案”，不提前泄题。</p><div class="go">开始做题</div></div>' +
      '<div class="tile clickable" data-act="home-wrong"><h4><span class="ico">4</span>记错因</h4><p>把错误归为概念混淆、漏要点等具体原因，排入下一次复习。</p><div class="go">去错题本</div></div>' +
      '</div>';

    h += '<h2 class="sec"><span class="num">03</span>复习进度</h2>';
    h += '<div class="grid g3" style="margin-bottom:12px">' +
      '<div class="tile"><h4>知识地图掌握</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink);margin:0">' + mastered + ' / ' + total + '</p><div class="progress"><i style="width:' + U.pct(mastered, total) + '%"></i></div><span class="small muted">导图与列表同一套 mastery 数据，按“会/熟练”计</span></div>' +
      '<div class="tile"><h4>卡片复习</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink);margin:0">' + cardStats.done + ' / ' + cardStats.total + '</p><div class="progress"><i style="width:' + U.pct(cardStats.done, cardStats.total) + '%"></i></div><span class="small muted">已翻过并记录过的卡片（四卡组合计）</span></div>' +
      '<div class="tile"><h4>套卷已做</h4><p style="font-family:var(--mono);font-size:18px;color:var(--ink);margin:0">' + paperDone + ' 道</p><span class="small muted">套卷内已作答过的唯一题目，含选择/主观题</span></div>' +
      '</div>';
    h += '<div class="card"><div class="spread" style="margin-bottom:12px">' +
      '<div><b style="font-family:var(--serif);font-size:15px">大纲覆盖与个人掌握</b>' +
      '<div class="small muted">“已掌握”指自评为“会”或“熟练”，与资料整理完整度是两件事。</div></div>' +
      '<div class="mono small">' + mastered + ' / ' + total + ' · ' + U.pct(mastered, total) + '%</div></div>';
    h += '<div class="grid g2">' + D.chapters.map(c => {
      const list = D.byChapter[c.id] || [];
      if (!list.length) return '';
      const m = list.filter(x => App.mastery(x.id) >= 2).length;
      return '<div style="padding:2px 0"><div class="spread small" style="margin-bottom:3px">' +
        '<span>第' + c.id + '章 ' + esc(c.short) + '</span><span class="mono muted">' + m + '/' + list.length + '</span></div>' +
        '<div class="progress"><i style="width:' + U.pct(m, list.length) + '%"></i></div></div>';
    }).join('') + '</div></div>';

    const cnt = {};
    D.questions.forEach(q => { cnt[q.source] = (cnt[q.source] || 0) + 1; });
    h += '<div class="callout warn"><b>关于统计口径：</b>知识节点 ' + total + ' 个、题库 ' + D.questions.length +
      ' 道（846 真题 ' + (cnt['846真题'] || 0) + '、校内期末 ' + (cnt['校内期末'] || 0) + '、其他高校试题 ' + (cnt['其他高校试题'] || 0) +
      '、资料练习 ' + (cnt['资料练习'] || 0) + '、生成自测 ' + (cnt['生成自测'] || 0) + '）、套卷 ' + D.papers.length +
      ' 套。练习题只收录能可靠切分且有答案的题目；2021、2022、2024 为回忆版。' +
      '未整理章节不会被标成“你已掌握”，也不会显示未经支持的命中率预测。</div>';

    if (att.length) {
      h += '<div class="card" style="margin-top:12px"><div class="spread"><span class="small muted">已作答 ' + att.length + ' 题</span>' +
        '<span class="small">客观题正确率 <b class="mono">' + U.pct(okN, att.length) + '%</b></span></div></div>';
    }

    v.innerHTML = h;
  };

  /* ---------------- 知识地图 ---------------- */
  App.mapState = { q: '', open: {}, mode: 'mind' };

  App.view_map = function (v, param) {
    if (param && param.indexOf('c-') === 0) { App.openConcept(param); }
    const st = App.mapState;
    let h = '<h1 class="page-title">知识地图</h1><p class="page-sub">导图按“大纲部分 → 章节 → 概念 → 要点”分级，可缩放、平移、折叠；列表适合快速定位与长文本阅读。两种视图共用同一套节点与掌握度。</p>';

    h += '<div class="map-tools">' +
      '<button class="btn ' + (st.mode === 'mind' ? 'on' : '') + '" data-act="map-mode" data-v="mind">导图</button>' +
      '<button class="btn ' + (st.mode === 'list' ? 'on' : '') + '" data-act="map-mode" data-v="list">列表</button>' +
      '<button class="btn ' + (st.mode === 'freq' ? 'on' : '') + '" data-act="map-mode" data-v="freq">考频</button>' +
      '</div>' +
      (st.mode === 'list' ? '<div class="map-list-tools"><div class="search-box">' + App.icon('search') + '<input id="mapSearch" placeholder="搜索节点、概念或要点，如 芽孢 / spore / G+" value="' + esc(st.q) + '"></div>' +
        '<button class="btn" data-act="map-expand">展开全部</button><button class="btn" data-act="map-collapse">收起</button></div>' : '');

    if (st.mode === 'mind') {
      v.innerHTML = h + App.renderMindmap();
      App.mmBind();
      return;
    }

    if (st.mode === 'list' && st.q) {
      h += '<div class="map-search-results">' + App.mapResultsHTML(st.q) + '</div>';
      v.innerHTML = h;
      bindMap(v);
      return;
    }

    if (st.mode === 'freq') {
      v.innerHTML = h + freqView();
      bindMap(v);
      return;
    }

    v.innerHTML = h + listView();
    bindMap(v);
  };

  function listView() {
    const st = App.mapState;
    let out = '<div class="small muted" style="margin:-4px 0 10px">按章节折叠的列表：点章节展开概念，点概念打开右侧知识卡。</div>';
    const ms = [0, 1, 2, 3].map(v => D.concepts.filter(c => App.mastery(c.id) === v).length);
    out += '<div class="map-legend"><b style="font-weight:600">掌握度</b>' +
      ['未学', '模糊', '会', '熟练'].map((x, i) => '<span><i class="mlg mlg' + i + '"></i>' + x + ' <b class="mono">' + ms[i] + '</b></span>').join('') +
      '</div>';
    out += D.chapters.map(ch => {
      const list = D.byChapter[ch.id] || [];
      if (!list.length) return '';
      const m = list.filter(c => App.mastery(c.id) >= 2).length;
      const open = st.open[ch.id];
      return '<div class="chapter' + (open ? ' open' : '') + '" data-ch="' + ch.id + '">' +
        '<div class="chapter-hd" data-act="chapter">' +
        '<span class="idx">' + String(ch.id).padStart(2, '0') + '</span>' +
        '<span class="nm">' + esc(ch.name) + '</span>' +
        '<span class="meta">' + m + '/' + list.length + '</span>' +
        '<span class="caret">▶</span></div>' +
        '<div class="chapter-bd">' +
        '<div class="small muted" style="padding:7px 10px 3px">' + esc(ch.outline) + '</div>' +
        list.map(c => '<div class="node" data-act="open-c" data-cid="' + c.id + '">' +
          '<span class="st m' + App.mastery(c.id) + '"></span><div class="tx"><b>' + esc(c.name) + '</b>' +
          '<span>' + esc(App.stripLen(c.def, 56)) + '</span></div>' +
          ((c.qids || []).length ? '<span class="q">' + c.qids.length + '题</span>' : '') + '</div>').join('') +
        '</div></div>';
    }).join('');
    return out;
  }

  function freqView() {
    const ys = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
    let out = '<div class="callout warn"><b>两个指标分开看：</b>上表为《知识点总结》括注的年份（资料自带批注，含“26”但未找到对应完整试卷）；下表为本版已结构化并挂接的试题记录。批注年数不等于已验证考频，也不是“明年命中率”。</div>';
    out += '<h2 class="sec"><span class="num">A</span>资料批注年份矩阵</h2><div class="card" style="padding:0;overflow:hidden"><div class="scroll">' +
      '<table class="cmp-table" style="min-width:820px"><thead><tr><th style="width:28%">考点</th>' +
      ys.map(y => '<th style="text-align:center;font-family:var(--mono)">' + (y === 26 ? '26*' : y) + '</th>').join('') +
      '<th style="text-align:center">年数</th></tr></thead><tbody>' +
      (window.KB_FREQ_NOTE || []).slice().sort((a, b) => b.years.length - a.years.length).map(f => {
        const c = D.byCid[f.cid];
        return '<tr><td style="cursor:pointer" data-act="open-c" data-cid="' + f.cid + '">' + esc(c ? c.name : f.cid) +
          '<div class="small muted" style="font-weight:400">' + esc(f.label) + '</div></td>' +
          ys.map(y => '<td style="text-align:center">' + (f.years.indexOf(y) >= 0 ?
            '<span class="dot ' + (y === 26 ? 'm1' : 'm2') + '"></span>' : '<span style="color:#ded9cc">·</span>') + '</td>').join('') +
          '<td style="text-align:center;font-family:var(--mono)">' + f.years.length + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="small muted" style="margin-top:6px">橙点＝26 批注（无对应试卷）；绿点＝其他批注年份。点击考点名可打开知识卡。</div>';

    out += '<h2 class="sec"><span class="num">B</span>已挂接试题统计</h2>';
    const rows = D.concepts.map(c => {
      const qs = (c.qids || []).map(id => D.byQid[id]).filter(Boolean);
      const years = U.uniq(qs.map(q => q.year || 0)).filter(Boolean).sort();
      return { c, n: qs.length, years, gen: qs.filter(q => !q.year).length };
    }).filter(r => r.n).sort((a, b) => b.n - a.n);
    out += '<div class="card" style="padding:0;overflow:hidden"><div class="scroll"><table class="cmp-table">' +
      '<thead><tr><th style="width:32%">考点</th><th>已挂接试题年份</th><th style="width:14%;text-align:center">题数</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td style="cursor:pointer" data-act="open-c" data-cid="' + r.c.id + '">' + esc(r.c.name) + '</td>' +
        '<td class="mono small">' + (r.years.length ? r.years.join('、') : '—') + (r.gen ? ' <span class="chip tiny">自测' + r.gen + '</span>' : '') + '</td>' +
        '<td style="text-align:center;font-family:var(--mono)">' + r.n + '</td></tr>').join('') +
      '</tbody></table></div></div>';
    out += '<div class="callout">统计只针对本版已结构化的范围。同一试题的重复 PDF（如 2023 独立卷与合辑）不重复计频；跨年出现的同题分别保留年份记录。' +
      '练习题与期末卷已入库，但它们的年份字段不同（期末记为 2022 年，练习题无年份），故不按 846 年份计频。</div>';
    return out;
  }

  function bindMap(v) {
    const st = App.mapState;
    const inp = $('#mapSearch');
    if (inp) {
      let composing = false;
      const run = function () {
        st.q = inp.value.trim(); App.view_map(v);
        const n = $('#mapSearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      };
      inp.addEventListener('compositionstart', () => { composing = true; });
      inp.addEventListener('compositionend', () => { composing = false; run(); });
      inp.addEventListener('input', U.debounce(() => { if (!composing) run(); }, 220));
    }
  }


  function coverageView() {
    const qAll = D.questions;
    const qp = q => !!(window.KB_QPAGES || {})[q.id];
    const q846 = qAll.filter(q => q.source === '846真题');
    const lx = qAll.filter(q => q.source === '其他高校试题' || q.source === '资料练习');
    const qm = qAll.filter(q => q.source === '校内期末');
    const qz = qAll.filter(q => q.source === '生成自测');
    const qp846 = q846.filter(qp).length, qpLx = lx.filter(qp).length, qpQm = qm.filter(qp).length;
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    let out = '<h2 class="sec"><span class="num">05</span>覆盖缺口与资料限制</h2>';
    out += '<div class="grid g4" style="margin-bottom:12px">' +
      '<div class="tile"><h4>真题原页</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + qp846 + ' / ' + q846.length + '</p><span class="small muted">' + pct(qp846, q846.length) + '% · 14 套题量全部齐</span></div>' +
      '<div class="tile"><h4>练习题</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + lx.length + '</p><span class="small muted">原题按题源标记粗估约 260，约 1/4 未入库</span></div>' +
      '<div class="tile"><h4>期末原页</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + qpQm + ' / ' + qm.length + '</p><span class="small muted">docx 无 PDF 页，改用题号定位</span></div>' +
      '<div class="tile"><h4>全库原页</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + Object.keys(window.KB_QPAGES || {}).length + ' / ' + qAll.length + '</p><span class="small muted">' + pct(Object.keys(window.KB_QPAGES || {}).length, qAll.length) + '% · 未命中不猜页码</span></div>' +
      '</div>';
    out += '<div class="callout warn"><b>缺口说明：</b>真题 14 套已全部 have=want；仍未覆盖的是练习题中“答案不可靠/依赖原图/无法可靠切分”的部分（约 1/4），以及期末 docx 没有 PDF 物理页可链。手写笔记 86 页只挂了 5 页图，属于抽样使用，不是全部数字化。字段侧：127 题暂无可靠关联概念（不硬凑）；313 题无原卷号，用卷面顺序兜底；113 题无分值，已按题型默认。</div>';

    // 答案溯源：参考答案只放资料原文，要点是本页整理
    const subAll = qAll.filter(q => ['名词解释', '简答', '论述', '材料'].indexOf(q.type) >= 0);
    const withSrc = subAll.filter(q => q.answer && q.answerSource === '原资料');
    const noSrc = subAll.filter(q => !q.answer);
    const sub846 = subAll.filter(q => q.source === '846真题');
    const sub846src = sub846.filter(q => q.answer && q.answerSource === '原资料');
    const docCount = {};
    withSrc.forEach(q => { const k = q.answerDoc || (q.source === '校内期末' ? '期末 docx 答案' : '练习题原答案'); docCount[k] = (docCount[k] || 0) + 1; });
    const docRows = Object.keys(docCount).sort((a, b) => docCount[b] - docCount[a]).map(k => '<tr><td>' + esc(k) + '</td><td class="mono">' + docCount[k] + '</td></tr>').join('');
    out += '<h3 class="sub">参考答案溯源</h3>' +
      '<div class="callout" style="margin-bottom:10px"><b>规则：</b>“参考答案”只放资料原文（真题答案区 / 知识点总结 / 复习讲义 / 练习题 / 期末 docx），不改写、不缩写；“答题要点”才是本页整理，用于自评核对。找不到资料原文的题，答案区留空并说明，不拿整理稿冒充参考答案。</div>' +
      '<div class="grid g4" style="margin-bottom:10px">' +
      '<div class="tile"><h4>主观题</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + subAll.length + '</p><span class="small muted">名解 164 · 简答 92 · 论述 36 · 材料 3</span></div>' +
      '<div class="tile"><h4>有资料原文答案</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + withSrc.length + ' / ' + subAll.length + '</p><span class="small muted">' + pct(withSrc.length, subAll.length) + '% · 逐题对过原文</span></div>' +
      '<div class="tile"><h4>846 真题主观题</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + sub846src.length + ' / ' + sub846.length + '</p><span class="small muted">14 套答案区逐题回填</span></div>' +
      '<div class="tile"><h4>无原文（自测题）</h4><p class="mono" style="font-size:18px;color:var(--ink)">' + noSrc.length + '</p><span class="small muted">本页自拟，只有要点</span></div>' +
      '</div>' +
      '<div class="scroll"><table class="cmp-table" style="font-size:12px"><thead><tr><th>答案出处</th><th>题数</th></tr></thead><tbody>' + docRows + '</tbody></table></div>';

    out += '<h3 class="sub">按年份看真题</h3><div class="scroll"><table class="cmp-table" style="font-size:12px"><thead><tr><th>年份</th><th>题量</th><th>原页</th><th>待核/冲突</th><th>标签</th></tr></thead><tbody>';
    for (let y = 2012; y <= 2025; y++) {
      const p = D.papers.find(x => x.id === 'p' + y);
      const qs = q846.filter(q => q.year === y);
      if (!p || !qs.length) continue;
      const pg = qs.filter(qp).length;
      const pend = qs.filter(q => q.status === '待核' || q.status === '冲突').length;
      out += '<tr><td>' + y + '</td><td class="mono">' + p.have + '/' + p.want + '</td><td class="mono">' + pg + '/' + qs.length + '</td><td class="mono">' + pend + '</td><td>' + esc(p.level) + '</td></tr>';
    }
    out += '</tbody></table></div>';

    const cite = {};
    D.concepts.forEach(c => (c.src || []).forEach(x => { cite[x.doc] = (cite[x.doc] || 0) + 1; }));
    out += '<h3 class="sub">每份资料用到什么程度</h3><div class="scroll"><table class="cmp-table" style="font-size:12px"><thead><tr><th>资料</th><th>规模</th><th>页面使用</th><th>性质</th></tr></thead><tbody>' +
      '<tr><td>真题合辑</td><td>177 页</td><td class="mono">' + Object.values(window.KB_QPAGES || {}).filter(x => x.doc === '真题-2012-2015年.pdf').length + ' 条原页</td><td>题量主来源；扫描 OCR</td></tr>' +
      '<tr><td>真题 2023 / 2024</td><td>16 / 13 页</td><td class="mono">' + q846.filter(q => q.year === 2023 && qp(q)).length + '/29、' + q846.filter(q => q.year === 2024 && qp(q)).length + '/24</td><td>独立影印对照</td></tr>' +
      '<tr><td>练习题</td><td>157 页</td><td class="mono">' + lx.length + ' 题 / 201 条原页</td><td>约 3/4 入库；其余保留 PDF</td></tr>' +
      '<tr><td>期末 A/B</td><td>41+41 题</td><td class="mono">0 原页 · 题号定位</td><td>两套高度重复，只作二次练习</td></tr>' +
      '<tr><td>教材考点精讲</td><td>252 页</td><td class="mono">' + (cite['教材考点精讲'] + (cite['教材考点精讲part2'] || 0)) + ' 处引用</td><td>已接 OCR 全文阅读</td></tr>' +
      '<tr><td>复习讲义</td><td>122 页</td><td class="mono">' + (cite['复习讲义'] || 0) + ' 处引用</td><td>已接 OCR 全文阅读</td></tr>' +
      '<tr><td>知识点总结</td><td>27 页</td><td class="mono">' + (cite['知识点总结'] || 0) + ' 处引用 · 2 图</td><td>已接 OCR 全文阅读</td></tr>' +
      '<tr><td>手写笔记</td><td>86 页</td><td class="mono">5 页图</td><td>纯图像，仅抽样挂接</td></tr>' +
      '<tr><td>考试大纲</td><td>949 字</td><td class="mono">章节主线</td><td>无分值权重，只能做覆盖对照</td></tr>' +
      '</tbody></table></div>';

    out += '<h3 class="sub">资料本身的限制（不是页面能凭空修复的）</h3><div class="scroll"><table class="cmp-table" style="font-size:12px"><thead><tr><th style="width:24%">限制</th><th>具体表现</th><th style="width:30%">页面处理</th></tr></thead><tbody>' +
      '<tr><td>扫描件无文本层</td><td>合辑/练习题/复习讲义/手写笔记仅图像，现用 OCR 稿；错字、串行、表格丢失</td><td>保留 PDF 原页 + 转写状态；不把 OCR 当原文</td></tr>' +
      '<tr><td>原卷缺题</td><td>2012 第7题、2015 选择6题、2016 选择5题、2017 选择3题</td><td><b>已全部补齐</b>，14 套 have=want</td></tr>' +
      '<tr><td>回忆版限制</td><td>2021/2022 无选择题原题；2024 选择10答案残缺</td><td>标“回忆版/待核”，不冒充原卷</td></tr>' +
      '<tr><td>原卷编号/命题错误</td><td>2015 判断第9题印成5；2020 第3/6题重复；2018 选择18 A项重复；2017 判断10原解析错</td><td>题号修正/加 note；冲突题不自动判分</td></tr>' +
      '<tr><td>答案冲突</td><td>2020 选择16 vs 第10题；2022 期末22 EMP；2023 计数题指数</td><td>标“冲突/待核”，不进自动判分</td></tr>' +
      '<tr><td>练习题质量</td><td>答案与下一题粘连、图题、1500字截断</td><td>清理为 20 条问答；图题挂原页图；截断标注</td></tr>' +
      '<tr><td>期末 A/B 重复</td><td>同结构、同考点，不是两份独立样本</td><td>B 卷标“同源重复”，只作二次练习</td></tr>' +
      '<tr><td>大纲过粗</td><td>949字、8部分、无分值权重</td><td>下方只做章节覆盖，不生成假权重</td></tr>' +
      '<tr><td>知识点总结笔误</td><td>p23 烈性/温和噬菌体英文写反；p25 类病毒/拟病毒写反</td><td>概念卡按正确对应，原页保留可核</td></tr>' +
      '</tbody></table></div>';

    const groups = {};
    D.chapters.forEach(c => { const k = c.outline || '未标注'; (groups[k] = groups[k] || []).push(c); });
    out += '<h3 class="sub">大纲覆盖（只到章节，不造权重）</h3><div class="scroll"><table class="cmp-table" style="font-size:12px"><thead><tr><th>大纲部分</th><th>对应章节</th><th>题量</th><th>原页</th></tr></thead><tbody>' +
      Object.keys(groups).map(k => {
        const cs = groups[k];
        const qs = q846.filter(q => cs.some(c => c.id === q.ch));
        return '<tr><td>' + esc(k) + '</td><td>' + cs.map(c => '第' + c.id + '章').join('、') + '</td><td class="mono">' + qs.length + '</td><td class="mono">' + qs.filter(qp).length + '/' + qs.length + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="small muted" style="margin-top:6px">大纲没有给出各部分的分数权重，因此这里只做“章节是否覆盖”的对照，不生成“分值占比”或“命中率”。</div>';

    out += '<h2 class="sec"><span class="num">06</span>资料全文阅读（OCR）</h2><div class="card">' +
      '<p class="small">三本复习资料已接入 OCR 全文阅读；可全文搜索，也可从概念卡的“资料出处”直接跳原 PDF。手写笔记没有文本层，仍以原页图为主。</p>' +
      '<div class="row" style="margin:10px 0">' +
      ['复习讲义.pdf', '教材考点精讲.pdf', '知识点总结.pdf'].map(d => '<button class="btn sm" data-act="reader-open" data-doc="' + esc(d) + '">阅读 · ' + esc(d.replace('.pdf', '')) + '</button>').join('') +
      '</div>' +
      '<div class="search-box" style="margin:10px 0"><input id="docSearch" placeholder="在三本复习资料中全文检索，如：芽孢 / 溶原 / 培养基"></div>' +
      '<div id="docHits"></div>' +
      '<p class="small muted" style="margin-top:10px">阅读器显示的是 OCR/转换稿，保留原 PDF 链接供核对；不要把 OCR 文字当作教材原文。</p>' +
      '</div>';
    return out;
  }

  /* ---------------- 资料原文 ---------------- */
  App.view_sources = function (v) {
    const qpN = Object.keys(window.KB_QPAGES || {}).length;
    let h = '<h1 class="page-title">资料原文</h1><p class="page-sub">先给清单与来源属性，再给已抽查页面的原图。所有页码为 PDF 物理页（从1起算），印刷页码可能不同。' +
      '题库中 ' + qpN + ' 道题已能在原 PDF 中定位到页，题目卡上的“原卷 pXX”可直接打开。</p>';

    h += '<h2 class="sec"><span class="num">01</span>资料清单</h2><div class="doc-grid">' +
      D.sources.map(d => '<div class="doc"><span class="kind">' + esc(d.kind) + '</span>' +
        '<b>' + esc(d.name) + '</b>' +
        '<p>' + esc(d.pages) + ' · ' + esc(d.attr) + '</p>' +
        '<div class="use">' + esc(d.use) + '</div>' +
        '<p style="margin-top:7px;border-top:1px dashed var(--line-2);padding-top:7px">' + esc(d.note) + '</p></div>').join('') + '</div>';

    h += '<h2 class="sec"><span class="num">02</span>已挂接的原页</h2>' +
      '<p class="page-sub" style="margin-bottom:12px">只收录已抽查并保存的页面，点击可放大。未收录的页面不伪造缩略图。' +
      '知识卡“资料出处”中的页码来自章节点检索；逐题页码定位从转换文件的 page_idx 反查原 PDF，已覆盖 846 真题与练习题中的大部分题目，未命中的题目保留来源与年份，不猜测页码。</p>' +
      '<div class="page-grid">' + D.pages.map(p => '<div class="page-card" data-act="zoom" data-src="' + esc(p.img) + '" data-title="' + esc(p.doc + ' 第' + p.page + '页 · ' + p.title) + '" data-note="' + esc(p.note) + '">' +
        '<div class="thumb"><img src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' +
        '<div class="cap"><b>' + esc(p.title) + '</b><span>' + esc(p.doc) + ' · p' + esc(p.page) + '</span></div></div>').join('') + '</div>';

    h += '<h2 class="sec"><span class="num">03</span>题库覆盖与套卷</h2>';
    h += '<div class="card"><div class="grid g2">' +
      '<div><b class="small">题库构成</b><ul class="small" style="margin:6px 0 0 16px;padding:0">' +
      ['846真题', '校内期末', '其他高校试题', '资料练习', '生成自测'].map(k => {
        const n = D.questions.filter(q => q.source === k).length;
        return '<li>' + k + '：<b class="mono">' + n + '</b> 题</li>';
      }).join('') + '</ul></div>' +
      '<div><b class="small">套卷完整度</b><ul class="small" style="margin:6px 0 0 16px;padding:0">' +
      D.papers.map(p => '<li>' + esc(p.title) + '：<b class="mono">' + p.have + '/' + p.want + '</b>（' + esc(p.level) + '）</li>').join('') +
      '</ul></div></div>' +
      '<p class="small muted" style="margin-top:10px">练习题只收录“能可靠切分且有【答案】或明确答案段落”的题目（' +
      D.questions.filter(q => q.source === '其他高校试题' || q.source === '资料练习').length + ' 题），其余题仍可在原 PDF 中查阅；' +
      '两套期末卷 41 题/套全部入库；未入库的年份不显示为完整卷。</p></div>';

    h += '<h2 class="sec"><span class="num">04</span>页码映射与校核状态</h2>';
    h += '<div class="card"><h3 class="sub">精讲拆分映射</h3>' +
      '<p class="small">《教材考点精讲.pdf》共252页，转换为 part1（1—200页）与 part2（201—252页）。已用 part1 第1、200页与 part2 第1、52页分别与原PDF第1、200、201、252页渲染比对，四组一致，故：</p>' +
      '<div class="callout mono">原 PDF 页序号 ＝ part2 页序号 ＋ 200</div>' +
      '<p class="small muted">印刷页码另存，不与物理页序号混用。</p>';
    h += '<hr class="soft"><h3 class="sub">两套独立状态</h3>' +
      '<div class="grid g2"><div><b class="small">转写状态</b><ul class="small" style="margin:6px 0 0 16px;padding:0">' +
      '<li>机器识别未核</li><li>对照原文已核</li><li>缺字或缺图</li></ul></div>' +
      '<div><b class="small">内容状态</b><ul class="small" style="margin:6px 0 0 16px;padding:0">' +
      '<li>尚未学科校核</li><li>已校核</li><li>存在冲突</li><li>暂无法确定</li></ul></div></div>' +
      '<p class="small muted" style="margin-top:10px">“已对照原文”只说明忠实于资料；“已学科校核”才说明知识本身可靠。来自同一整理链条的多份 PDF 不能作为多项独立证据。</p>';
    h += '<hr class="soft"><h3 class="sub">本版已定位的问题</h3>' +
      '<div class="scroll"><table class="cmp-table" style="font-size:12.5px"><thead><tr><th style="width:22%">问题</th><th>具体位置</th><th style="width:26%">处理</th></tr></thead><tbody>' +
      '<tr><td>英文对应写反</td><td>知识点总结 p23：烈性噬菌体标为 temperate phage，温和噬菌体标为 virulent phage</td><td>概念卡按正确对应记忆，原页保留可核</td></tr>' +
      '<tr><td>英文对应写反</td><td>知识点总结 p25：拟病毒标为 viroid，类病毒标为 virusoid</td><td>同上，标为原资料笔误</td></tr>' +
      '<tr><td>选项漏识别</td><td>2023 卷第1页选择第2题缺 C 选项；第2页选择第14题缺 A 选项</td><td>已按原卷补全，并在题卡注明</td></tr>' +
      '<tr><td>数字可疑</td><td>2023 卷第2页计数题的指数与换算不符</td><td>标“数字待核”，不进入自动判分</td></tr>' +
      '<tr><td>答案冲突</td><td>2023 选择2（芽孢）、2020 选择9（原核真核共同点）、2017 判断10（腮腺炎病原）、2022 期末 A/B 第22题（EMP 关键酶）</td><td>保留原答案并写冲突说明，不自动判分；期末两套已单独标注</td></tr>' +
      '<tr><td>跨年同题缺记录</td><td>2023 材料题与 2019 材料分析题为同题，此前只建了 2023 一条</td><td>已补 2019 记录，并给 2023/2024/2025 补录同题名解，使卷面完整</td></tr>' +
      '<tr><td>双轴状态未落地</td><td>页面早期只有单一 status 字段</td><td>已拆成“转写·已核/未核”与“内容·未校/冲突/待定”两个 chip；仍为推导值，未逐条人工标注</td></tr>' +
      '<tr><td>文件名误导范围</td><td>“真题-2012-2015年.pdf”实含 2012—2025，2025 正文在 p158—160</td><td>年份按正文核定，2025 题已单独入库</td></tr>' +
      '<tr><td>页码批注≠考频</td><td>知识点总结多处批注“26”，但未发现 2026 完整试卷</td><td>批注年份单独显示，标 26*，不计入已验证考频</td></tr>' +
      '</tbody></table></div></div>';
    h += coverageView();
    v.innerHTML = h;
    const ds = v.querySelector('#docSearch');
    if (ds) ds.addEventListener('input', U.debounce(function () { App.readerSearchAll(ds.value); }, 240));
  };

  /* ---------------- 错题与复习 ---------------- */
  App.view_review = function (v) {
    const s = App.store.get();
    const due = App.dueItems();
    const dueAll = App.dueCount();
    const wrongAll = App.wrongList();
    const wrong = wrongAll.filter(x => !x.w.resolved);
    const reasons = ['概念混淆', '漏要点', '公式或单位', '审题', '实验设计', '资料存疑'];

    let h = '<h1 class="page-title">错题与复习</h1><p class="page-sub">复习队列同时安排知识卡和题目，按到期时间与近期错误排序。仅“看过”不增加掌握度。</p>';

    const qDue = Math.max(0, App.dueCount() - due.length);
    if (qDue) h += '<div class="callout"><b>' + qDue + ' 张题目卡到期。</b>知识卡队列在下面；题目卡请到 <a href="#/cards" data-act="review-to-cards">卡片复习</a> 的“今日待学”里过。</div>';
    h += '<h2 class="sec"><span class="num">01</span>今日复习队列 <span class="chip accent">' + due.length + ' 项</span>' +
      '<span class="small muted" style="font-weight:400">每日上限 ' + (s.dailyLimit || 15) + ' 项</span></h2>';
    if (!due.length) {
      h += '<div class="callout">今天没有到期项目。可以在知识卡里把节点标为“模糊/会/熟练”，系统会按 1／3／7 天间隔排入队列。</div>';
    } else {
      const cap = s.dailyLimit || 15;
      const shown = due.slice(0, cap);
      if (due.length > cap) h += '<div class="callout">今日到期 ' + due.length + ' 项，按每日上限先安排 ' + cap + ' 项；其余保留在队列中，明天或调高上限后继续。</div>';
      h += '<div class="card" style="padding:8px 10px">' + shown.map(it => {
        const c = D.byCid[it.cid]; if (!c) return '';
        return '<div class="node" style="align-items:center;cursor:default">' +
          '<span class="st m' + App.mastery(c.id) + '"></span>' +
          '<div class="tx" data-act="open-c" data-cid="' + c.id + '" style="cursor:pointer"><b>' + esc(c.name) + '</b>' +
          '<span>第' + c.ch + '章 · 上次间隔 ' + (it.iv || 1) + ' 天 · 到期 ' + esc(it.due) + '</span></div>' +
          '<div class="row" style="gap:4px">' +
          '<button class="btn sm" data-act="rev" data-cid="' + c.id + '" data-g="0">不会</button>' +
          '<button class="btn sm" data-act="rev" data-cid="' + c.id + '" data-g="1">模糊</button>' +
          '<button class="btn sm" data-act="rev" data-cid="' + c.id + '" data-g="2">记得</button>' +
          '</div></div>';
      }).join('') + '</div>';
    }

    const wrongActive = wrong.filter(x => !x.w.resolved);
    const wrongDone = wrong.filter(x => x.w.resolved);
    h += '<h2 class="sec"><span class="num">02</span>错题本 <span class="chip">' + wrongActive.length + ' 题待攻克</span>' +
      (wrongDone.length ? '<span class="chip ok">' + wrongDone.length + ' 题已攻克</span>' : '') + '</h2>';
    if (!wrongActive.length) {
      h += '<div class="callout">还没有错题。做题时答错或在主观题自评“不会/模糊”，会自动进入这里，并可选择错因。</div>';
    } else {
      h += wrongActive.map(x => {
        const q = x.q;
        return '<div class="q-card"><div class="q-hd"><span class="no">' + esc(q.id) + '</span>' +
          '<span class="chip accent">' + q.year + '</span><span class="chip">' + esc(q.type) + '</span>' +
          '<span class="chip ' + (x.w.cause === '资料存疑' ? 'warn' : '') + '">' + esc(x.w.cause || '未标错因') + '</span>' +
          '<span class="small muted" style="margin-left:auto">' + esc((x.w.at || '').slice(0, 10)) + '</span></div>' +
          '<div class="q-stem">' + U.hl(App.stripLen(q.stem, 96), '') + '</div>' +
          '<div class="row"><select class="f" data-act="cause" data-qid="' + q.id + '">' +
          '<option value="">选择错因…</option>' + reasons.map(r => '<option ' + (x.w.cause === r ? 'selected' : '') + '>' + r + '</option>').join('') + '</select>' +
          '<button class="btn sm" data-act="redo" data-qid="' + q.id + '">重做</button>' +
          '<button class="btn sm" data-act="del-wrong" data-qid="' + q.id + '">移出错题本</button></div></div>';
      }).join('');
    }

    if (wrongDone.length) {
      h += '<details class="resolved-box"><summary>已攻克的错题 · ' + wrongDone.length + ' 题（保留历史，可重做）</summary>' +
        wrongDone.map(x => '<div class="spread" style="padding:6px 0;border-bottom:1px dashed var(--line-2)">' +
          '<span class="small">' + esc(App.stripLen(x.q.stem, 46)) + '<span class="muted"> · ' + esc((x.q.year || '自测')) + ' 年 · ' + esc(App.localDay(x.w.resolved)) + '</span></span>' +
          '<span class="row" style="gap:4px"><button class="btn sm" data-act="redo" data-qid="' + x.qid + '">重做</button>' +
          '<button class="btn sm ghost" data-act="del-wrong" data-qid="' + x.qid + '">移出</button></span></div>').join('') +
        '</details>';
    }

    h += '<h2 class="sec"><span class="num">03</span>设置与数据</h2>';
    h += '<div class="card"><div class="grid g2">' +
      '<div><label class="small muted">考试日期（用于倒计时与每日配额）</label>' +
      '<input class="f" type="date" id="examDate" value="' + esc(s.examDate) + '" style="width:100%;margin-top:4px"></div>' +
      '<div><label class="small muted">每日复习上限</label>' +
      '<input class="f" type="number" min="5" max="80" id="dailyLimit" value="' + (s.dailyLimit || 15) + '" style="width:100%;margin-top:4px"></div>' +
      '<div><label class="small muted">每日新卡上限（卡片复习）</label>' +
      '<input class="f" type="number" min="0" max="50" id="dailyNew" value="' + (s.dailyNew || 10) + '" style="width:100%;margin-top:4px"></div>' +
      '</div><div class="row" style="margin-top:12px">' +
      '<button class="btn primary" data-act="save-settings">保存设置</button>' +
      '<button class="btn" data-act="export">导出学习记录</button>' +
      '<button class="btn" data-act="import">导入备份</button>' +
      '' +
      '</div><p class="small muted" style="margin-top:10px">记录保存在本机浏览器 localStorage。清理浏览器数据会丢失，建议每周导出一次 JSON 备份。' +
      (s.lastExport ? '上次导出：' + esc(s.lastExport) : '<b style="color:var(--warn)">尚未导出过备份</b>') + '</p></div>';

    h += '<div class="card"><h3 class="sub" style="margin-top:0">简单间隔规则</h3>' +
      '<p class="small">“不会”1 天后、“模糊”3 天后、“记得”7 天后再次出现，此后每次“记得”把间隔乘以约 1.9，最长 60 天。规则可解释、可调整，不使用黑箱记忆模型。</p></div>';

    v.innerHTML = h;
    const ed = $('#examDate');
    if (ed) ed.addEventListener('change', function () {
      const s = App.store.get();
      s.examDate = this.value; App.store.save(); App.toast('考试日期已保存');
    });
  };
})();
