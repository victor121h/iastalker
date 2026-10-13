(function (M) {
  'use strict';

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }

  function nextId(state) { state.nextId = (state.nextId || 1) + 1; return state.nextId; }
  function absMinute(state) { return state.time.day * 1440 + state.time.minute; }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(minute) {
    const m = Math.floor(minute) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }
  function fmtMoney(n) {
    const v = Math.round(n);
    const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '−' : '') + 'M$ ' + s;
  }
  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const WEEKDAYS_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  function weekday(day) { return ((day - 1) % 7 + 7) % 7; }
  function weekdayName(day, long) { return (long ? WEEKDAYS_LONG : WEEKDAYS)[weekday(day)]; }

  function emitter() {
    const handlers = {};
    return {
      on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); return () => this.off(evt, fn); },
      off(evt, fn) { const h = handlers[evt]; if (!h) return; const i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); },
      emit(evt, payload) {
        const h = handlers[evt]; if (!h) return;
        for (const fn of h.slice()) {
          try { fn(payload); } catch (e) { console.error('[bus]', evt, e); }
        }
      },
    };
  }

  function deepClone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function pick(arr, r) { return arr[Math.floor((r ? r() : Math.random()) * arr.length) % arr.length]; }

  // Edge keys for walls: "h,x,y" (top edge of tile x,y) and "v,x,y" (left edge of tile x,y)
  function edgeKey(kind, x, y) { return kind + ',' + x + ',' + y; }
  function parseEdge(key) { const p = key.split(','); return { kind: p[0], x: +p[1], y: +p[2] }; }

  M.util = {
    rng, clamp, lerp, dist, nextId, absMinute, pad2, fmtTime, fmtMoney,
    weekday, weekdayName, WEEKDAYS, WEEKDAYS_LONG, emitter, deepClone, pick, edgeKey, parseEdge,
    bus: emitter(),
  };
})(window.M = window.M || {});
