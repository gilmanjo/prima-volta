// Prima Volta mockups — keyboard renderer v2 (ebony/ivory look, felt strip, LED states).
// kbd(svgEl, "C3", "E5", { "Ab3": "ok" }, { labels: ["Ab3"], path: ["G3","B3"] })
(function () {
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const NS = "http://www.w3.org/2000/svg";
  function toMidi(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error("bad note " + name);
    return (parseInt(m[3], 10) + 1) * 12 + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  }
  const LED = { ok: "#58b573", err: "#d9564c", exp: "#82a6cb" };
  let uidCounter = 0;

  window.kbd = function (el, lo, hi, states, opts) {
    states = states || {}; opts = opts || {};
    const loM = toMidi(lo), hiM = toMidi(hi);
    const st = {}; Object.keys(states).forEach(k => { st[toMidi(k)] = states[k]; });
    const labels = new Map((opts.labels || []).map(n => [toMidi(n), n.replace("b", "♭").replace("#", "♯")]));
    const path = (opts.path || []).map(toMidi);

    const whites = [];
    for (let m = loM; m <= hiM; m++) if (!BLACK.has(m % 12)) whites.push(m);
    const W = 378 / whites.length, FELT = 6, TOP = FELT + 1, H = 116, BH = H * 0.60, BW = Math.min(W * 0.62, 22);
    const hasLab = labels.size > 0;
    el.setAttribute("viewBox", "0 0 378 " + (TOP + H + (hasLab ? 16 : 4)));

    function make(tag, attrs, parent) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      (parent || el).appendChild(n); return n;
    }
    // defs: ivory + ebony gradients, drawn once per svg
    const defs = make("defs", {});
    const uid = "g" + (++uidCounter) + "x";
    function grad(id, stops) {
      const g = make("linearGradient", { id: uid + id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      stops.forEach(([o, c]) => make("stop", { offset: o, "stop-color": c }, g));
    }
    grad("wk", [["0%", "#fbf9f2"], ["78%", "#efeadd"], ["100%", "#e2dccb"]]);
    grad("wkok", [["0%", "#e7f5ea"], ["100%", "#c9e6d0"]]);
    grad("wkerr", [["0%", "#f8e4e1"], ["100%", "#ecc7c2"]]);
    grad("bk", [["0%", "#3a3c44"], ["16%", "#191a1f"], ["100%", "#0b0c0f"]]);
    grad("bkok", [["0%", "#3f7a52"], ["100%", "#1e3c29"]]);
    grad("bkerr", [["0%", "#a04a42"], ["100%", "#55201c"]]);
    grad("felt", [["0%", "#c14a42"], ["100%", "#8e2b26"]]);

    make("rect", { x: 0, y: 0, width: 378, height: FELT, rx: 2, fill: "url(#" + uid + "felt)" }); // the felt strip

    const fillFor = (base, s) => "url(#" + uid + (s === "ok" ? base + "ok" : s === "err" ? base + "err" : base) + ")";
    const xOf = {};
    whites.forEach((m, i) => {
      const s = st[m];
      xOf[m] = i * W;
      make("rect", { x: i * W + 0.6, y: TOP, width: W - 1.2, height: H, rx: 3.2, fill: fillFor("wk", s), stroke: "#0c0d10", "stroke-width": 1 });
      if (s && LED[s]) make("rect", { x: i * W + W * 0.22, y: TOP + H - 9, width: W * 0.56, height: 4.5, rx: 2.2, fill: LED[s], style: "filter: drop-shadow(0 0 4px " + LED[s] + ")" });
      if (s === "exp") make("rect", { x: i * W + 1.8, y: TOP + 1.2, width: W - 3.6, height: H - 2.4, rx: 3, fill: "none", stroke: LED.exp, "stroke-width": 1.6, "stroke-dasharray": "4 3" });
      if (labels.has(m)) make("text", { x: i * W + W / 2, y: TOP + H + 12, class: "keylab" }).textContent = labels.get(m);
    });
    whites.forEach((m, i) => {
      const bm = m + 1;
      if (bm <= hiM && BLACK.has(bm % 12)) {
        const s = st[bm], bx = (i + 1) * W - BW / 2;
        make("rect", { x: bx, y: TOP, width: BW, height: BH, rx: 2.6, fill: fillFor("bk", s), stroke: "#000", "stroke-width": 0.8 });
        make("rect", { x: bx + 2.2, y: TOP + 2, width: BW - 4.4, height: 5, rx: 2, fill: "rgba(255,255,255,0.14)" }); // sheen
        if (s && LED[s]) make("rect", { x: bx + BW * 0.2, y: TOP + BH - 8, width: BW * 0.6, height: 3.8, rx: 1.9, fill: LED[s], style: "filter: drop-shadow(0 0 4px " + LED[s] + ")" });
        if (s === "exp") make("rect", { x: bx + 1, y: TOP + 1, width: BW - 2, height: BH - 2, rx: 2.4, fill: "none", stroke: LED.exp, "stroke-width": 1.5, "stroke-dasharray": "4 3" });
        xOf[bm] = bx + BW / 2 - W / 2;
        if (labels.has(bm)) make("text", { x: (i + 1) * W, y: TOP + H + 12, class: "keylab" }).textContent = labels.get(bm);
      }
    });
    path.forEach((m, i) => {
      const isB = BLACK.has(m % 12);
      const cx = xOf[m] + W / 2, cy = isB ? TOP + BH - 16 : TOP + H - 20;
      make("circle", { cx, cy, r: 7.5, class: "pathdot", style: "filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5))" });
      make("text", { x: cx, y: cy + 3.2, class: "pathnum" }).textContent = (opts.fingers && opts.fingers[i]) || String(i + 1);
    });
  };

  // KeyPicker wheel: circle of fifths. keywheel(el, { selected: "E" }) — majors ring;
  // { minor: true, selectedMinor: "c" } adds the inner minor ring, relative pairs aligned.
  window.keywheel = function (el, opts) {
    opts = opts || {};
    const KEYS = ["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"];
    const MINS = ["a", "e", "b", "f♯", "c♯", "g♯", "d♯", "b♭", "f", "c", "g", "d"];
    const SUBS = ["", "1♯", "2♯", "3♯", "4♯", "5♯", "6♯", "5♭", "4♭", "3♭", "2♭", "1♭"];
    const C = 130;
    el.setAttribute("viewBox", "0 0 260 260");
    function make(tag, attrs) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      el.appendChild(n); return n;
    }
    function pt(r, aDeg) { const a = (aDeg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
    function ring(R1, R2, labels, labelCls, selected, subs) {
      labels.forEach((k, i) => {
        const a0 = i * 30 - 15 + 1.4, a1 = i * 30 + 15 - 1.4;
        const [x0o, y0o] = pt(R2, a0), [x1o, y1o] = pt(R2, a1);
        const [x0i, y0i] = pt(R1, a0), [x1i, y1i] = pt(R1, a1);
        make("path", {
          d: "M " + x0o + " " + y0o + " A " + R2 + " " + R2 + " 0 0 1 " + x1o + " " + y1o +
             " L " + x1i + " " + y1i + " A " + R1 + " " + R1 + " 0 0 0 " + x0i + " " + y0i + " Z",
          class: "seg" + (k === selected ? " " + (opts.state || "ok") : ""),
        });
        const [lx, ly] = pt((R1 + R2) / 2 + (subs ? 3 : 1), i * 30);
        make("text", { x: lx, y: ly + 1, class: labelCls }).textContent = k;
        if (subs && subs[i]) make("text", { x: lx, y: ly + 14, class: "segsub" }).textContent = subs[i];
      });
    }
    if (opts.minorOnly) { // question state for minor prompts: only the asked mode's ring, full size
      ring(66, 122, MINS, "seglab min", opts.selected, null);
      make("text", { x: C, y: C + 4, class: "wheelhint" }).textContent = opts.hint || "tap the key";
    } else if (opts.minor) { // dual ring: the confirmation/reveal state
      ring(80, 122, KEYS, "seglab", opts.selected, null);
      ring(38, 76, MINS, "seglab min", opts.selectedMinor, null);
    } else {
      ring(66, 122, KEYS, "seglab", opts.selected, SUBS);
      make("text", { x: C, y: C + 4, class: "wheelhint" }).textContent = opts.hint || "tap the key";
    }
  };

  // Real engraving via embedded VexFlow (the production renderer, dogfooded).
  // vf(el, { key, time, clef, measures: [ {notes:[{k:["g/4"],d:"q",acc:["#"],style:"#c00"}]} | {} ] })
  // vf(el, { grand: true, key, time, treble: [measures], bass: [measures] })
  window.vf = function (el, opts) {
    const F = Vex.Flow;
    const width = opts.width || 344;
    const grand = !!opts.grand;
    const height = opts.height || (grand ? 212 : 122);
    const r = new F.Renderer(el, F.Renderer.Backends.SVG);
    r.resize(width, height);
    const ctx = r.getContext();
    function drawLine(measures, y, clef) {
      let x = 6;
      const total = width - 12;
      const firstExtra = 58 + (opts.key ? 14 : 0) + (opts.time ? 14 : 0);
      const baseW = (total - firstExtra) / measures.length;
      return measures.map((m, i) => {
        const w = baseW + (i === 0 ? firstExtra : 0);
        const st = new F.Stave(x, y, w);
        if (i === 0) {
          if (clef) st.addClef(clef);
          if (opts.key) st.addKeySignature(opts.key);
          if (opts.time) st.addTimeSignature(opts.time);
        }
        st.setContext(ctx).draw();
        const specs = m.notes || [];
        if (specs.length) {
          const ns = specs.map(sp => {
            const n = new F.StaveNote({ clef: clef || "treble", keys: sp.k, duration: sp.d });
            (sp.acc || []).forEach((a, ix) => { if (a) n.addModifier(new F.Accidental(a), ix); });
            if (sp.style) n.setStyle({ fillStyle: sp.style, strokeStyle: sp.style });
            return n;
          });
          const beams = F.Beam.generateBeams(ns);
          const v = new F.Voice({ num_beats: 4, beat_value: 4 });
          v.setMode(F.Voice.Mode.SOFT);
          v.addTickables(ns);
          new F.Formatter().joinVoices([v]).formatToStave([v], st);
          v.draw(ctx, st);
          beams.forEach(b => b.setContext(ctx).draw());
        }
        x += w;
        return st;
      });
    }
    let tops, bots;
    if (grand) {
      tops = drawLine(opts.treble, 4, "treble");
      bots = drawLine(opts.bass, 100, "bass");
      const conn = (a, b, type) => new F.StaveConnector(a, b).setType(type).setContext(ctx).draw();
      conn(tops[0], bots[0], F.StaveConnector.type.BRACE);
      conn(tops[0], bots[0], F.StaveConnector.type.SINGLE_LEFT);
      conn(tops[tops.length - 1], bots[bots.length - 1], F.StaveConnector.type.SINGLE_RIGHT);
      for (let i = 1; i < tops.length; i++) conn(tops[i], bots[i], F.StaveConnector.type.SINGLE_LEFT);
    } else {
      drawLine(opts.measures, 14, opts.clef || "treble");
    }
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.style.width = "100%"; svg.style.height = "auto";
    }
  };

  // SignaturePicker cell: engraved mini-signature. sigcell(el, "5s"|"3f"|"0", "treble"|"bass")
  window.sigcell = function (el, spec, clef) {
    clef = clef || "treble";
    const n = parseInt(spec, 10) || 0, type = spec.slice(-1);
    const POS = { // SMuFL registration: em = staff height (32px here); baseline on the clef's home line
      treble: { s: [0, 3, -1, 2, 5, 1, 4], f: [4, 1, 5, 2, 6], glyph: "𝄞", gs: 32, gy: 37 },
      bass:   { s: [2, 5, 1, 4, 7, 3, 6], f: [6, 3, 7, 4, 8], glyph: "𝄢", gs: 32, gy: 21 },
    }[clef];
    el.setAttribute("viewBox", "0 0 112 62");
    function make(tag, attrs) {
      const el2 = document.createElementNS(NS, tag);
      for (const k in attrs) el2.setAttribute(k, attrs[k]);
      el.appendChild(el2); return el2;
    }
    for (let i = 0; i < 5; i++)
      make("line", { x1: 4, y1: 13 + i * 8, x2: 108, y2: 13 + i * 8, stroke: "#494b52", "stroke-width": 1 });
    make("text", { x: 3, y: POS.gy, style: "font-family:'Bravura Text','Noto Music','Segoe UI Symbol',serif;font-size:" + POS.gs + "px", fill: "#1e1f24" }).textContent = POS.glyph;
    const positions = type === "f" ? POS.f : POS.s;
    for (let i = 0; i < n; i++)
      make("text", { x: 27 + i * 12, y: 13 + positions[i] * 4, style: "font-family:'Bravura Text','Noto Music','Segoe UI Symbol',serif;font-size:32px", fill: "#1e1f24" }).textContent = type === "f" ? "♭" : "♯";
  };
})();
