/* ============ 启动 ============ */
(function () {
  const App = window.App, U = App.util, $ = U.$, $$ = U.$$, D = App.data;

  function buildRail() {
    const box = $('#railChapters');
    box.innerHTML = '<h6>章节目录</h6>' + D.chapters.map(c => {
      const n = (D.byChapter[c.id] || []).length;
      return '<a href="#/map" data-act="rail-ch" data-ch="' + c.id + '">' + String(c.id).padStart(2, '0') + '　' + U.esc(c.short) +
        (n ? ' <span class="mono" style="opacity:.45">' + n + '</span>' : '') + '</a>';
    }).join('');
  }

  function init() {
    App.store.reload();
    App.initData();
    buildRail();
    App.parseHash();
    App.bindGlobal();

    $('#btnSearch').addEventListener('click', () => App.openSearch());
    $('#btnMenu').addEventListener('click', e => { e.stopPropagation(); $('#rail').classList.toggle('open'); });
    $('#btnExam').addEventListener('click', () => App.go('review'));

    document.addEventListener('click', function (e) {
      const t = e.target.closest('[data-act="rail-ch"]');
      if (t) {
        const id = +t.dataset.ch;
        App.mapState.open = {}; App.mapState.open[id] = true; App.mapState.q = ''; App.mapState.mode = 'list';
        App.go('map');
        const el = document.querySelector('.chapter[data-ch="' + id + '"]');
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        return;
      }
      if ($('#rail').classList.contains('open') && !e.target.closest('#rail') && !e.target.closest('#btnMenu')) {
        $('#rail').classList.remove('open');
      }
    });

    App.render();

    // 首次使用提示
    const s = App.store.get();
    if (!s.examDate && !sessionStorage.getItem('kb846.seen')) {
      sessionStorage.setItem('kb846.seen', '1');
      setTimeout(() => App.toast('建议先在“错题与复习”里设置考试日期，倒计时与每日配额会更准确'), 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
