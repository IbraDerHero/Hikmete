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

  /* ---------- Hilfsfunktion: Knoten einklappen und Schalter anhängen ----------
     host    Element, an das Schalter und Hülle gehängt werden
     nodes   die einzuklappenden Knoten, in Reihenfolge
     Gibt die Hülle zurück, damit Aufrufer sie weiterverwenden können. */
  function collapse(host, nodes, labelOpen, labelClosed, prefix) {
    var wrap = document.createElement('div');
    wrap.className = 'tg-wrap';
    wrap.id = 'tg-' + prefix + '-' + (++uid);

    var inner = document.createElement('div');
    inner.className = 'tg-inner';
    nodes.forEach(function (n) { inner.appendChild(n); });
    wrap.appendChild(inner);

    host.appendChild(makeButton(labelOpen, labelClosed, wrap));
    host.appendChild(wrap);
    return wrap;
  }

  /* Beschriftung: data-label hat Vorrang, sonst das CSS-::before, sonst Vorgabe */
  function labelOf(el, fallback) {
    if (el.hasAttribute('data-label')) { return el.getAttribute('data-label'); }
    try {
      var c = window.getComputedStyle(el, '::before').content;
      if (c && c !== 'none' && c !== 'normal') {
        return c.replace(/^["']|["']$/g, '').trim() || fallback;
      }
    } catch (e) { /* Vorgabe bleibt */ }
    return fallback;
  }

  /* ---------- 1. Belegkarten: Tag + Titel bleiben sichtbar ---------- */
  document.querySelectorAll('.card').forEach(function (card) {
    // Alles ab dem ersten <p> einklappen; .tag und h3 bleiben stehen
    var nodes = Array.prototype.slice.call(card.children);
    var start = nodes.findIndex(function (n) { return n.tagName === 'P'; });
    if (start === -1) return; // nichts zum Klappen
    collapse(card, nodes.slice(start), T.hide, T.show, 'c');
  });

  /* ---------- 2. Randglossen: komplett zu, Label als Schalter ---------- */
  document.querySelectorAll('.gloss').forEach(function (gloss) {
    var label = labelOf(gloss, T.gloss);
    gloss.classList.add('tg');
    collapse(gloss, Array.prototype.slice.call(gloss.childNodes), label, label, 'g');
  });

  /* ---------- 2b. Beliebiger Block: <div data-collapse data-label="..."> ---------- */
  document.querySelectorAll('[data-collapse]').forEach(function (box) {
    var label = labelOf(box, T.show);
    box.classList.add('tg-box');
    collapse(box, Array.prototype.slice.call(box.childNodes), label, label, 'b');
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

  /* ---------- 4. Sprunglink: Zielbereich aufklappen ----------
     Wer über die Navigation auf einen Anker springt, soll den Inhalt
     sehen und nicht auf einer zugeklappten Überschrift landen. */
  function openFor(target) {
    if (!target) return;
    // a) Ziel liegt selbst in einer Hülle: alle übergeordneten öffnen
    var w = target.closest ? target.closest('.tg-wrap') : null;
    while (w) {
      var b = document.querySelector('[aria-controls="' + w.id + '"]');
      if (b && b.getAttribute('aria-expanded') === 'false') { b.click(); }
      w = w.parentNode && w.parentNode.closest ? w.parentNode.closest('.tg-wrap') : null;
    }
    // b) Ziel enthält einen klappbaren Block: den ersten öffnen
    var inner = target.querySelector && target.querySelector('.tg-box > .tg-btn');
    if (inner && inner.getAttribute('aria-expanded') === 'false') { inner.click(); }
  }

  function openForHash() {
    var h = window.location.hash;
    if (!h || h.length < 2) return;
    var el = null;
    try { el = document.querySelector(h); } catch (e) { return; }
    openFor(el);
  }

  openForHash();
  window.addEventListener('hashchange', openForHash);

})();


/* ============================================================
   Teil 2 — Chronik-Seitenleiste
   Baut aus der bestehenden .topnav eine linke Leiste,
   chronologisch von oben (ältestes) nach unten (jüngstes).
   ============================================================ */

(function () {
  'use strict';

  var LANG = (document.documentElement.lang || 'de').toLowerCase();
  var IS_SQ = LANG.indexOf('sq') === 0;

  var L = IS_SQ
    ? { base: 'Bazat', chrono: 'Kronologjia', appendix: 'Shtojca', menu: 'Menyja' }
    : { base: 'Grundlagen', chrono: 'Chronologie', appendix: 'Anhang', menu: 'Menü' };

  var rail = document.querySelector('.topnav .rail');
  if (!rail) return;

  /* ---------- Vorhandene Navigation auslesen ---------- */
  var langBlock = rail.querySelector('.langswitch');
  // Alle Links außer dem Sprachumschalter, also auch Verweise auf andere Seiten
  var links = Array.prototype.slice.call(rail.querySelectorAll('a[href]'))
    .filter(function (a) { return !a.closest('.langswitch'); });
  if (!links.length) return;

  // Ein Epochen-Link beginnt mit einer Jahreszahl, z. B. "622–632 · Der Prophet"
  var ERA_RE = /^\s*(\d{3,4}(?:\s*[–-]\s*\d{3,4})?)\s*[·|-]\s*(.+)$/;

  var groups = { base: [], chrono: [], appendix: [] };
  var seenEra = false;

  links.forEach(function (a) {
    var m = ERA_RE.exec(a.textContent);
    if (m) {
      seenEra = true;
      groups.chrono.push({ href: a.getAttribute('href'), yr: m[1].trim(), title: m[2].trim() });
    } else {
      var entry = { href: a.getAttribute('href'), title: a.textContent.trim() };
      (seenEra ? groups.appendix : groups.base).push(entry);
    }
  });

  /* ---------- Seitenleiste aufbauen ---------- */
  var nav = document.createElement('nav');
  nav.className = 'sidenav';
  nav.setAttribute('aria-label', L.menu);

  if (langBlock) {
    var lang = document.createElement('div');
    lang.className = 'sidenav-lang';
    lang.innerHTML = langBlock.innerHTML;
    nav.appendChild(lang);
  }

  function addGroup(items, label, isChrono) {
    if (!items.length) return;
    var g = document.createElement('div');
    g.className = 'sidenav-group' + (isChrono ? ' chrono' : '');

    var lab = document.createElement('span');
    lab.className = 'sidenav-label';
    lab.textContent = label;
    g.appendChild(lab);

    items.forEach(function (it) {
      var a = document.createElement('a');
      a.className = 'nav-item';
      a.href = it.href;
      if (it.yr) {
        var y = document.createElement('span');
        y.className = 'yr';
        y.textContent = it.yr;
        a.appendChild(y);
      }
      var t = document.createElement('span');
      t.className = 'ttl';
      t.textContent = it.title;
      a.appendChild(t);
      g.appendChild(a);
    });

    nav.appendChild(g);
  }

  addGroup(groups.base, L.base, false);
  addGroup(groups.chrono, L.chrono, true);
  addGroup(groups.appendix, L.appendix, false);

  document.body.insertBefore(nav, document.body.firstChild);

  /* ---------- Mobile Bedienung ---------- */
  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', L.menu);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '\u2630';

  var backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';

  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.innerHTML = open ? '\u2715' : '\u2630';
  }

  toggle.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('nav-open'));
  });
  backdrop.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); }
  });

  document.body.insertBefore(backdrop, document.body.firstChild);
  document.body.insertBefore(toggle, document.body.firstChild);

  /* ---------- Aktiven Abschnitt beim Scrollen markieren ---------- */
  var navItems = Array.prototype.slice.call(nav.querySelectorAll('a.nav-item'));
  var targets = navItems.map(function (a) {
    var h = a.getAttribute('href');
    // Nur Anker markieren; Verweise auf andere Seiten haben kein Ziel im Dokument
    return { link: a, el: h.charAt(0) === '#' ? document.querySelector(h) : null };
  }).filter(function (t) { return t.el; });

  navItems.forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth < 1024) { setOpen(false); }
    });
  });

  var ticking = false;
  function markActive() {
    var line = window.innerHeight * 0.28;
    var current = null;
    targets.forEach(function (t) {
      if (t.el.getBoundingClientRect().top <= line) { current = t; }
    });
    // Vor dem ersten Abschnitt: nichts markieren
    navItems.forEach(function (a) {
      a.classList.toggle('active', !!current && a === current.link);
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(markActive); }
  }, { passive: true });
  window.addEventListener('resize', markActive, { passive: true });
  markActive();

})();


