/* ============================================================
   app.js — Aufklappbare Randglossen und Belegkarten
   Bindet sich an bestehendes Markup, ohne index.html zu ändern.
   Einbindung: <script src="app.js" defer></script> vor </body>
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Sprachabhängige Beschriftungen ---------- */
  var LANG = (document.documentElement.lang || 'de').toLowerCase();
  var IS_SQ = LANG.indexOf('sq') === 0;

  var T = IS_SQ
    ? { show: 'Shfaq', hide: 'Fshih', gloss: 'Shënim anësor', all: 'Hap të gjitha', none: 'Mbyll të gjitha' }
    : { show: 'Einblenden', hide: 'Ausblenden', gloss: 'Randglosse', all: 'Alle öffnen', none: 'Alle schließen' };

  /* ---------- CSS wird von hier injiziert ---------- */
  var CSS = [
    '.tg-btn{',
    '  display:inline-flex; align-items:center; gap:7px;',
    "  font-family:'IBM Plex Mono',monospace; font-size:10.5px;",
    '  text-transform:uppercase; letter-spacing:0.08em;',
    '  background:none; border:none; padding:4px 0; margin:0;',
    '  cursor:pointer; font-style:normal; text-align:left;',
    '}',
    '.tg-btn:focus-visible{ outline:2px solid var(--gold); outline-offset:3px; border-radius:2px; }',

    /* Pfeil */
    '.tg-ico{',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  width:16px; height:16px; flex:0 0 16px;',
    '  border:1px solid currentColor; border-radius:2px;',
    '  font-size:9px; line-height:1;',
    '  transition:transform .22s ease, background-color .22s ease;',
    '}',
    '.tg-btn[aria-expanded="true"] .tg-ico{ transform:rotate(90deg); }',

    /* Karten-Button */
    '.card .tg-btn{ color:var(--gold-dim); margin-top:2px; }',
    '.card.a .tg-btn{ color:var(--lapis); }',
    '.card.b .tg-btn{ color:var(--vermillion); }',
    '.card.c .tg-btn{ color:#8a7440; }',
    '.card .tg-btn:hover .tg-ico{ background:rgba(0,0,0,0.07); }',

    /* Glossen-Button */
    '.gloss .tg-btn{ color:var(--gold); }',
    '.gloss.tg::before{ display:none; }',
    '.gloss .tg-btn:hover .tg-ico{ background:rgba(233,223,196,0.12); }',

    /* Klapp-Mechanik (Grid-Trick, animierbar ohne feste Höhe) */
    '.tg-wrap{',
    '  display:grid; grid-template-rows:0fr;',
    '  transition:grid-template-rows .28s ease;',
    '}',
    '.tg-wrap.open{ grid-template-rows:1fr; }',
    '.tg-inner{ overflow:hidden; min-height:0; }',
    '.card .tg-wrap.open .tg-inner{ padding-top:8px; }',
    '.gloss .tg-wrap.open .tg-inner{ padding-top:6px; }',

    /* Sammel-Schalter über Kartengruppen */
    '.tg-bulk{',
    "  font-family:'IBM Plex Mono',monospace; font-size:10px;",
    '  text-transform:uppercase; letter-spacing:0.08em;',
    '  color:var(--parchment-2); background:none; border:1px solid var(--line);',
    '  border-radius:2px; padding:5px 10px; margin:0 0 12px; cursor:pointer;',
    '}',
    '.tg-bulk:hover{ color:var(--gold); border-color:var(--gold); }',

    /* Ohne JS bleibt alles sichtbar — daher erst hier verstecken */
    '@media print{ .tg-wrap{ grid-template-rows:1fr !important; } .tg-btn{ display:none; } }'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var uid = 0;

  /* ---------- Hilfsfunktion: Button bauen ---------- */
  function makeButton(labelOpen, labelClosed, wrap) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tg-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', wrap.id);

    var ico = document.createElement('span');
    ico.className = 'tg-ico';
    ico.setAttribute('aria-hidden', 'true');
    ico.textContent = '\u25B6'; // ▶

    var txt = document.createElement('span');
    txt.className = 'tg-txt';
    txt.textContent = labelClosed;

    btn.appendChild(ico);
    btn.appendChild(txt);

    btn.addEventListener('click', function () {
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      txt.textContent = open ? labelOpen : labelClosed;
    });

    return btn;
  }

  /* ---------- 1. Belegkarten: Tag + Titel bleiben sichtbar ---------- */
  document.querySelectorAll('.card').forEach(function (card) {
    // Alles ab dem ersten <p> einklappen; .tag und h3 bleiben stehen
    var nodes = Array.prototype.slice.call(card.children);
    var start = nodes.findIndex(function (n) { return n.tagName === 'P'; });
    if (start === -1) return; // nichts zum Klappen

    var wrap = document.createElement('div');
    wrap.className = 'tg-wrap';
    wrap.id = 'tg-c-' + (++uid);

    var inner = document.createElement('div');
    inner.className = 'tg-inner';
    nodes.slice(start).forEach(function (n) { inner.appendChild(n); });
    wrap.appendChild(inner);

    card.appendChild(makeButton(T.hide, T.show, wrap));
    card.appendChild(wrap);
  });

  /* ---------- 2. Randglossen: komplett zu, Label als Schalter ---------- */
  document.querySelectorAll('.gloss').forEach(function (gloss) {
    // Label aus dem vorhandenen ::before lesen — funktioniert DE wie SQ
    var label = T.gloss;
    try {
      var c = window.getComputedStyle(gloss, '::before').content;
      if (c && c !== 'none' && c !== 'normal') {
        label = c.replace(/^["']|["']$/g, '').trim() || label;
      }
    } catch (e) { /* Fallback bleibt */ }

    var wrap = document.createElement('div');
    wrap.className = 'tg-wrap';
    wrap.id = 'tg-g-' + (++uid);

    var inner = document.createElement('div');
    inner.className = 'tg-inner';
    while (gloss.firstChild) { inner.appendChild(gloss.firstChild); }
    wrap.appendChild(inner);

    gloss.classList.add('tg');
    gloss.appendChild(makeButton(label, label, wrap));
    gloss.appendChild(wrap);
  });

  /* ---------- 3. Sammel-Schalter über jeder Kartengruppe ---------- */
  document.querySelectorAll('.cards').forEach(function (group) {
    var btns = group.querySelectorAll('.card .tg-btn');
    if (btns.length < 2) return;

    var bulk = document.createElement('button');
    bulk.type = 'button';
    bulk.className = 'tg-bulk';
    bulk.textContent = T.all;

    bulk.addEventListener('click', function () {
      var opening = bulk.textContent === T.all;
      btns.forEach(function (b) {
        var isOpen = b.getAttribute('aria-expanded') === 'true';
        if (isOpen !== opening) { b.click(); }
      });
      bulk.textContent = opening ? T.none : T.all;
    });

    group.parentNode.insertBefore(bulk, group);
  });

})();
