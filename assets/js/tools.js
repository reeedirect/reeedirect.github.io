/* ============ 专题工具 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, esc = U.esc, D = App.data;
  App.toolState = App.toolState || { tab: 'compare', deck: 0, mask: false, stage: null, hideLabels: false, quiz: null };

  const STAGES = [
    { key: 'I', name: '延滞期', short: '数量不增加，合成代谢活跃',
      points: ['生长速率常数 R = 0，细胞数量不增加', '细胞形态变大或增长', 'RNA（尤其 rRNA）含量高，原生质呈嗜碱性', '合成代谢活跃，核糖体、酶、ATP 大量合成，易产生诱导酶', '对不良环境（温度、盐浓度、抗生素）敏感', '影响长短：菌种、接种龄、接种量、培养基成分、种子损伤度'] },
    { key: 'II', name: '指数期', short: 'R 最大，代时最短',
      points: ['生长速率常数 R 最大，代时/倍增时间最短', '细胞进行平衡生长，菌体成分均匀', '酶系活跃，代谢旺盛', '影响代时：菌种、营养成分、营养物浓度、培养温度', '是接种用种子的最佳时期，也是测代时的适宜时期'] },
    { key: 'III', name: '稳定期', short: 'R = 0，菌体产量最高',
      points: ['R = 0，菌体产量达到最高点，活菌数最高并维持稳定', '积累糖原、异染颗粒、脂肪等内含物；芽孢杆菌开始形成芽孢', '部分微生物开始产生次生代谢物', '到来原因：营养耗尽、营养比例失调、有害代谢物积累、pH 与氧化还原电位恶化'] },
    { key: 'IV', name: '衰亡期', short: 'R < 0，群体负生长',
      points: ['死亡速度超过新生速度，群体呈负生长（R 为负值）', '细胞形态多形化，大小悬殊', '蛋白水解酶活力增强导致自溶', '有的微生物继续合成或释放抗生素等次生代谢物', '发酵应在此期前放罐，避免自溶'] }
  ];
  App.STAGES = STAGES;

  function decks() {
    const out = (window.KB_COMPARE_EXTRA || []).slice();
    D.concepts.forEach(c => { if (c.compare) c.compare.forEach((cp, i) => out.push(Object.assign({ id: c.id + '-' + i, cids: [c.id] }, cp))); });
    return out;
  }
  App.allDecks = decks;

  /* ---------------- 主视图 ---------------- */
  App.view_tools = function (v) {
    const t = App.toolState;
    const tabs = [['compare', '易混对比'], ['growth', '生长曲线'], ['img', '识图与结构'], ['order', '流程排序'], ['gen', '世代时间'], ['plate', '稀释计数'], ['sampling', '抽检判定']];
    let h = '<h1 class="page-title">专题工具</h1><p class="page-sub">针对这批资料特别适合的交互：易混概念对比、生长曲线遮挡回忆、代时与平板计数、食品抽检判定。计算器只做题内换算，不生成预测。</p>';
    h += '<div class="tool-nav">' + tabs.map(x => '<button class="' + (t.tab === x[0] ? 'on' : '') + '" data-act="tool-tab" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';

    if (t.tab === 'compare') h += viewCompare();
    else if (t.tab === 'growth') h += viewGrowth();
    else if (t.tab === 'img') {
      h += '<div class="row" style="margin-bottom:10px">' +
        '<button class="btn sm ' + (t.imgMode !== 'wall' ? 'on' : '') + '" data-act="img-mode" data-v="spore">芽孢层次标注</button>' +
        '<button class="btn sm ' + (t.imgMode === 'wall' ? 'on' : '') + '" data-act="img-mode" data-v="wall">细胞壁成分归类</button></div>';
      h += t.imgMode === 'wall' ? App.renderWallSort() : App.renderImgQuiz();
    }
    else if (t.tab === 'order') h += viewOrder();
    else if (t.tab === 'gen') h += viewGen();
    else if (t.tab === 'plate') h += viewPlate();
    else h += viewSampling();

    v.innerHTML = h;
  };

  /* ---------------- 对比卡 ---------------- */
  App.refreshTool = function () {
    const y = window.scrollY;
    App.view_tools($('#view'));
    window.scrollTo(0, y);
  };

  const SEQS = [
    { id: 'gram', name: '革兰氏染色步骤', items: ['结晶紫初染', '碘液媒染', '乙醇脱色', '番红复染'], note: '脱色是关键步骤；复染可省略，脱色后已能区分 G+ 紫色与 G− 无色。' },
    { id: 'phage', name: '烈性噬菌体生活史', items: ['吸附', '侵入', '增殖（复制与合成）', '成熟（装配）', '裂解（释放）'], note: '五阶段连续完成；裂解靠脂肪酶与溶菌酶。' },
    { id: 'peptido', name: '肽聚糖合成三阶段', items: ['细胞质中合成 UDP-胞壁酸五肽', '细胞膜上接糖与肽桥（细菌萜醇）', '细胞膜外转肽交联'], note: '青霉素抑制膜外转肽酶，阻断交联。' },
    { id: 'plate', name: '稀释平板计数流程', items: ['样品梯度稀释', '涂布或混浇平板', '恒温培养', '选 30～300 的平板计数', '按稀释倍数与体积换算'], note: '一个菌落代表一个活细胞；选 30～300 个菌落的平板。' }
  ];
  App.orderState = App.orderState || { id: 'gram', pool: null, picks: [], checked: false };

  function viewOrder() {
    const st = App.orderState;
    const seq = SEQS.find(x => x.id === st.id) || SEQS[0];
    if (!st.pool || st.seqId !== st.id) {
      st.seqId = st.id;
      st.pool = seq.items.map((t, i) => ({ t: t, i: i })).sort(() => Math.random() - 0.5);
      st.picks = []; st.checked = false;
    }
    let h = '<div class="row" style="margin-bottom:12px">' + SEQS.map(x =>
      '<button class="btn sm ' + (st.id === x.id ? 'on' : '') + '" data-act="order-seq" data-v="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div>';
    h += '<div class="card"><h3 class="sub" style="margin-top:0">' + esc(seq.name) + '</h3>' +
      '<p class="small muted">按正确顺序依次点击下方步骤；点错可点击已选步骤取回。</p>' +
      '<div class="order-picks">' + (st.picks.length ? st.picks.map((p, i) =>
        '<span class="order-chip picked" data-act="order-unpick" data-i="' + i + '"><b>' + (i + 1) + '</b>' + esc(seq.items[p]) + '</span>').join('') : '<span class="muted small">尚未选择</span>') + '</div>' +
      '<div class="label-pool">' + st.pool.map(p => {
        const used = st.picks.indexOf(p.i) >= 0;
        return '<span class="drag-label' + (used ? ' used' : '') + '" data-act="order-pick" data-i="' + p.i + '">' + esc(seq.items[p.i]) + '</span>';
      }).join('') + '</div>' +
      '<div class="row"><button class="btn primary" data-act="order-check">检查顺序</button>' +
      '<button class="btn" data-act="order-reset">重来</button>' +
      (st.checked ? '<span class="verdict ' + (st.picks.every((v, i) => v === i) && st.picks.length === seq.items.length ? 'ok' : 'mid') + '">' +
        (st.picks.length !== seq.items.length ? '还有步骤未选' : (st.picks.every((v, i) => v === i) ? '顺序完全正确' : '顺序有误：红色为位置不对')) + '</span>' : '') +
      '</div>';
    if (st.checked) {
      h += '<div class="order-check">' + seq.items.map((t, i) => {
        const ok = st.picks[i] === i;
        return '<div class="' + (ok ? 'ok' : 'bad') + '"><b>' + (i + 1) + '</b>' + esc(t) + '</div>';
      }).join('') + '</div>';
    }
    h += '<div class="callout">' + esc(seq.note) + '</div></div>';
    return h;
  }

  function viewCompare() {
    const t = App.toolState, list = App.allDecks();
    const d = list[Math.min(t.deck, list.length - 1)];
    let h = '<div class="row" style="margin-bottom:12px">' +
      '<select class="f" data-act="deck-select" style="min-width:280px">' +
      list.map((x, i) => '<option value="' + i + '" ' + (i === t.deck ? 'selected' : '') + '>' + esc(x.title) + '</option>').join('') + '</select>' +
      '<button class="btn ' + (t.mask ? 'on' : '') + '" data-act="cmp-mask">' + (t.mask ? '已隐藏内容' : '隐藏内容自测') + '</button>' +
      '<button class="btn" data-act="cmp-reveal">全部揭示</button>' +
      '<button class="btn" data-act="cmp-random">随机抽一格提问</button>' +
      '</div>';

    h += '<div class="card" style="padding:0;overflow:hidden"><div class="scroll">' +
      '<table class="cmp-table"><thead><tr>' + d.cols.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      d.rows.map(r => '<tr>' + r.map((cell, i) => '<td' + (i > 0 && t.mask ? ' class="masked" data-act="unmask"' : '') + '>' + esc(cell) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div></div>';

    h += '<div class="callout" style="margin-top:12px">用法：点“隐藏内容自测”，先自行回忆每一格，再点击格子揭示。' +
      '这张表的来源是该考点在多份资料中的共同表述；若与你的教材版本有差异，以教材为准并在知识卡里记笔记。</div>';

    if (d.cids && d.cids.length) {
      h += '<div class="row">' + d.cids.map(cid => {
        const c = D.byCid[cid];
        return c ? '<span class="chip" style="cursor:pointer" data-act="open-c" data-cid="' + cid + '">查看知识卡 · ' + esc(c.name) + '</span>' : '';
      }).join('') + '</div>';
    }
    return h;
  }

  /* ---------------- 生长曲线 ---------------- */
  function viewGrowth() {
    const t = App.toolState;
    const sel = t.stage;
    let h = '<div class="row" style="margin-bottom:10px">' +
      '<button class="btn ' + (t.hideLabels ? 'on' : '') + '" data-act="growth-labels">' + (t.hideLabels ? '显示阶段名称' : '遮挡阶段名称') + '</button>' +
      '<button class="btn" data-act="growth-quiz">随机抽问</button>' +
      '<span class="small muted">曲线为简化示意，用于记忆分期与趋势，不是实验拟合数据。</span></div>';

    h += '<div class="growth-wrap"><svg viewBox="0 0 680 340" role="img" aria-label="微生物生长曲线示意">' +
      '<defs><linearGradient id="bandSel" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#14655a" stop-opacity=".16"/><stop offset="100%" stop-color="#14655a" stop-opacity=".03"/></linearGradient></defs>' +
      [70, 165, 300, 480, 650].map((x, i) => {
        if (i === 4) return '';
        const w = [70, 165, 300, 480, 650][i + 1] - x;
        const on = sel === i;
        return '<rect x="' + x + '" y="40" width="' + w + '" height="250" fill="' + (on ? 'url(#bandSel)' : (i % 2 ? '#faf8f2' : '#fdfcf8')) + '" stroke="#e5dfd2" stroke-width="".5"' +
          ' data-act="stage" data-i="' + i + '" style="cursor:pointer"/>';
      }).join('') +
      '<line x1="70" y1="290" x2="650" y2="290" stroke="#c9c4b8" stroke-width="1.2"/>' +
      '<line x1="70" y1="40" x2="70" y2="290" stroke="#c9c4b8" stroke-width="1.2"/>' +
      '<text x="70" y="308" font-size="10.5" fill="#878d86">0</text>' +
      '<text x="640" y="308" font-size="11" fill="#49514b" text-anchor="end">培养时间 / h</text>' +
      '<text x="58" y="46" font-size="11" fill="#49514b" text-anchor="end" transform="rotate(-90 58 46)" style="display:none">y</text>' +
      '<text x="20" y="170" font-size="11" fill="#49514b" transform="rotate(-90 20 170)" text-anchor="middle">lg（细胞数 · mL⁻¹）</text>' +
      /* 总菌数（虚线，后期高于活菌数） */
      '<path d="M70,262 C110,262 135,258 160,240 C185,215 195,150 225,130 C255,110 300,108 340,108 L480,108 C520,108 545,112 575,130 C610,152 635,175 650,186" fill="none" stroke="#b08a4a" stroke-width="1.8" stroke-dasharray="6 5"/>' +
      /* 活菌数（实线） */
      '<path d="M70,262 C110,262 135,258 160,240 C185,215 195,150 225,130 C255,110 300,108 340,108 L480,108 C510,108 530,150 570,210 C600,252 630,268 650,276" fill="none" stroke="#14655a" stroke-width="2.4"/>' +
      '<text x="596" y="176" font-size="11" fill="#8a6a33">总菌数</text>' +
      '<text x="596" y="272" font-size="11" fill="#14655a">活菌数</text>' +
      STAGES.map((s, i) => {
        const cx = [117, 232, 390, 565][i];
        return '<text x="' + cx + '" y="332" font-size="12" fill="' + (sel === i ? '#0e4a42' : '#878d86') + '" text-anchor="middle" font-family="monospace">' + s.key + '</text>' +
          (t.hideLabels ? '' : '<text x="' + cx + '" y="' + (i === 0 ? 322 : 322) + '" font-size="10.5" fill="' + (sel === i ? '#0e4a42' : '#9a9e97') + '" text-anchor="middle" style="display:none">' + s.name + '</text>');
      }).join('') +
      '</svg></div>';

    /* 阶段名称单独放在图下方，遮挡时不显示文字，避免 SVG 内文字挤压 */
    h += '<div class="grid g4" style="margin-top:8px">' + STAGES.map((s, i) =>
      '<button class="btn ' + (sel === i ? 'on' : '') + '" data-act="stage" data-i="' + i + '" style="justify-content:center">' +
      (t.hideLabels ? s.key : s.key + ' · ' + s.name) + '</button>').join('') + '</div>';

    if (sel === null) {
      h += '<div class="stage-info"><h5>点击阶段查看特点</h5><p class="muted">先自己回忆四个阶段的名称与关键特征，再点开核对。注意区分“总菌数”与“活菌数”：只有指数期两者几乎相等。</p></div>';
    } else {
      const s = STAGES[sel];
      h += '<div class="stage-info"><div class="spread"><h5>' + s.key + ' · ' + s.name + '</h5>' +
        '<span class="chip accent">' + esc(s.short) + '</span></div>' +
        '<ul style="margin:6px 0 0 17px;padding:0;font-size:13px;line-height:1.8">' + s.points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
        '<div class="row" style="margin-top:9px"><button class="btn sm" data-act="open-c" data-cid="c7-2">打开知识卡</button>' +
        '<button class="btn sm" data-act="open-page" data-pg="pg-notes-58">看手写笔记 p58</button></div></div>';
    }

    h += '<div class="callout warn" style="margin-top:12px"><b>常见混淆：</b>稳定期“细胞分裂速率降低/增加”都不对，正确是 R=0；衰亡期才出现负生长与自溶。' +
      '总菌数在稳定期后仍可维持或略升，活菌数则开始下降。</div>';
    return h;
  }

  /* ---------------- 世代时间 ---------------- */
  function viewGen() {
    return '<div class="card"><h3 class="sub" style="margin-top:0">世代时间（代时）计算</h3>' +
      '<p class="small muted">公式：n = log₂(Nt / N0) = 3.322 × lg(Nt / N0)，g = t / n。适用于指数期。</p>' +
      '<div class="calc">' +
      '<div><label>起始菌数 N0</label><input id="gN0" value="1000" inputmode="decimal"></div>' +
      '<div><label>培养后菌数 Nt</label><input id="gNt" value="1000000" inputmode="decimal"></div>' +
      '<div><label>培养时间 t（h）</label><input id="gT" value="5" inputmode="decimal"></div>' +
      '<div><button class="btn primary" data-act="calc-gen" style="width:100%">计算</button></div>' +
      '</div><div id="genOut"></div></div>' +

      '<div class="card"><h3 class="sub" style="margin-top:0">反向验算</h3>' +
      '<p class="small muted">已知代时与时间，估算菌数增长倍数：Nt = N0 × 2^(t/g)。</p>' +
      '<div class="calc">' +
      '<div><label>起始菌数 N0</label><input id="rN0" value="1000" inputmode="decimal"></div>' +
      '<div><label>代时 g（min）</label><input id="rG" value="30" inputmode="decimal"></div>' +
      '<div><label>培养时间 t（h）</label><input id="rT" value="5" inputmode="decimal"></div>' +
      '<div><button class="btn" data-act="calc-rev" style="width:100%">验算</button></div>' +
      '</div><div id="revOut"></div></div>' +

      '<div class="callout">单位要与题目一致：代时常用 min，培养时间常用 h，换算时 ×60。题目若给“稀释度/平板计数”，先算 CFU 再代入。<br>' +
      '本工具只做数学换算，不判断题目数据是否合理；数字可疑的真题（如 2023 计数题）请对照原卷。</div>';
  }



  App.calcGen = function () {
    const n0 = parseFloat($('#gN0').value), nt = parseFloat($('#gNt').value), t = parseFloat($('#gT').value);
    const out = $('#genOut');
    if (!(n0 > 0) || !(nt > 0) || !(t > 0) || nt <= n0) {
      out.innerHTML = '<div class="callout danger">请输入正数，且 Nt 应大于 N0。</div>'; return;
    }
    const n = Math.log2(nt / n0);
    const g = t / n;
    out.innerHTML = '<div class="result"><b>' + g.toFixed(2) + ' h</b> 每个世代（≈ ' + (g * 60).toFixed(1) + ' min）' +
      '<ul class="steps"><li>Nt / N0 = ' + (nt / n0).toExponential(3) + '</li>' +
      '<li>n = log₂(Nt/N0) = ' + n.toFixed(2) + ' 代</li>' +
      '<li>g = t / n = ' + t + ' / ' + n.toFixed(2) + ' = ' + g.toFixed(3) + ' h</li></ul></div>';
  };

  App.calcRev = function () {
    const n0 = parseFloat($('#rN0').value), g = parseFloat($('#rG').value), t = parseFloat($('#rT').value);
    const out = $('#revOut');
    if (!(n0 > 0) || !(g > 0) || !(t > 0)) { out.innerHTML = '<div class="callout danger">请输入正数。</div>'; return; }
    const n = (t * 60) / g;
    const nt = n0 * Math.pow(2, n);
    out.innerHTML = '<div class="result"><b>' + nt.toExponential(2) + '</b> 个细胞' +
      '<ul class="steps"><li>分裂代数 n = t×60 / g = ' + (t * 60) + ' / ' + g + ' = ' + n.toFixed(2) + '</li>' +
      '<li>Nt = N0 × 2^n = ' + n0 + ' × 2^' + n.toFixed(2) + '</li></ul></div>';
  };

  /* ---------------- 稀释平板计数 ---------------- */
  function viewPlate() {
    return '<div class="card"><h3 class="sub" style="margin-top:0">稀释平板计数</h3>' +
      '<p class="small muted">CFU/mL ＝ 平均菌落数 × 稀释倍数 ÷ 接种体积(mL)。液体样品用 mL，固体样品按均质后取样质量换算为 CFU/g。</p>' +
      '<div class="calc">' +
      '<div><label>稀释度</label><select id="pDil" class="f" style="width:100%;padding:7px 9px">' +
      [1, 2, 3, 4, 5, 6, 7].map(x => '<option value="' + x + '" ' + (x === 3 ? 'selected' : '') + '>10⁻' + sup(x) + '</option>').join('') +
      '</select></div>' +
      '<div><label>平板平均菌落数</label><input id="pCnt" value="50" inputmode="decimal"></div>' +
      '<div><label>接种体积（mL）</label><input id="pVol" value="1" inputmode="decimal"></div>' +
      '<div><button class="btn primary" data-act="calc-plate" style="width:100%">计算</button></div>' +
      '</div><div id="plateOut"></div></div>' +

      '<div class="card"><h3 class="sub" style="margin-top:0">两个稀释度如何取舍</h3>' +
      '<p class="small muted">两个稀释度菌落数都在 30～300 时：比值 ≤2 取两者平均；比值 >2 取较小稀释度（菌数较少的那组）的结果。</p>' +
      '<div class="calc">' +
      '<div><label>较低稀释度菌落数</label><input id="cA" value="200" inputmode="decimal"></div>' +
      '<div><label>其稀释指数（10⁻ⁿ）</label><input id="dA" value="2" inputmode="decimal"></div>' +
      '<div><label>较高稀释度菌落数</label><input id="cB" value="50" inputmode="decimal"></div>' +
      '<div><label>其稀释指数（10⁻ⁿ）</label><input id="dB" value="3" inputmode="decimal"></div>' +
      '</div><div class="row" style="margin-top:10px"><button class="btn" data-act="calc-two">按规则判定</button></div>' +
      '<div id="twoOut"></div></div>' +

      '<div class="callout"><b>计数规则：</b>选 30～300 个菌落的平板（SN 标准 25～250）。若所有稀释度均不在区间：均 >300 取最高稀释度乘倍数；均 <30 取最低稀释度乘倍数；<1 按最低稀释度报告。<br>' +
      '“多不可计”的平板不能直接参与计算。</div>';
  }

  function sup(n) {
    const m = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    return String(n).split('').map(x => m[x] || x).join('');
  }

  App.calcPlate = function () {
    const dil = +$('#pDil').value, cnt = parseFloat($('#pCnt').value), vol = parseFloat($('#pVol').value);
    const out = $('#plateOut');
    if (!(cnt >= 0) || !(vol > 0)) { out.innerHTML = '<div class="callout danger">请输入有效的菌落数与接种体积。</div>'; return; }
    const factor = Math.pow(10, dil);
    const cfu = cnt * factor / vol;
    let warn = '';
    if (cnt < 30) warn = '<div class="callout warn">菌落数低于 30，统计误差较大，按规则应改选更低稀释度或报告为估计值。</div>';
    if (cnt > 300) warn = '<div class="callout warn">菌落数高于 300，平板过密易漏计，按规则应改选更高稀释度。</div>';
    out.innerHTML = '<div class="result"><b>' + cfu.toExponential(2) + ' CFU/mL</b>' +
      '<ul class="steps"><li>稀释倍数 = 10^' + dil + ' = ' + factor + '</li>' +
      '<li>CFU = ' + cnt + ' × ' + factor + ' ÷ ' + vol + ' mL = ' + cfu.toExponential(3) + '</li>' +
      '<li>可读作 ' + fmtCFU(cfu) + ' CFU/mL</li></ul></div>' + warn;
  };

  App.calcTwo = function () {
    const a = parseFloat($('#cA').value), da = parseFloat($('#dA').value);
    const b = parseFloat($('#cB').value), db = parseFloat($('#dB').value);
    const out = $('#twoOut');
    if (!(a > 0) || !(b > 0)) { out.innerHTML = '<div class="callout danger">请输入有效的菌落数。</div>'; return; }
    const inA = a >= 30 && a <= 300, inB = b >= 30 && b <= 300;
    const va = a * Math.pow(10, da), vb = b * Math.pow(10, db);
    const ratio = Math.max(va, vb) / Math.min(va, vb);
    let verdict, cfu;
    if (inA && inB) {
      if (ratio <= 2) { verdict = '两个稀释度都在 30～300，且比值 ' + ratio.toFixed(2) + ' ≤ 2，取平均值报告。'; cfu = (va + vb) / 2; }
      else { verdict = '两个稀释度都在 30～300，但比值 ' + ratio.toFixed(2) + ' > 2，取较小稀释度的结果。'; cfu = Math.min(va, vb); }
    } else if (inA) { verdict = '只有 10⁻' + sup(da) + ' 在 30～300 内，直接采用该稀释度。'; cfu = va; }
    else if (inB) { verdict = '只有 10⁻' + sup(db) + ' 在 30～300 内，直接采用该稀释度。'; cfu = vb; }
    else { verdict = '两个稀释度都不在 30～300，需按“均 >300 / 均 <30”的特殊规则处理。'; cfu = null; }
    out.innerHTML = '<div class="result">' + (cfu ? '<b>' + cfu.toExponential(2) + ' CFU/mL</b>' : '<b>需按特殊规则</b>') +
      '<ul class="steps"><li>10⁻' + sup(da) + '：' + a + ' 个 → ' + va.toExponential(2) + ' CFU/mL（' + (inA ? '在区间内' : '不在区间') + '）</li>' +
      '<li>10⁻' + sup(db) + '：' + b + ' 个 → ' + vb.toExponential(2) + ' CFU/mL（' + (inB ? '在区间内' : '不在区间') + '）</li>' +
      '<li>' + verdict + '</li></ul></div>';
  };

  function fmtCFU(n) {
    if (n >= 1e8 || n < 1e3) return n.toExponential(2);
    const e = Math.floor(Math.log10(n));
    const m = n / Math.pow(10, e);
    return m.toFixed(1) + '×10' + sup(e);
  }

  /* ---------------- 抽检判定 ---------------- */
  function viewSampling() {
    const samples = ['220000', '180000', '25000', '190000', '21000'];
    return '<div class="card"><h3 class="sub" style="margin-top:0">食品抽检 n / c / m / M 判定</h3>' +
      '<p class="small muted">规则：任一检样 > M 即不合格；检出值在 m 与 M 之间的样品数超过 c 也不合格。该情境取自 2023 年真题所给历史标准，不代表现行通用限量。</p>' +
      '<div class="calc">' +
      '<div><label>n（采样件数）</label><input id="snN" value="5" inputmode="numeric"></div>' +
      '<div><label>c（允许超 m 的件数）</label><input id="snC" value="2" inputmode="numeric"></div>' +
      '<div><label>m（可接受限量）</label><input id="snM" value="10000" inputmode="numeric"></div>' +
      '<div><label>M（最高安全限量）</label><input id="snMM" value="100000" inputmode="numeric"></div>' +
      '</div>' +
      '<table class="judge-table" style="margin-top:12px"><thead><tr><th>检样</th><th>检验结果（CFU/g）</th><th>与 m / M 比较</th><th>判定</th></tr></thead><tbody>' +
      samples.map((x, i) => '<tr><td>样品 ' + (i + 1) + '</td><td><input class="sVal" value="' + x + '" inputmode="numeric"></td>' +
        '<td class="sCmp">—</td><td class="sRes">—</td></tr>').join('') +
      '</tbody></table>' +
      '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="judge">判定</button>' +
      '<button class="btn" data-act="judge-reset">恢复真题数据</button></div>' +
      '<div id="judgeOut"></div></div>';
  }

  App.judge = function (reset) {
    const n = +$('#snN').value, c = +$('#snC').value, m = +$('#snM').value, M = +$('#snMM').value;
    if (reset) {
      $$('.sVal').forEach((el, i) => el.value = ['220000', '180000', '25000', '190000', '21000'][i]);
    }
    const vals = $$('.sVal').map(el => parseFloat(el.value) || 0);
    let overM = 0, between = 0;
    vals.forEach((val, i) => {
      const cmp = val > M ? '> M' : val > m ? 'm ~ M' : '≤ m';
      let verdict = '<span class="tag-ok">可接受</span>';
      if (val > M) { verdict = '<span class="tag-no">超过 M</span>'; overM++; }
      else if (val > m) { between++; verdict = '<span style="color:var(--warn)">超过 m</span>'; }
      const row = $$('.judge-table tbody tr')[i];
      row.querySelector('.sCmp').textContent = cmp;
      row.querySelector('.sRes').innerHTML = verdict;
    });
    let out;
    if (overM > 0) out = '<div class="result"><b style="color:var(--danger)">不合格</b><ul class="steps">' +
      '<li>有 ' + overM + ' 件超过 M＝' + M.toLocaleString() + '，按规则任一件超过 M 即判不合格。</li>' +
      '<li>另有 ' + between + ' 件落在 m～M 之间（允许 ' + c + ' 件）。</li></ul></div>';
    else if (between > c) out = '<div class="result"><b style="color:var(--danger)">不合格</b><ul class="steps">' +
      '<li>没有样品超过 M，但有 ' + between + ' 件超过 m，超过允许件数 c＝' + c + '。</li></ul></div>';
    else out = '<div class="result"><b style="color:var(--ok)">合格</b><ul class="steps">' +
      '<li>无样品超过 M＝' + M.toLocaleString() + '；超过 m 的样品为 ' + between + ' 件，未超过 c＝' + c + '。</li>' +
      '<li>采样件数 n＝' + n + '，与表中样品数一致。</li></ul></div>';
    $('#judgeOut').innerHTML = out;
  };

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act, ts = App.toolState;

    if (act === 'tool-tab') { ts.tab = t.dataset.v; App.view_tools($('#view')); return; }
    if (act === 'img-mode') { ts.imgMode = t.dataset.v; App.view_tools($('#view')); return; }
    if (act === 'order-seq') { App.orderState = { id: t.dataset.v, pool: null, picks: [], checked: false }; App.view_tools($('#view')); return; }
    if (act === 'order-pick') {
      const st = App.orderState, i = +t.dataset.i;
      if (st.picks.indexOf(i) < 0) st.picks.push(i);
      st.checked = false; App.view_tools($('#view')); return;
    }
    if (act === 'order-unpick') {
      const st = App.orderState; st.picks.splice(+t.dataset.i, 1); st.checked = false;
      App.view_tools($('#view')); return;
    }
    if (act === 'order-check') {
      App.orderState.checked = true;
      App.view_tools($('#view')); return;
    }
    if (act === 'order-reset') { App.orderState.pool = null; App.orderState.picks = []; App.orderState.checked = false; App.view_tools($('#view')); return; }
    if (act === 'deck-select') return;
    if (act === 'cmp-mask') { ts.mask = !ts.mask; App.view_tools($('#view')); return; }
    if (act === 'cmp-reveal') { $$('.cmp-table td.masked').forEach(x => x.classList.remove('masked')); return; }
    if (act === 'cmp-random') {
      const all = $$('.cmp-table tbody td').filter(x => x.cellIndex > 0);
      if (!all.length) return;
      all.forEach(c => c.classList.remove('masked'));
      const pick = all[Math.floor(Math.random() * all.length)];
      const head = pick.closest('table').querySelectorAll('thead th')[pick.cellIndex].textContent;
      pick.classList.add('masked');
      App.toast('请回忆：' + head + ' 这一格应填什么？');
      return;
    }
    if (act === 'stage') { ts.stage = +t.dataset.i; App.view_tools($('#view')); return; }
    if (act === 'growth-labels') { ts.hideLabels = !ts.hideLabels; App.view_tools($('#view')); return; }
    if (act === 'growth-quiz') {
      const i = Math.floor(Math.random() * 4);
      const s = STAGES[i];
      App.modal('<div class="modal-pad"><h3>这个阶段是？</h3><p class="small muted">根据下列特征，说出阶段名称，再揭示答案。</p>' +
        '<ul class="ans-block pts">' + s.points.slice(0, 3).map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
        '<div id="quizAns" style="display:none" class="result"><b>' + s.key + ' · ' + s.name + '</b></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn primary" onclick="document.getElementById(\'quizAns\').style.display=\'block\'">揭示答案</button></div></div>');
      return;
    }
    if (act === 'open-page') {
      const p = (D.pages || []).find(x => x.id === t.dataset.pg);
      if (p) App.imageModal(p.img, p.doc + ' 第' + p.page + '页 · ' + p.title, p.note);
      return;
    }
    if (act === 'calc-gen') { App.calcGen(); return; }
    if (act === 'calc-rev') { App.calcRev(); return; }
    if (act === 'calc-plate') { App.calcPlate(); return; }
    if (act === 'calc-two') { App.calcTwo(); return; }
    if (act === 'judge') { App.judge(false); return; }
    if (act === 'judge-reset') { App.judge(true); return; }
  });

  document.addEventListener('change', function (e) {
    if (e.target.matches('select[data-act="deck-select"]')) {
      App.toolState.deck = +e.target.value; App.view_tools($('#view'));
    }
  });

  /* 初始化一次抽检判定 */
  App.initTools = function () { };
})();