/* ============================================================
   Teil 3 — Umschalter Hell / Dunkel
   Der Startwert wird bereits im <head> gesetzt (kein Aufblitzen).
   ============================================================ */

(function () {
  'use strict';

  var IS_SQ = (document.documentElement.lang || 'de').toLowerCase().indexOf('sq') === 0;
  var L = IS_SQ
    ? { light: 'Ndriçim', dark: 'Errësirë', to: 'Ndrysho pamjen' }
    : { light: 'Hell', dark: 'Dunkel', to: 'Ansicht wechseln' };

  var root = document.documentElement;

  function isLight() { return root.getAttribute('data-theme') === 'light'; }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', L.to);

  var ico = document.createElement('span');
  ico.className = 'ico';
  ico.setAttribute('aria-hidden', 'true');
  var txt = document.createElement('span');
  btn.appendChild(ico);
  btn.appendChild(txt);

  function paint() {
    // Beschriftung zeigt, wohin der Klick führt
    if (isLight()) { ico.textContent = '\u263D'; txt.textContent = L.dark; }
    else           { ico.textContent = '\u2600'; txt.textContent = L.light; }
    btn.setAttribute('aria-pressed', isLight() ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    var next = isLight() ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* z. B. Privatmodus */ }
    paint();
  });

  paint();

  var host = document.querySelector('.sidenav-lang') || document.querySelector('.sidenav');
  if (host) { host.appendChild(btn); }

})();


