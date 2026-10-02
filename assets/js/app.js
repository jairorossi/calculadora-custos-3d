/* =========================================================
   Calculadora de Custos de Impressão 3D — app.js
   Cálculos: filamento (por cor), energia elétrica,
   depreciação, manutenção, mão de obra e margem de lucro.
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'calc3d.v1';
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var ENERGY_FIELDS = ['power', 'otherPower', 'hours', 'minutes', 'tariff'];
  var EXTRAS_FIELDS = ['purchase', 'life', 'maint', 'labor', 'margin'];
  var PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#a855f7', '#ec4899', '#111827', '#f5f5f5'];

  var DEFAULTS = {
    colors: [
      { color: '#111111', name: 'Preto', g: '', price: '89,90', spool: '1000', waste: '' },
      { color: '#f5f5f5', name: 'Branco', g: '', price: '89,90', spool: '1000', waste: '' }
    ],
    energy: { power: '250', otherPower: '0', hours: '2', minutes: '30', tariff: '0,95' },
    extras: { purchase: '1500', life: '4000', maint: '0', labor: '0', margin: '0' }
  };

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var nf = function (min, max) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max }); };

  function money(v) { return brl.format(isFinite(v) ? v : 0); }
  function grams(v) { return nf(1, 1).format(isFinite(v) ? v : 0) + ' g'; }
  function kwh(v) { return nf(3, 3).format(isFinite(v) ? v : 0) + ' kWh'; }

  function parseNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeLabel(h) {
    var dh = Math.floor(h + 1e-9);
    var dm = Math.round((h - dh) * 60);
    if (dm === 60) { dh += 1; dm = 0; }
    if (dh <= 0 && dm <= 0) return '0 h';
    return (dh > 0 ? dh + ' h' : '') + (dm > 0 ? (dh > 0 ? ' ' : '') + dm + ' min' : '');
  }

  /* ---------------- Cores de filamento ---------------- */

  var list = $('#colorList');
  var colorSeq = 0;

  function rowHTML(c) {
    return '' +
      '<div class="cell c-color">' +
        '<span class="lbl">Cor</span>' +
        '<input type="color" class="i-color" value="' + esc(c.color) + '" aria-label="Cor do filamento">' +
      '</div>' +
      '<div class="cell c-name">' +
        '<span class="lbl">Nome da cor</span>' +
        '<input type="text" class="i-name" placeholder="Ex.: Preto" value="' + esc(c.name) + '" aria-label="Nome da cor">' +
      '</div>' +
      '<div class="cell c-g">' +
        '<span class="lbl">Gramas (g)</span>' +
        '<input type="text" inputmode="decimal" class="i-num i-g" placeholder="0" value="' + esc(c.g) + '" aria-label="Gramas usadas">' +
        '<small class="hint g-hint"></small>' +
      '</div>' +
      '<div class="cell c-price">' +
        '<span class="lbl">Preço do rolo (R$)</span>' +
        '<input type="text" inputmode="decimal" class="i-num i-price" placeholder="0,00" value="' + esc(c.price) + '" aria-label="Preço do rolo">' +
      '</div>' +
      '<div class="cell c-spool">' +
        '<span class="lbl">Peso do rolo (g)</span>' +
        '<input type="text" inputmode="decimal" class="i-num i-spool" placeholder="1000" value="' + esc(c.spool) + '" aria-label="Peso do rolo em gramas">' +
      '</div>' +
      '<div class="cell c-waste">' +
        '<span class="lbl">Desperdício (%)</span>' +
        '<input type="text" inputmode="decimal" class="i-num i-waste" placeholder="0" value="' + esc(c.waste) + '" aria-label="Percentual de desperdício">' +
      '</div>' +
      '<div class="cell c-sub">' +
        '<span class="lbl">Custo da cor</span>' +
        '<output class="o-sub">R$ 0,00</output>' +
        '<small class="hint o-kg"></small>' +
      '</div>' +
      '<div class="cell c-del">' +
        '<button type="button" class="btn-icon js-del" title="Remover cor" aria-label="Remover esta cor">✕</button>' +
      '</div>';
  }

  function addColor(data) {
    data = data || {};
    var el = document.createElement('div');
    el.className = 'c-row';
    el.dataset.id = 'c' + (++colorSeq);
    el.innerHTML = rowHTML({
      color: data.color || PALETTE[(colorSeq - 1) % PALETTE.length],
      name: data.name != null ? data.name : ('Cor ' + colorSeq),
      g: data.g != null ? data.g : '',
      price: data.price != null ? data.price : '89,90',
      spool: data.spool != null ? data.spool : '1000',
      waste: data.waste != null ? data.waste : ''
    });
    list.appendChild(el);
    return el;
  }

  function collectRows() {
    return $$('.c-row', list).map(function (row) {
      var price = parseNum($('.i-price', row).value);
      var spool = parseNum($('.i-spool', row).value);
      if (spool <= 0) spool = 1000;
      var waste = Math.max(0, parseNum($('.i-waste', row).value));
      var g = Math.max(0, parseNum($('.i-g', row).value));
      var perKg = price * 1000 / spool;
      var gEff = g * (1 + waste / 100);
      var cost = gEff / 1000 * perKg;
      return {
        name: $('.i-name', row).value.trim() || 'Sem nome',
        color: $('.i-color', row).value,
        g: g, gEff: gEff, perKg: perKg, cost: cost, waste: waste, el: row
      };
    });
  }

  /* ---------------- Cálculo geral ---------------- */

  var last = null;

  function calc() {
    var rows = collectRows();
    var totalG = 0, totalFil = 0;

    rows.forEach(function (r) {
      totalG += r.gEff;
      totalFil += r.cost;
      $('.o-sub', r.el).textContent = money(r.cost);
      $('.o-kg', r.el).textContent = r.perKg > 0 ? money(r.perKg) + '/kg' : '';
      var hint = $('.g-hint', r.el);
      hint.textContent = (r.waste > 0 && r.g > 0) ? nf(1, 1).format(r.gEff) + ' g já c/ desperdício' : '';
    });

    $('#emptyState').hidden = rows.length > 0;
    $('#totalG').textContent = grams(totalG);
    $('#totalFil').textContent = money(totalFil);

    // Energia
    var power = Math.max(0, parseNum($('#power').value));
    var other = Math.max(0, parseNum($('#otherPower').value));
    var hours = Math.max(0, parseNum($('#hours').value));
    var minutes = Math.max(0, parseNum($('#minutes').value));
    var tariff = Math.max(0, parseNum($('#tariff').value));
    var t = hours + minutes / 60;
    var watts = power + other;
    var consumption = watts / 1000 * t;
    var energyCost = consumption * tariff;
    var energyPerHour = watts / 1000 * tariff;

    $('#kwh').textContent = kwh(consumption);
    $('#energyCost').textContent = money(energyCost);
    $('#energyHour').textContent = money(energyPerHour) + ' /h';

    // Extras
    var purchase = Math.max(0, parseNum($('#purchase').value));
    var life = Math.max(0, parseNum($('#life').value));
    var maintRate = Math.max(0, parseNum($('#maint').value));
    var laborRate = Math.max(0, parseNum($('#labor').value));
    var margin = Math.max(0, parseNum($('#margin').value));

    var deprPerHour = (purchase > 0 && life > 0) ? purchase / life : 0;
    var deprCost = deprPerHour * t;
    var maintCost = maintRate * t;
    var laborCost = laborRate * t;

    $('#deprHint').textContent = money(deprPerHour) + ' /h';

    // Resumo
    var subtotal = totalFil + energyCost + deprCost + maintCost + laborCost;
    var profit = subtotal * margin / 100;
    var total = subtotal + profit;
    var perGram = totalG > 0 ? subtotal / totalG : 0;

    $('#sumTotal').textContent = money(total);
    $('#sumTotal2').textContent = money(total);
    $('#heroNote').textContent = nf(1, 1).format(totalG) + ' g · ' + timeLabel(t);
    $('#sumG').textContent = '(' + grams(totalG) + ')';
    $('#sumFil').textContent = money(totalFil);
    $('#sumKwh').textContent = '(' + kwh(consumption) + ')';
    $('#sumEn').textContent = money(energyCost);
    $('#sumDep').textContent = money(deprCost);
    $('#sumMnt').textContent = money(maintCost);
    $('#sumLab').textContent = money(laborCost);
    $('#sumSub').textContent = money(subtotal);
    $('#profitLabel').textContent = margin > 0 ? 'Lucro (' + nf(0, 2).format(margin) + '%)' : 'Lucro';
    $('#sumProfit').textContent = money(profit);
    $('#kpiGram').textContent = money(perGram) + ' /g';
    $('#kpiHour').textContent = money(energyPerHour) + ' /h';
    $('#kpiTime').textContent = timeLabel(t);

    // Detalhamento por cor
    var bd = $('#colorBreakdown');
    bd.innerHTML = rows.map(function (r) {
      return '<li><i style="background:' + esc(r.color) + '"></i>' +
        '<b>' + esc(r.name) + '</b>' +
        '<span class="muted">' + nf(1, 1).format(r.gEff) + ' g</span>' +
        '<b>' + money(r.cost) + '</b></li>';
    }).join('');

    last = {
      rows: rows, totalG: totalG, totalFil: totalFil,
      t: t, consumption: consumption, energyCost: energyCost, energyPerHour: energyPerHour,
      deprCost: deprCost, maintCost: maintCost, laborCost: laborCost,
      subtotal: subtotal, margin: margin, profit: profit, total: total, perGram: perGram
    };
  }

  /* ---------------- Persistência ---------------- */

  var timer = null;

  function save() {
    var data = {
      colors: $$('.c-row', list).map(function (row) {
        return {
          color: $('.i-color', row).value,
          name: $('.i-name', row).value,
          g: $('.i-g', row).value,
          price: $('.i-price', row).value,
          spool: $('.i-spool', row).value,
          waste: $('.i-waste', row).value
        };
      }),
      energy: {}, extras: {}
    };
    ENERGY_FIELDS.forEach(function (f) { data.energy[f] = $('#' + f).value; });
    EXTRAS_FIELDS.forEach(function (f) { data.extras[f] = $('#' + f).value; });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* modo privado */ }
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  }

  function fillFields(map, fields) {
    fields.forEach(function (f) {
      if (map && map[f] != null && $('#' + f)) $('#' + f).value = map[f];
    });
  }

  function resetToDefaults() {
    list.innerHTML = '';
    colorSeq = 0;
    DEFAULTS.colors.forEach(addColor);
    fillFields(DEFAULTS.energy, ENERGY_FIELDS);
    fillFields(DEFAULTS.extras, EXTRAS_FIELDS);
  }

  function load() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }

    if (data && Array.isArray(data.colors)) {
      data.colors.forEach(addColor);
      fillFields(Object.assign({}, DEFAULTS.energy, data.energy), ENERGY_FIELDS);
      fillFields(Object.assign({}, DEFAULTS.extras, data.extras), EXTRAS_FIELDS);
    } else {
      resetToDefaults();
    }
  }

  /* ---------------- Copiar resumo ---------------- */

  function summaryText() {
    var d = last;
    var out = [];
    out.push('IMPRESSÃO 3D — RESUMO DE CUSTOS');
    out.push('--------------------------------');
    out.push('FILOMENTO');
    d.rows.forEach(function (r) {
      out.push('  - ' + r.name + ': ' + nf(1, 1).format(r.gEff) + ' g = ' + money(r.cost) +
        ' (' + money(r.perKg) + '/kg)');
    });
    if (d.rows.length === 0) out.push('  (nenhuma cor)');
    out.push('  Total: ' + nf(1, 1).format(d.totalG) + ' g = ' + money(d.totalFil));
    out.push('');
    out.push('ENERGIA ELÉTRICA');
    out.push('  Tempo: ' + timeLabel(d.t));
    out.push('  Consumo: ' + kwh(d.consumption));
    out.push('  Custo: ' + money(d.energyCost) + '  (' + money(d.energyPerHour) + '/h)');
    out.push('');
    out.push('DEPRECIAÇÃO DA MÁQUINA: ' + money(d.deprCost));
    out.push('MANUTENÇÃO E PEÇAS:    ' + money(d.maintCost));
    out.push('MÃO DE OBRA:            ' + money(d.laborCost));
    out.push('--------------------------------');
    out.push('SUBTOTAL (custo real): ' + money(d.subtotal));
    if (d.margin > 0) {
      out.push('LUCRO (' + nf(0, 2).format(d.margin) + '%):     ' + money(d.profit));
    }
    out.push('TOTAL:                  ' + money(d.total));
    out.push('Custo por grama:        ' + money(d.perGram) + '/g');
    return out.join('\n');
  }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function copySummary() {
    var text = summaryText();
    var done = function () { toast('Resumo copiado para a área de transferência.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Não foi possível copiar.'); }
    document.body.removeChild(ta);
  }

  /* ---------------- Eventos ---------------- */

  $('#addColor').addEventListener('click', function () {
    addColor();
    calc();
    save();
    var rows = $$('.c-row', list);
    var lastRow = rows[rows.length - 1];
    if (lastRow) { var inp = $('.i-name', lastRow); if (inp) inp.focus(); }
  });

  list.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.js-del') : null;
    if (!btn) return;
    var row = btn.closest('.c-row');
    if (row) row.parentNode.removeChild(row);
    calc();
    save();
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.tagName === 'INPUT') {
      calc();
      scheduleSave();
    }
  });

  $('#copyBtn').addEventListener('click', copySummary);

  $('#clearBtn').addEventListener('click', function () {
    if (!confirm('Apagar todos os dados e voltar aos valores padrão?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    resetToDefaults();
    calc();
    save();
    toast('Dados limpos.');
  });

  /* ---------------- Início ---------------- */

  load();
  calc();
})();
