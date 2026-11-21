// Pedidator reference behaviour for previews: weights, progress and the day workspace renderer.
// The app implements the same rules in shared/weight.ts and shared/progress.ts.
var Pd = (function () {
  var ICONS = {
    check: 'M5 12.5l4.5 4.5L19 7.5',
    alert: 'M12 4 2.8 19.5h18.4L12 4z M12 10v4.5 M12 17.3v.2',
    offline: 'M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.25 4.25 0 0 1 .5 8.5H7z M4 4l16 16',
    synced: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 12.3l2.7 2.7L16 9.5',
    flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
    day: 'M5 5h14v15H5z M5 9.5h14 M9 3v4 M15 3v4',
    tickets: 'M6 3v18l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V3z M9 8h6 M9 12h6',
    customers: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14.2a6.5 6.5 0 0 1 3.5 5.8',
    plus: 'M12 5v14 M5 12h14',
    trash: 'M4 7h16 M9 7V4h6v3 M6.5 7l1 13h9l1-13',
    history: 'M12 21a9 9 0 1 0-8.5-12 M3 4v5h5 M12 7.5V12l3 2',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5V12l3 2',
    prev: 'M14.5 6l-6 6 6 6',
    next: 'M9.5 6l6 6-6 6',
    down: 'M6 9.5l6 6 6-6'
  };
  function icon(n, cls) { return '<svg class="pd-icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>'; }

  // ---- weights: stored in whole grams, typed in g or kg, shown in g below 1 kg and in kg from 1 kg
  function parseWeight(input, unit) {
    var s = String(input == null ? '' : input).trim().toLowerCase().replace(/\s+/g, '');
    var m = /^(\d+(?:[.,]\d+)?)(kg|g)?$/.exec(s);
    if (!m) return null;
    var u = m[2] || unit, parts = m[1].replace(',', '.').split('.'), dec = parts[1] || '';
    if (u === 'g') { if (dec) return null; var g = parseInt(parts[0], 10); return g > 0 ? g : null; }
    if (dec.length > 3) return null;
    var grams = parseInt(parts[0], 10) * 1000 + parseInt((dec + '000').slice(0, 3), 10);
    return grams > 0 ? grams : null;
  }
  function kgText(g) { var r = g % 1000; return Math.floor(g / 1000) + (r ? ',' + ('00' + r).slice(-3).replace(/0+$/, '') : ''); }
  function formatWeight(g) { return g < 1000 ? g + ' g' : kgText(g) + ' kg'; }
  function toInputValue(g, unit) { return unit === 'g' ? String(g) : kgText(g); }
  function formatQuantity(it) { return it.measure === 'unit' ? it.quantity + ' u' : (it.grams ? formatWeight(it.grams) : ''); }

  // ---- progress: "prepared" is never stored, it is all items done
  function isPrepared(o) { return o.items.length > 0 && o.items.every(function (i) { return i.done; }); }
  function dayProgress(orders) {
    var act = orders.filter(function (o) { return o.status !== 'cancelled'; });
    var delivered = act.filter(function (o) { return o.status === 'delivered'; }).length;
    var prepared = act.filter(function (o) { return o.status === 'delivered' || isPrepared(o); }).length;
    return { total: act.length, prepared: prepared, delivered: delivered };
  }

  // ---- rendering
  function itemRow(it, ref, sub) {
    var detail = [];
    if (sub) detail.push('<span>' + sub + '</span>');
    if (it.note) detail.push('<span>' + it.note + '</span>');
    if (it.prep && !sub) detail.push(it.late && !it.done
      ? '<span class="pd-item__late">' + icon('alert', 'pd-icon--sm') + 'Había que prepararlo ayer</span>'
      : '<span class="pd-badge pd-badge--prep">' + icon('clock', 'pd-icon--sm') + 'Día anterior</span>');
    return '<button type="button" class="pd-item' + (it.done ? ' pd-item--done' : '') + '" role="checkbox" aria-checked="' + !!it.done + '" data-item="' + ref + '">' +
      '<span class="pd-item__check">' + icon('check') + '</span><span class="pd-item__body"><span class="pd-item__name">' + it.name + '</span>' +
      (detail.length ? '<span class="pd-item__detail">' + detail.join('') + '</span>' : '') + '</span><span class="pd-item__qty">' + formatQuantity(it) + '</span></button>';
  }
  function orderCard(o, isNext) {
    var done = o.items.filter(function (i) { return i.done; }).length, prep = isPrepared(o), tags = [];
    tags.push(prep ? '<span class="pd-badge pd-badge--ok">' + icon('check', 'pd-icon--sm') + 'Preparado</span>' : '<span class="pd-badge">' + done + ' de ' + o.items.length + ' preparados</span>');
    if (o.important) tags.push('<span class="pd-badge pd-badge--warn">' + icon('flag', 'pd-icon--sm') + 'Importante</span>');
    return '<article class="pd-day-order' + (prep ? ' pd-day-order--prepared' : '') + (isNext ? ' pd-day-order--next' : '') + '">' +
      (isNext ? '<div class="pd-day-order__next">Próxima recogida</div>' : '') +
      '<div class="pd-day-order__head"><span class="pd-day-order__time">' + o.time + '</span><div class="pd-day-order__who"><span class="pd-day-order__name">' + o.name + '</span><span class="pd-day-order__tags">' + tags.join('') + '</span></div>' +
      '<button type="button" class="pd-btn' + (prep ? ' pd-btn--primary' : '') + '" data-deliver="' + o.id + '">Entregar</button></div>' +
      '<div class="pd-day-order__items">' + o.items.map(function (it, i) { return itemRow(it, o.id + ':' + i); }).join('') + '</div></article>';
  }
  function parts(state) {
    var p = dayProgress(state.orders), pending = state.orders.filter(function (o) { return o.status === 'pending'; });
    var delivered = state.orders.filter(function (o) { return o.status === 'delivered'; });
    var prepDone = state.prep.filter(function (i) { return i.done; }).length;
    return {
      progress: '<div class="pd-progress"><div class="pd-progress__title">' + p.prepared + ' de ' + p.total + ' encargos preparados</div>' +
        '<div class="pd-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="' + p.total + '" aria-valuenow="' + p.prepared + '"><div class="pd-progress__fill" style="width:' + (p.total ? Math.round(100 * p.prepared / p.total) : 0) + '%"></div></div>' +
        '<div class="pd-progress__label"><span>' + (p.total - p.prepared) + ' por preparar</span><span>' + p.delivered + ' entregados</span></div></div>',
      prep: state.prep.length ? '<section class="pd-prep"><div class="pd-prep__title">' + icon('clock') + 'Preparar hoy para mañana<span class="pd-prep__count">' + prepDone + ' de ' + state.prep.length + '</span></div>' +
        state.prep.map(function (it, i) { return itemRow(it, 'prep:' + i, it.who + ' · ' + it.when); }).join('') + '</section>' : '',
      orders: pending.map(function (o, i) { return orderCard(o, i === 0); }).join(''),
      delivered: delivered.length ? '<div class="pd-collapsed"><span>Entregados (' + delivered.length + ')</span>' + icon('down') + '</div>' : ''
    };
  }
  function toggle(state, ref) {
    var a = ref.split(':'), i = +a[1];
    if (a[0] === 'prep') { state.prep[i].done = !state.prep[i].done; return; }
    var o = state.orders.filter(function (x) { return x.id === a[0]; })[0]; if (o) o.items[i].done = !o.items[i].done;
  }
  function deliver(state, id) { var o = state.orders.filter(function (x) { return x.id === id; })[0]; if (o) o.status = 'delivered'; }
  function sample() {
    var w = function (name, grams, x) { return Object.assign({ name: name, measure: 'weight', grams: grams }, x || {}); };
    var u = function (name, quantity, x) { return Object.assign({ name: name, measure: 'unit', quantity: quantity }, x || {}); };
    return {
      orders: [
        { id: 'o1', time: '08:45', name: 'Carme Soler', status: 'delivered', items: [w('Carne picada mixta', 500, { done: true })] },
        { id: 'o2', time: '09:30', name: 'Montse Vila', status: 'delivered', items: [u('Pollo de corral', 1, { done: true }), w('Pechuga fileteada', 600, { done: true })] },
        { id: 'o3', time: '11:00', name: 'Bar La Plaça', status: 'pending', important: true, items: [w('Entrecot de ternera', 2500, { note: 'fileteado fino', done: true }), u('Butifarra', 6), u('Hamburguesas', 12, { note: 'sin cebolla' })] },
        { id: 'o4', time: '12:15', name: 'Jordi Ferrer', status: 'pending', items: [u('Pollo relleno', 1, { prep: true, late: true }), w('Costillas de cerdo', 1200)] },
        { id: 'o5', time: '13:00', name: 'Rosa Puig', status: 'pending', items: [w('Lomo adobado', 800, { prep: true, done: true })] }
      ],
      prep: [u('Pavo relleno', 1, { who: 'Núria Camps', when: 'mañana 10:00' }), w('Redondo mechado', 1500, { who: 'Bar La Plaça', when: 'mañana 12:30', done: true })]
    };
  }
  return { icon: icon, parseWeight: parseWeight, formatWeight: formatWeight, toInputValue: toInputValue, formatQuantity: formatQuantity, isPrepared: isPrepared, dayProgress: dayProgress, itemRow: itemRow, parts: parts, toggle: toggle, deliver: deliver, sample: sample };
})();
if (typeof module !== 'undefined') module.exports = Pd;