/* ============================================================
   Teil 4 — Karteikarten-Umschalter

   Markup:
     <div class="switcher">
       <article data-tab="Kurztitel"> … Inhalt … </article>
       <article data-tab="Kurztitel"> … Inhalt … </article>
     </div>

   Baut daraus eine Reiterleiste und zeigt jeweils ein Feld.
   Ohne JavaScript bleiben alle Felder untereinander lesbar.
   ============================================================ */

(function () {
  'use strict';

  var IS_SQ = (document.documentElement.lang || 'de').toLowerCase().indexOf('sq') === 0;
  var L = IS_SQ ? { list: 'Zgjidh temën' } : { list: 'Thema wählen' };

  var gid = 0;

  document.querySelectorAll('.switcher').forEach(function (box) {
    var panels = Array.prototype.slice.call(box.children)
      .filter(function (el) { return el.hasAttribute('data-tab'); });
    if (panels.length < 2) return; // bei einem Feld lohnt kein Umschalter

    var id = 'sw' + (++gid);
    var tabs = document.createElement('div');
    tabs.className = 'sw-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', L.list);

    var buttons = [];

    function select(n) {
      panels.forEach(function (p, i) {
        var on = (i === n);
        p.hidden = !on;
        buttons[i].setAttribute('aria-selected', on ? 'true' : 'false');
        buttons[i].tabIndex = on ? 0 : -1;
      });
    }

    panels.forEach(function (panel, i) {
      panel.id = id + '-p' + i;
      panel.classList.add('sw-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', id + '-t' + i);

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw-tab';
      b.id = id + '-t' + i;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', panel.id);
      b.textContent = panel.getAttribute('data-tab');

      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var n = (i + step + panels.length) % panels.length;
        select(n);
        buttons[n].focus();
      });

      buttons.push(b);
      tabs.appendChild(b);
    });

    box.insertBefore(tabs, box.firstChild);
    select(0);
  });

})();
