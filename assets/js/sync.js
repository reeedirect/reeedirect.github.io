/* ============ Supabase 跨设备进度同步 ============ */
(function () {
  const URL = 'https://hskocxitnjovoixfpkqe.supabase.co';
  const KEY = 'sb_publishable_nlYvkeCpJWkXkv4KlgKR8g_12wLptcc';
  const TABLE = 'quiz_progress';
  const ROW_ID = 1;
  const TS_KEY = 'kb846:updated_at';
  const SYNC_KEY = 'kb846:sync_state';

  const S = {
    ready: false,
    applying: false,
    pushing: false,
    timer: null,
    el: null,
    lastStatus: '',
    offline: false
  };

  function status(text, cls, title) {
    if (!S.el) return;
    S.lastStatus = text;
    S.el.textContent = text;
    S.el.className = 'sync-status ' + (cls || '');
    S.el.title = title || text;
  }

  function ensureEl() {
    if (S.el) return;
    const el = document.createElement('button');
    el.type = 'button';
    el.id = 'syncStatus';
    el.className = 'sync-status';
    el.textContent = '本地保存';
    el.title = '点击查看同步选项';
    el.addEventListener('click', function (e) { e.stopPropagation(); openMenu(); });
    document.body.appendChild(el);
    S.el = el;
  }

  function localTs() {
    const v = Number(localStorage.getItem(TS_KEY) || 0);
    return isFinite(v) ? v : 0;
  }

  function setLocalTs(v) {
    localStorage.setItem(TS_KEY, String(Number(v) || 0));
  }

  function stamp() {
    return Date.now();
  }

  function headers(extra) {
    const h = Object.assign({
      apikey: KEY,
      Accept: 'application/json'
    }, extra || {});
    return h;
  }

  function request(path, opts) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    const o = Object.assign({ cache: 'no-store' }, opts || {});
    if (ctrl) o.signal = ctrl.signal;
    return fetch(URL + path, o).finally(function () { if (timer) clearTimeout(timer); });
  }

  function parseCloudTs(row) {
    const raw = row && row.updated_at;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const n = Number(raw);
      if (isFinite(n)) return n;
      const d = Date.parse(raw);
      if (isFinite(d)) return d;
    }
    return 0;
  }

  function mergeState(local, cloud) {
    local = local && typeof local === 'object' ? local : {};
    cloud = cloud && typeof cloud === 'object' ? cloud : {};
    const out = Object.assign({}, local, cloud);
    ['mastery', 'review', 'attempts', 'wrong', 'notes', 'drafts', 'paperDone'].forEach(k => {
      out[k] = Object.assign({}, local[k] || {}, cloud[k] || {});
    });
    const fav = (local.fav || []).concat(cloud.fav || []);
    out.fav = fav.filter((x, i) => fav.indexOf(x) === i);
    const recs = [];
    (local.paperRecords || []).concat(cloud.paperRecords || []).forEach(r => {
      if (!recs.some(x => x.at === r.at && x.pid === r.pid)) recs.push(r);
    });
    out.paperRecords = recs;
    if (!cloud.paperSession && local.paperSession) out.paperSession = local.paperSession;
    if (!cloud.bankSession && local.bankSession) out.bankSession = local.bankSession;
    return out;
  }

  function applyCloud(data, ts) {
    S.applying = true;
    try {
      let obj = data;
      if (typeof obj === 'string') {
        try { obj = JSON.parse(obj); } catch (e) { obj = null; }
      }
      if (!obj || typeof obj !== 'object') throw new Error('云端 data 不是对象');
      App.store.replace(obj);
      setLocalTs(ts);
      App.render();
      status('已云端同步', 'ok', '已从云端拉取较新进度 · ' + new Date(ts).toLocaleString());
    } catch (e) {
      status('云端数据不可用 · 仅本地保存', 'offline', String(e && e.message || e));
    } finally {
      S.applying = false;
    }
  }

  function push() {
    if (!S.ready || S.applying) return;
    if (S.pushing) return;
    if (S.offline || navigator.onLine === false) {
      status('离线仅本地保存', 'offline', '浏览器或云端当前不可用');
      return;
    }
    S.pushing = true;
    clearTimeout(S.timer); S.timer = null;
    let ts = localTs();
    if (!ts) { ts = stamp(); setLocalTs(ts); }
    const payload = [{ id: ROW_ID, data: App.store.get(), updated_at: ts }];
    status('同步中...', 'syncing', '正在上传本地进度');
    request('/rest/v1/' + TABLE + '?on_conflict=id', {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(payload)
    }).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      S.offline = false;
      status('已云端同步', 'ok', '本地进度已上传 · ' + new Date(ts).toLocaleString());
    }).catch(function (err) {
      S.offline = true;
      status('离线仅本地保存', 'offline', '云端同步失败：' + (err && err.message || err));
    }).finally(function () {
      S.pushing = false;
    });
  }

  function schedulePush() {
    if (!S.ready || S.applying) return;
    setLocalTs(stamp());
    localStorage.setItem(SYNC_KEY, 'pending');
    if (S.offline) { status('离线仅本地保存', 'offline', '本地已保存，等待网络恢复'); return; }
    status('同步中...', 'syncing', '本地已保存，3 秒后上传云端');
    clearTimeout(S.timer);
    S.timer = setTimeout(push, 3000);
  }

  function onSave() {
    if (S.applying) return;
    if (!S.ready) { setLocalTs(stamp()); return; }
    schedulePush();
  }

  let menuEl = null;
  function closeMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('click', outsideMenu); }
  }
  function outsideMenu(e) {
    if (menuEl && !menuEl.contains(e.target) && e.target !== S.el) closeMenu();
  }
  function openMenu() {
    if (menuEl) { closeMenu(); return; }
    menuEl = document.createElement('div');
    menuEl.className = 'sync-menu';
    menuEl.innerHTML = '<div class="sync-menu-hd">云端同步</div>' +
      '<button type="button" data-sync="now">立即同步</button>' +
      '<button type="button" class="danger" data-sync="clear">清空学习记录</button>';
    menuEl.addEventListener('click', function (e) {
      e.stopPropagation();
      const b = e.target.closest('[data-sync]');
      if (!b) return;
      if (b.dataset.sync === 'now') {
        closeMenu(); S.offline = false; status('同步中...', 'syncing', '手动上传本地进度'); push();
      } else if (b.dataset.sync === 'clear') {
        closeMenu();
        if (!confirm('将清空本机与云端的掌握度、笔记、错题、复习与套卷记录，且不可恢复。建议先导出备份。确定继续？')) return;
        App.store.reset();
        setLocalTs(stamp());
        App.store.save();
        App.render();
        S.offline = false;
        status('同步中...', 'syncing', '正在上传清空后的状态');
        push();
        App.toast('已清空学习记录');
      }
    });
    document.body.appendChild(menuEl);
    setTimeout(function () { document.addEventListener('click', outsideMenu); }, 0);
  }

  function boot() {
    if (!window.App || !App.store || !App.data || !App.data.questions || !App.data.questions.length) {
      setTimeout(boot, 120);
      return;
    }
    if (S.ready) return;
    S.ready = true;
    ensureEl();
    // 老版本没有本地时间戳：把现有进度视为“待合并”，避免云端空数据覆盖
    if (!localTs()) {
      const st = App.store.get();
      const has = ['mastery', 'review', 'attempts', 'wrong', 'notes', 'drafts', 'paperDone'].some(k => st[k] && Object.keys(st[k]).length) ||
        (st.paperRecords || []).length || (st.fav || []).length;
      if (has) setLocalTs(stamp());
    }
    status('正在连接云端...', 'syncing', '正在读取云端进度');
    if (navigator.onLine === false) {
      status('离线仅本地保存', 'offline', '浏览器当前离线');
      return;
    }

    request('/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=id,data,updated_at', {
      headers: headers()
    }).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    }).then(function (rows) {
      const row = Array.isArray(rows) ? rows[0] : null;
      const cloudTs = parseCloudTs(row);
      const lt = localTs();
      S.offline = false;
      if (row && cloudTs > lt) {
        const cloudData = row.data && typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        const localData = App.store.get();
        const merged = mergeState(localData, cloudData || {});
        const changed = JSON.stringify(merged) !== JSON.stringify(cloudData || {});
        if (changed) {
          // 云端较新，但本地有云端没有的进度：合并后回传，避免刷新丢卡
          applyCloud(merged, Date.now());
          push();
        } else {
          applyCloud(cloudData, cloudTs);
        }
        return;
      }
      if (!row) {
        // 云端还没有记录：把本地进度作为第一份上传
        push();
        return;
      }
      if (lt > cloudTs) {
        // 本地较新：只在有实际差异时上传
        push();
        return;
      }
      status('已云端同步', 'ok', '本地与云端时间戳一致');
    }).catch(function (err) {
      S.offline = true;
      status('离线仅本地保存', 'offline', '云端不可用：' + (err && err.message || err));
    });
  }

  window.addEventListener('online', function () {
    S.offline = false;
    if (S.ready) { status('同步中...', 'syncing', '网络恢复，正在重试'); push(); }
  });

  window.AppSync = {
    onSave: onSave,
    push: push,
    boot: boot,
    status: status
  };

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
