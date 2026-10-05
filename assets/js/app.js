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
  var JOB_FIELDS = ['qty'];
  var PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#a855f7', '#ec4899', '#111827', '#f5f5f5'];

  var DEFAULTS = {
    colors: [
      { color: '#111111', name: 'Preto', g: '', price: '89,90', spool: '1000', waste: '' },
      { color: '#f5f5f5', name: 'Branco', g: '', price: '89,90', spool: '1000', waste: '' }
    ],
    energy: { power: '250', otherPower: '0', hours: '2', minutes: '30', tariff: '0,95' },
    extras: { purchase: '1500', life: '4000', maint: '0', labor: '0', margin: '0' },
    job: { qty: '1' }
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

    var qty = Math.floor(parseNum($('#qty') ? $('#qty').value : 1)) || 1;
    if (qty < 1) qty = 1;
    if (qty > 9999) qty = 9999;
    var many = qty > 1;

    rows.forEach(function (r) {
      totalG += r.gEff;
      totalFil += r.cost;
      $('.o-sub', r.el).textContent = money(r.cost * qty);
      $('.o-kg', r.el).textContent = r.perKg > 0 ? money(r.perKg) + '/kg' : '';
      var parts = [];
      if (r.waste > 0 && r.g > 0) parts.push(nf(1, 1).format(r.gEff) + ' g já c/ desperdício');
      if (many) parts.push(nf(1, 1).format(r.gEff * qty) + ' g no lote (' + qty + 'x)');
      $('.g-hint', r.el).textContent = parts.join(' · ');
    });

    $('#emptyState').hidden = rows.length > 0;
    $('#totalG').textContent = grams(totalG * qty);
    $('#totalFil').textContent = money(totalFil * qty);
    if ($('#totalGNote')) $('#totalGNote').textContent = many ? nf(1, 1).format(totalG) + ' g por peça' : '';
    if ($('#totalFilNote')) $('#totalFilNote').textContent = many ? money(totalFil) + ' por peça' : '';

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

    $('#kwh').textContent = kwh(consumption * qty);
    $('#energyCost').textContent = money(energyCost * qty);
    $('#energyHour').textContent = money(energyPerHour) + ' /h';
    if ($('#timeRef')) {
      $('#timeRef').textContent = timeLabel(t) + (many ? ' por peça' : '');
      $('#timeRefTotal').textContent = many ? 'Lote de ' + qty + ' peças: ' + timeLabel(t * qty) : '';
    }

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

    // Resumo (valores já multiplicados pela quantidade de peças)
    var unit = totalFil + energyCost + deprCost + maintCost + laborCost;
    var subtotal = unit * qty;
    var profit = subtotal * margin / 100;
    var total = subtotal + profit;
    var perGram = totalG > 0 ? unit / totalG : 0;
    var perPiece = total / qty;

    $('#sumTotal').textContent = money(total);
    $('#sumTotal2').textContent = money(total);
    $('#heroNote').textContent = nf(1, 1).format(totalG * qty) + ' g · ' + timeLabel(t * qty) +
      (many ? ' · ' + qty + ' peças' : '');
    $('#sumG').textContent = '(' + grams(totalG * qty) + ')';
    $('#sumFil').textContent = money(totalFil * qty);
    $('#sumKwh').textContent = '(' + kwh(consumption * qty) + ')';
    $('#sumEn').textContent = money(energyCost * qty);
    $('#sumDep').textContent = money(deprCost * qty);
    $('#sumMnt').textContent = money(maintCost * qty);
    $('#sumLab').textContent = money(laborCost * qty);
    $('#sumSub').textContent = money(subtotal);
    $('#profitLabel').textContent = margin > 0 ? 'Lucro (' + nf(0, 2).format(margin) + '%)' : 'Lucro';
    $('#sumProfit').textContent = money(profit);
    $('#kpiGram').textContent = money(perGram) + ' /g';
    $('#kpiHour').textContent = money(energyPerHour) + ' /h';
    $('#kpiTime').textContent = timeLabel(t * qty);
    if ($('#kpiPieceBox')) {
      $('#kpiPieceBox').hidden = !many;
      $('#kpiPiece').textContent = money(perPiece);
      var kpis = $('#kpiPieceBox').parentNode;
      if (many) kpis.setAttribute('data-n', '4'); else kpis.removeAttribute('data-n');
    }

    // Detalhamento por cor
    var bd = $('#colorBreakdown');
    bd.innerHTML = rows.map(function (r) {
      return '<li><i style="background:' + esc(r.color) + '"></i>' +
        '<b>' + esc(r.name) + '</b>' +
        '<span class="muted">' + nf(1, 1).format(r.gEff * qty) + ' g</span>' +
        '<b>' + money(r.cost * qty) + '</b></li>';
    }).join('');

    last = {
      rows: rows, qty: qty, totalG: totalG * qty, totalFil: totalFil * qty,
      t: t, timeTotal: t * qty, consumption: consumption * qty, energyCost: energyCost * qty,
      energyPerHour: energyPerHour,
      deprCost: deprCost * qty, maintCost: maintCost * qty, laborCost: laborCost * qty,
      subtotal: subtotal, margin: margin, profit: profit, total: total, perGram: perGram
    };
  }

  /* ---------------- Persistência ---------------- */

  var timer = null;

  function buildData() {
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
      energy: {}, extras: {}, job: {}
    };
    ENERGY_FIELDS.forEach(function (f) { data.energy[f] = $('#' + f).value; });
    EXTRAS_FIELDS.forEach(function (f) { data.extras[f] = $('#' + f).value; });
    JOB_FIELDS.forEach(function (f) { data.job[f] = $('#' + f).value; });
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(buildData())); } catch (e) { /* modo privado */ }
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
    fillFields(DEFAULTS.job, JOB_FIELDS);
  }

  function load() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }

    if (data && Array.isArray(data.colors)) {
      data.colors.forEach(addColor);
      fillFields(Object.assign({}, DEFAULTS.energy, data.energy), ENERGY_FIELDS);
      fillFields(Object.assign({}, DEFAULTS.extras, data.extras), EXTRAS_FIELDS);
      fillFields(Object.assign({}, DEFAULTS.job, data.job), JOB_FIELDS);
    } else {
      resetToDefaults();
    }
  }

  /* ---------------- Copiar resumo ---------------- */

  function summaryText() {
    var d = last;
    var q = d.qty || 1;
    var out = [];
    out.push('IMPRESSÃO 3D — RESUMO DE CUSTOS');
    out.push('--------------------------------');
    out.push('QUANTIDADE: ' + q + (q > 1 ? ' peças (valores abaixo já multiplicados)' : ' peça'));
    out.push('');
    out.push('FILOMENTO');
    d.rows.forEach(function (r) {
      out.push('  - ' + r.name + ': ' + nf(1, 1).format(r.gEff * q) + ' g = ' + money(r.cost * q) +
        ' (' + money(r.perKg) + '/kg)');
    });
    if (d.rows.length === 0) out.push('  (nenhuma cor)');
    out.push('  Total: ' + nf(1, 1).format(d.totalG) + ' g = ' + money(d.totalFil));
    out.push('');
    out.push('ENERGIA ELÉTRICA');
    out.push('  Tempo: ' + timeLabel(d.timeTotal) + (q > 1 ? ' (' + timeLabel(d.t) + ' por peça)' : ''));
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
    if (q > 1) out.push('VALOR POR PEÇA:         ' + money(d.total / q));
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

  /* ---------------- Exportar / importar arquivo ---------------- */

  function exportData() {
    var data = buildData();
    data.meta = { app: 'calculadora-custos-3d', versao: 1, exportadoEm: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'calculadora-3d-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Arquivo baixado. Guarde-o para carregar os mesmos dados em outro navegador.');
  }

  function importData(text) {
    var data = null;
    try { data = JSON.parse(text); } catch (e) { toast('Arquivo inválido: não é um JSON válido.'); return; }
    if (!data || typeof data !== 'object' || !Array.isArray(data.colors)) {
      toast('Arquivo inválido: formato não reconhecido.');
      return;
    }
    var cores = data.colors.slice(0, 80);
    list.innerHTML = '';
    colorSeq = 0;
    cores.forEach(function (c) { addColor(c || {}); });
    fillFields(Object.assign({}, DEFAULTS.energy, data.energy), ENERGY_FIELDS);
    fillFields(Object.assign({}, DEFAULTS.extras, data.extras), EXTRAS_FIELDS);
    fillFields(Object.assign({}, DEFAULTS.job, data.job), JOB_FIELDS);
    calc();
    save();
    toast('Dados carregados: ' + cores.length + ' cor(es) restaurada(s).');
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

  $('#exportBtn').addEventListener('click', exportData);

  $('#importBtn').addEventListener('click', function () {
    $('#importFile').click();
  });

  $('#importFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var input = this;
    var reader = new FileReader();
    reader.onload = function () { importData(String(reader.result)); };
    reader.onerror = function () { toast('Não foi possível ler o arquivo.'); };
    reader.readAsText(file);
    input.value = '';
  });

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
