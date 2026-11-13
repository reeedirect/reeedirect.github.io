/* 题库十：补齐各年份缺失的真题名词解释（同题跨年，答案复用） */
window.KB_QUESTIONS_10 = (function () {
  const all = [].concat(
    window.KB_QUESTIONS_1 || [], window.KB_QUESTIONS_2 || [], window.KB_QUESTIONS_3 || [],
    window.KB_QUESTIONS_4 || [], window.KB_QUESTIONS_5 || [], window.KB_QUESTIONS_6 || [],
    window.KB_QUESTIONS_7 || [], window.KB_QUESTIONS_8 || [], window.KB_QUESTIONS_9 || []
  );
  const byId = {};
  all.forEach(q => { byId[q.id] = q; });

  const base = {
    '菌落': { from: 'q2012-n1' },
    '选择性培养基': { from: 'q2012-n2' },
    '基因重组': { from: 'q2012-n3' },
    '放线菌': { from: 'q2012-n5' },
    '益生菌': { from: 'q2012-n7' },
    '转导': { from: 'q2012-n9' },
    '微生物': { from: 'q2013-n1' },
    '温和噬菌体': { from: 'q2024-n1' },
    '灭菌': { from: 'q2014-n2' },
    '无菌操作': { from: 'q2020-n2' },
    '初生菌丝': { from: 'q2020-n4' },
    '酵母菌': {
      answer: '酵母菌是泛指能发酵糖类的单细胞真菌，菌体为单细胞，主要以出芽方式繁殖。',
      points: ['单细胞真菌（真核）', '细胞壁为葡聚糖和甘露聚糖', '无性繁殖以芽殖为主，有性产子囊孢子', '菌落大而凸起、有酒香味'],
      ch: 3, concepts: ['c3-1']
    },
    '主动运输': {
      answer: '主动运输是营养物质逆浓度梯度进入细胞的方式，需要特异性载体蛋白并消耗能量。',
      points: ['逆浓度梯度', '需载体蛋白', '消耗能量（ATP 或质子动力势）', '运输前后物质分子结构不变'],
      ch: 5, concepts: ['c5-4']
    }
  };

  // [年份, 原卷题号, 名称, 版本]
  const defs = [
    [2013, 4, '菌落', '整理版'], [2013, 5, '酵母菌', '整理版'], [2013, 6, '温和噬菌体', '整理版'],
    [2013, 7, '主动运输', '整理版'], [2013, 8, '选择性培养基', '整理版'],
    [2014, 1, '微生物', '整理版'], [2014, 3, '菌落', '整理版'], [2014, 4, '酵母菌', '整理版'],
    [2014, 5, '温和噬菌体', '整理版'], [2014, 6, '转导', '整理版'], [2014, 7, '选择性培养基', '整理版'],
    [2015, 2, '放线菌', '整理版'], [2015, 3, '益生菌', '整理版'], [2015, 6, '基因重组', '整理版'],
    [2016, 1, '微生物', '整理版'], [2016, 2, '菌落', '整理版'], [2016, 3, '主动运输', '整理版'],
    [2016, 4, '酵母菌', '整理版'], [2016, 5, '温和噬菌体', '整理版'],
    [2021, 1, '灭菌', '回忆版'], [2021, 5, '无菌操作', '回忆版'],
    [2022, 5, '初生菌丝', '回忆版']
  ];

  return defs.map((d, i) => {
    const year = d[0], no = d[1], name = d[2], version = d[3];
    const b = base[name];
    const src = b.from ? byId[b.from] : null;
    return {
      id: 'q' + year + '-nx' + i,
      year: year, type: '名词解释', source: '846真题', version: version,
      ch: b.ch || (src ? src.ch : 1),
      concepts: b.concepts || (src ? src.concepts : []),
      paper: 'p' + year, no: no,
      cloneOf: b.from || null,
      grade: 'self', status: '已核', score: 5,
      stem: name,
      answer: b.answer || (src ? src.answer : ''),
      points: b.points || (src ? src.points : []),
      note: '同题跨年：与 ' + (src ? src.year + ' 年同题' : '较早年份同题') + '，答案复用。'
    };
  });
})();
