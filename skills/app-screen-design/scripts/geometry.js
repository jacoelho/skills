// Geometry audit for SKILL.md step 8. Inject into a rendered page, then call
// window.__geometry({ tokens, root, exclude, containers, rows, draw }). It reads
// only the rendered DOM, so it works the same for any framework or none. Measuring rows
// by ink follows github.com/pritamux/gridlines (MIT).
(() => {
  const TOLERANCE = 1;
  const DRIFT_MAX = 4;
  const HOLE = 40;
  const OVERLAY = "data-geometry-overlay";
  const LANDMARKS = [
    "main", "aside", "nav", "header", "footer", "dialog", "form", "table",
    '[role="main"]', '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '[role="dialog"]', '[role="alertdialog"]', '[role="menu"]', '[role="listbox"]',
    '[role="toolbar"]', '[role="tabpanel"]',
  ].join(", ");
  const FIELDS =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea, [role="combobox"], [role="searchbox"], [role="textbox"]';
  const CONTROLS = `button, [role="button"], ${FIELDS}`;
  const ICONS =
    'svg, img, [role="img"], input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="switch"]';

  // Each measured quantity is checked against the tokens of its own role, named as in
  // references/foundation.md.
  const ROLES = {
    gutter: { label: "gutter", tokens: ["gap"] },
    inset: { label: "card inset", tokens: ["pad"] },
    cardRadius: { label: "card radius", tokens: ["radius-card", "radius-sheet"], exact: true },
    controlRadius: { label: "control radius", tokens: ["radius-control"], exact: true },
    chipRadius: { label: "chip radius", tokens: ["radius-chip", "radius-control"], exact: true },
    controlHeight: { label: "control height", tokens: ["control-height"], exact: true },
    fontSize: { label: "font size", tokens: /^fs-/, exact: true },
  };
  // Ink positions carry a glyph's 0-1px side bearing; CSS values such as a radius or a height
  // do not, so they group at half a pixel and a 33px control is not a 32px token.
  const EXACT = 0.5;
  const toleranceOf = (role) => (role?.exact ? EXACT : TOLERANCE);
  const roleTakes = (role, name) => (role.tokens instanceof RegExp ? role.tokens.test(name) : role.tokens.includes(name));

  const px = (v) => Math.round(v * 2) / 2;
  const near = (a, b) => a !== undefined && b !== undefined && Math.abs(a - b) <= TOLERANCE;
  const clear = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);

  // A length in px or rem. A token a role takes in any other unit is an error; other names, such
  // as colours or durations, are not lengths and are left out.
  function lengthOf(name, value) {
    if (typeof value === "number") return value;
    const m = String(value).trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i);
    if (m && (m[2] === "" || m[2] === "px")) return +m[1];
    if (m && m[2] === "rem") return +m[1] * parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (Object.values(ROLES).some((r) => roleTakes(r, name))) throw new Error(`tokens: ${name}: ${value} is not in px or rem`);
    return undefined;
  }

  // Accepts "name: 12px" text, an object, or a list of either, later entries winning.
  function parseTokens(input) {
    if (!input) return {};
    if (Array.isArray(input)) return Object.assign({}, ...input.map(parseTokens));
    const entries = typeof input === "object"
      ? Object.entries(input)
      : [...String(input).matchAll(/([a-z][a-z0-9-]*):\s*(-?\d+(?:\.\d+)?[a-z%]*)(?![\w.#])/g)].map((m) => [m[1], m[2]]);
    return Object.fromEntries(entries.map(([k, v]) => [k, lengthOf(k, v)]).filter(([, v]) => Number.isFinite(v)));
  }

  window.__geometry = function (opts = {}) {
    document.querySelectorAll(`[${OVERLAY}]`).forEach((n) => n.remove());
    const tokens = parseTokens(opts.tokens);
    const known = Object.keys(tokens).filter((name) => Object.values(ROLES).some((r) => roleTakes(r, name)));
    if (opts.tokens && !known.length) {
      throw new Error(`tokens: no known token among ${Object.keys(tokens).join(", ") || "(none parsed)"}; expected names such as gap, pad, radius-card, control-height, fs-body`);
    }
    const tokensOf = (role) => Object.entries(tokens).filter(([name]) => roleTakes(role, name)).map(([name, value]) => ({ name, value }));

    let rootEl = document.body;
    const findings = [];
    if (opts.root) {
      rootEl = document.querySelector(opts.root);
      if (!rootEl) throw new Error(`root ${opts.root} matched nothing`);
    } else {
      rootEl = document.querySelector('main, [role="main"]');
      if (!rootEl) {
        rootEl = document.body;
        findings.push({ check: "root", where: "body", message: "no main landmark: measured the body, so a sidebar counts as a block; pass root", measured: {} });
      }
    }

    const styleCache = new Map();
    const style = (el) => {
      let cs = styleCache.get(el);
      if (!cs) styleCache.set(el, (cs = getComputedStyle(el)));
      return cs;
    };
    const shown = (el) =>
      el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : style(el).visibility !== "hidden";
    const tiny = (el) => {
      const r = el.getBoundingClientRect();
      return r.width <= 1 || r.height <= 1;
    };
    const skipped = (el) => el.closest(`[${OVERLAY}], script, style${opts.exclude ? `, ${opts.exclude}` : ""}`);
    const backdrop = (el) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const bg = style(a).backgroundColor;
        if (!clear(bg)) return bg;
      }
      return "rgb(255, 255, 255)";
    };
    // Tailwind's shadow-none and ring-0 compute to lists of clear, zero-size shadows that paint nothing.
    const shadowed = (el) =>
      style(el).boxShadow !== "none" &&
      style(el).boxShadow.split(/,(?![^(]*\))/).some((shadow) => {
        const colour = shadow.match(/[a-z-]+\([^)]*\)|#[0-9a-f]+/i)?.[0];
        return !clear(colour) && [...shadow.replace(colour, "").matchAll(/-?[\d.]+px/g)].some((m) => parseFloat(m[0]) !== 0);
      });
    const surface = (el) => {
      if (/^(HTML|BODY|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH)$/.test(el.tagName)) return false;
      const cs = style(el);
      const fill = !clear(cs.backgroundColor) && cs.backgroundColor !== backdrop(el);
      const border = ["Top", "Right", "Bottom", "Left"].every(
        (s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none" && !clear(cs[`border${s}Color`]),
      );
      return fill || border || shadowed(el);
    };
    const ruled = (el) => {
      if (/^(HTML|BODY|THEAD|TBODY|TFOOT|TR|TD|TH)$/.test(el.tagName)) return false;
      const cs = style(el);
      return ["Top", "Bottom"].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none" && !clear(cs[`border${s}Color`]));
    };
    const inner = (el) => {
      const r = el.getBoundingClientRect();
      const cs = style(el);
      return {
        left: r.left + parseFloat(cs.borderLeftWidth),
        right: r.right - parseFloat(cs.borderRightWidth),
        top: r.top + parseFloat(cs.borderTopWidth),
        bottom: r.bottom - parseFloat(cs.borderBottomWidth),
      };
    };
    const contentBox = (el) => {
      const b = inner(el);
      const cs = style(el);
      return { left: b.left + parseFloat(cs.paddingLeft), right: b.right - parseFloat(cs.paddingRight) };
    };
    const describe = (el) => {
      const label = el.getAttribute("aria-label") || el.querySelector("h1, h2, h3, h4, [role='heading']")?.textContent.trim();
      if (label) return label.slice(0, 40);
      const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : "";
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : cls}`;
    };
    const selectorOf = (el) => {
      const parts = [];
      for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        if (a.id) {
          parts.unshift(`#${CSS.escape(a.id)}`);
          return parts.join(" > ");
        }
        const same = [...a.parentElement.children].filter((c) => c.tagName === a.tagName);
        parts.unshift(same.length > 1 ? `${a.tagName.toLowerCase()}:nth-of-type(${same.indexOf(a) + 1})` : a.tagName.toLowerCase());
      }
      return ["body", ...parts].join(" > ");
    };

    const all = [...document.body.querySelectorAll("*")].filter((el) => !skipped(el) && !el.parentElement?.closest("svg"));
    const visible = all.filter((el) => shown(el) && !tiny(el));

    const groupsOf = (values, role) => {
      const tol = toleranceOf(role);
      const sorted = values.filter((v) => Number.isFinite(v.px)).sort((a, b) => a.px - b.px);
      const groups = [];
      for (const v of sorted) {
        const g = groups[groups.length - 1];
        if (g && v.px - g.start <= tol) g.members.push(v);
        else groups.push({ start: v.px, members: [v] });
      }
      const candidates = role ? tokensOf(role) : [];
      return groups.map((g) => {
        const counts = {};
        g.members.forEach((m) => (counts[px(m.px)] = (counts[px(m.px)] || 0) + 1));
        const value = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const token = candidates.filter((t) => Math.abs(t.value - value) <= tol).map((t) => t.name);
        return {
          px: value,
          count: g.members.length,
          token: token.length ? token.join(" ") : null,
          examples: [...new Set(g.members.map((m) => m.where))].slice(0, 3),
          selectors: [...new Set(g.members.map((m) => m.selector).filter(Boolean))].slice(0, 3),
        };
      });
    };
    // With tokens for the role, a value that maps to none is one finding naming the nearest
    // token. Without them, two groups more than the role's tolerance and at most DRIFT_MAX apart are drift.
    const checkGroups = (groups, role) => {
      const candidates = tokensOf(role);
      if (candidates.length) {
        for (const g of groups.filter((g) => !g.token)) {
          const nearest = candidates.sort((a, b) => Math.abs(a.value - g.px) - Math.abs(b.value - g.px))[0];
          const close = Math.abs(nearest.value - g.px) <= DRIFT_MAX;
          findings.push({
            check: "off-token",
            where: role.label,
            message: `${role.label}: ${g.px}px ${close ? `is ${px(Math.abs(nearest.value - g.px))}px off ${nearest.name} (${nearest.value}px)` : `maps to no ${role.tokens instanceof RegExp ? "fs-" : role.tokens.join(" or ")} token`} at ${g.examples.join(", ")}`,
            measured: { px: g.px, nearest: nearest.name, examples: g.examples, selectors: g.selectors },
          });
        }
        return groups;
      }
      for (let i = 1; i < groups.length; i++) {
        const gap = groups[i].px - groups[i - 1].px;
        if (gap > toleranceOf(role) && gap <= DRIFT_MAX) {
          findings.push({
            check: "drift",
            where: role.label,
            message: `${role.label}: ${groups[i - 1].px}px and ${groups[i].px}px are ${px(gap)}px apart`,
            measured: [groups[i - 1], groups[i]].map((g) => ({ px: g.px, examples: g.examples, selectors: g.selectors })),
          });
        }
      }
      return groups;
    };

    // Blocks: the outermost surfaces, ruled sections, tables and the h1 inside the canvas. A lone
    // surface spanning the canvas, such as a framed sheet, is a frame: its contents are the blocks.
    const isBlock = (el) => {
      if (el.matches("h1, table, [role='grid']")) return true;
      if (el.matches(CONTROLS)) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 120 && r.height >= 40 && (surface(el) || ruled(el));
    };
    const outermost = (scope) => {
      const set = new Set(visible.filter((el) => el !== scope && scope.contains(el) && isBlock(el)));
      return [...set].filter((el) => {
        for (let a = el.parentElement; a && a !== scope; a = a.parentElement) if (set.has(a)) return false;
        return true;
      });
    };
    // A title's left edge is where its ink starts.
    const blockRect = (el) => {
      const r = el.getBoundingClientRect();
      if (!el.matches("h1")) return r;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((x) => x.width > 1);
      return rects.length ? { left: Math.min(...rects.map((x) => x.left)), right: r.right, top: r.top, bottom: r.bottom } : r;
    };
    let canvasEl = rootEl;
    let canvas = contentBox(rootEl);
    let outer = outermost(rootEl);
    const frameEls = [];
    for (;;) {
      const frames = outer.filter((el) => !el.matches("h1"));
      if (frames.length !== 1 || frames[0].matches("table, [role='grid']")) break;
      const r = frames[0].getBoundingClientRect();
      if (r.left - canvas.left > TOLERANCE || canvas.right - r.right > TOLERANCE) break;
      const within = outermost(frames[0]);
      if (within.filter((el) => !el.matches("h1")).length < 2) break;
      // A title above the frame shares the frame's left edge.
      for (const h of outer.filter((el) => el.matches("h1"))) {
        const groups = groupsOf([frames[0], h].map((el) => ({ px: blockRect(el).left - canvas.left, where: describe(el), selector: selectorOf(el) })));
        if (groups.length > 1) {
          findings.push({ check: "block-edge", where: "left", message: `the title and the frame below it start on 2 left edges: ${groups.map((g) => `${g.px}px (${g.selectors.join(", ")})`).join("; ")}`, measured: groups });
        }
      }
      frameEls.push(frames[0]);
      canvasEl = frames[0];
      canvas = contentBox(canvasEl);
      outer = within;
    }
    const blocks = outer.map((el) => {
      const r = blockRect(el);
      return { el, name: describe(el), selector: selectorOf(el), heading: el.matches("h1"), left: r.left - canvas.left, right: canvas.right - r.right, top: r.top, bottom: r.bottom, x0: r.left, x1: r.right };
    });
    const cards = blocks.filter((b) => !b.heading);
    if (cards.length < 2) {
      const unchecked = blocks.length < 2 ? "block edges and gutters were not checked" : "the title's left edge was compared with it, but gutters and band edges were not checked";
      findings.push({
        check: "not-measured",
        where: describe(canvasEl),
        message: `${cards.length} block${cards.length === 1 ? "" : "s"} found in ${describe(canvasEl)}: ${unchecked}. If the blocks sit inside an element other than the root, pass that element as root`,
        measured: { blocks: cards.length },
      });
    }

    const bands = [];
    for (const b of [...blocks].sort((a, c) => a.top - c.top)) {
      const band = bands.find((s) => b.top < s.bottom - TOLERANCE && b.bottom > s.top + TOLERANCE);
      if (band) {
        band.items.push(b);
        band.top = Math.min(band.top, b.top);
        band.bottom = Math.max(band.bottom, b.bottom);
      } else bands.push({ top: b.top, bottom: b.bottom, items: [b] });
    }
    const leftEdges = bands.map((s) => {
      const b = s.items.reduce((a, c) => (a.left <= c.left ? a : c));
      return { px: b.left, where: b.name, selector: b.selector };
    });
    const rightEdges = bands
      .map((s) => s.items.filter((b) => !b.heading))
      .filter((items) => items.length)
      .map((items) => {
        const b = items.reduce((a, c) => (a.right <= c.right ? a : c));
        return { px: b.right, where: b.name, selector: b.selector };
      });
    const edges = { left: groupsOf(leftEdges), right: groupsOf(rightEdges) };
    for (const [side, groups] of Object.entries(edges)) {
      if (groups.length > 1) {
        findings.push({
          check: "block-edge",
          where: side,
          message: `blocks stop on ${groups.length} ${side} edges: ${groups.map((g) => `${g.px}px (${g.selectors.join(", ")})`).join("; ")}`,
          measured: groups,
        });
      }
    }

    // Blocks in one band share its top and bottom edges. Blocks stacked in one column of the band,
    // such as two cards beside a tall one, count as one block (references/layout.md).
    const bandEdges = [];
    for (const s of bands) {
      const columns = [];
      for (const b of s.items.filter((b) => !b.heading).sort((a, c) => a.x0 - c.x0)) {
        const col = columns.find((c) => b.x0 < c.x1 - TOLERANCE && b.x1 > c.x0 + TOLERANCE);
        if (col) {
          col.items.push(b);
          Object.assign(col, { x0: Math.min(col.x0, b.x0), x1: Math.max(col.x1, b.x1), top: Math.min(col.top, b.top), bottom: Math.max(col.bottom, b.bottom) });
        } else columns.push({ x0: b.x0, x1: b.x1, top: b.top, bottom: b.bottom, items: [b] });
      }
      if (columns.length < 2) continue;
      const of = (c) => ({ where: c.items.map((b) => b.name).join(" + "), selector: c.items[0].selector });
      for (const [side, offset] of [["top", (c) => c.top - s.top], ["bottom", (c) => s.bottom - c.bottom]]) {
        const groups = groupsOf(columns.map((c) => ({ px: offset(c), ...of(c) })));
        bandEdges.push(...groups.map((g) => ({ side, y: side === "top" ? s.top + g.px : s.bottom - g.px, count: g.count })));
        if (groups.length > 1) {
          findings.push({
            check: "block-edge",
            where: side,
            message: `blocks in one band stop on ${groups.length} ${side} edges: ${groups.map((g) => `${g.px}px (${g.selectors.join(", ")})`).join("; ")}`,
            measured: groups,
          });
        }
      }
    }

    const gaps = [];
    for (const s of bands) {
      const row = s.items.filter((b) => !b.heading).sort((a, c) => a.x0 - c.x0);
      for (let i = 1; i < row.length; i++) {
        const g = row[i].x0 - row[i - 1].x1;
        if (g > 0) gaps.push({ px: g, where: `${row[i - 1].name} | ${row[i].name}`, selector: row[i].selector });
      }
    }
    // Vertical gutters run between bands and between blocks stacked inside one; a short card's
    // distance to the band below is its uneven bottom edge, reported above, not a gutter.
    // A gap holding a heading or other text is a section gap, which foundation.md sizes apart from the gutter.
    const cardBands = bands.map((s) => ({ ...s, items: s.items.filter((b) => !b.heading) })).filter((s) => s.items.length);
    const textBetween = (top, bottom) =>
      visible.some((el) => {
        if (!canvasEl.contains(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
        const r = el.getBoundingClientRect();
        return r.top >= top - TOLERANCE && r.bottom <= bottom + TOLERANCE;
      });
    for (let i = 1; i < cardBands.length; i++) {
      const g = cardBands[i].top - cardBands[i - 1].bottom;
      if (g >= TOLERANCE && !textBetween(cardBands[i - 1].bottom, cardBands[i].top)) gaps.push({ px: g, where: `${cardBands[i - 1].items[0].name} / ${cardBands[i].items[0].name}`, selector: cardBands[i].items[0].selector });
    }
    for (const s of cardBands) {
      for (const b of s.items) {
        const below = s.items
          .filter((c) => c !== b && c.top >= b.bottom - TOLERANCE && c.x0 < b.x1 - TOLERANCE && c.x1 > b.x0 + TOLERANCE)
          .sort((a, c) => a.top - c.top)[0];
        if (below && below.top - b.bottom >= TOLERANCE) gaps.push({ px: below.top - b.bottom, where: `${b.name} / ${below.name}`, selector: below.selector });
      }
    }
    const gutters = groupsOf(gaps, ROLES.gutter);
    if (gutters.length > 1 && !tokensOf(ROLES.gutter).length) {
      findings.push({ check: "gutter", where: "canvas", message: `blocks use ${gutters.length} gutters: ${gutters.map((g) => `${g.px}px`).join(", ")}`, measured: gutters });
    }
    checkGroups(gutters, ROLES.gutter);

    // Census of the whole screen.
    const textEls = visible.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest("svg"));
    // Font sizes are counted, not checked: a screen uses 4-9 sizes, some between the fs tokens
    // (references/foundation.md).
    const sizes = groupsOf(textEls.map((el) => ({ px: parseFloat(style(el).fontSize), where: describe(el), selector: selectorOf(el) })), ROLES.fontSize);
    const weights = [...new Set(textEls.map((el) => style(el).fontWeight))].sort();
    const pairs = {};
    textEls.forEach((el) => {
      const k = `${px(parseFloat(style(el).fontSize))}/${style(el).fontWeight}`;
      pairs[k] = (pairs[k] || 0) + 1;
    });
    const panels = visible.filter((el) => !el.matches(CONTROLS) && surface(el) && el.getBoundingClientRect().width >= 120 && el.getBoundingClientRect().height >= 40);
    const panelSet = new Set(panels);
    // The surfaces whose insets and holes are checked: the cards, and a frame measured through
    // that holds sections rather than cards, such as a card holding a filter bar and a table.
    const cardEls = new Set([...cards.map((b) => b.el), ...frameEls.filter((f) => !panels.some((p) => p !== f && f.contains(p)))]);
    const radiusOf = (els) =>
      els
        .map((el) => ({ el, v: parseFloat(style(el).borderTopLeftRadius), r: el.getBoundingClientRect() }))
        .filter(({ v, r }) => v > 0 && v < Math.min(r.height, r.width) / 2 - TOLERANCE)
        .map(({ el, v }) => ({ px: v, where: describe(el), selector: selectorOf(el) }));
    // A control is the box it draws: a button's own, a field's own, or the bordered wrapper around
    // a transparent input. A multi-line field has no control height.
    const controlBox = (el) => {
      if (el.matches('textarea, [aria-multiline="true"]')) return null;
      if (surface(el)) return el;
      if (!el.matches(FIELDS)) return null;
      for (let a = el.parentElement, i = 0; a && i < 3; a = a.parentElement, i++) {
        if (surface(a)) return a.getBoundingClientRect().height <= 64 ? a : null;
      }
      return null;
    };
    const controls = [...new Set(visible.filter((el) => el.matches(CONTROLS) && !el.closest("svg")).map(controlBox).filter(Boolean))];
    const controlSet = new Set(controls);
    const chips = visible.filter((el) => !panelSet.has(el) && !controlSet.has(el) && !el.matches(CONTROLS) && surface(el) && !el.closest("svg"));
    const radii = {
      cards: checkGroups(groupsOf(radiusOf(panels), ROLES.cardRadius), ROLES.cardRadius),
      controls: checkGroups(groupsOf(radiusOf(controls), ROLES.controlRadius), ROLES.controlRadius),
      chips: checkGroups(groupsOf(radiusOf(chips), ROLES.chipRadius), ROLES.chipRadius),
    };
    const heights = checkGroups(groupsOf(controls.map((el) => ({ px: el.getBoundingClientRect().height, where: describe(el), selector: selectorOf(el) })), ROLES.controlHeight), ROLES.controlHeight);
    const shadows = {};
    visible.filter(shadowed).forEach((el) => (shadows[style(el).boxShadow] = (shadows[style(el).boxShadow] || 0) + 1));

    // Containers: surfaces, the regions beside the root such as a plain sidebar or top bar, elements
    // named by opts.containers, and landmarks not inside another container. A transparent nav or
    // table inside a panel or region shares its lines.
    const visibleSet = new Set(visible);
    const regions = new Set();
    for (let a = rootEl; a.parentElement && a !== document.body; a = a.parentElement) {
      for (const sibling of a.parentElement.children) if (sibling !== a && visibleSet.has(sibling)) regions.add(sibling);
    }
    const containerSet = new Set([...panels, ...regions]);
    if (opts.containers) visible.filter((el) => el.matches(opts.containers)).forEach((el) => containerSet.add(el));
    for (const el of visible.filter((el) => el.matches(LANDMARKS))) {
      if (surface(el)) containerSet.add(el);
      else {
        let inside = false;
        for (let a = el.parentElement; a; a = a.parentElement) if (panelSet.has(a) || regions.has(a) || a.matches(LANDMARKS)) inside = true;
        if (!inside) containerSet.add(el);
      }
    }
    const ownerOf = (el) => {
      for (let a = el; a; a = a.parentElement) if (containerSet.has(a)) return a;
      return null;
    };
    // A field is the input itself when it draws its own box, or the bordered wrapper around a
    // transparent input, as search fields with an icon are often built.
    const fieldOf = (el) => (el.matches(FIELDS) ? el : el.getBoundingClientRect().height <= 64 ? el.querySelector(FIELDS) : null);
    const boxIn = (el, owner) => {
      const cw = owner.getBoundingClientRect().width;
      let box = null;
      for (let a = el; a && a !== owner; a = a.parentElement) {
        if (!surface(a)) continue;
        const r = a.getBoundingClientRect();
        if (r.height > 64) continue;
        if (fieldOf(a) || (r.width < cw * 0.6 && !a.matches("[role='tab']"))) box = a;
      }
      return box;
    };
    const blockOf = (el) => {
      let a = el;
      while (a.parentElement && /^(inline|contents)$/.test(style(a).display)) a = a.parentElement;
      return a;
    };
    // What shows of a rect once every clipping ancestor up to the container cuts it.
    const clip = (rect, el, owner) => {
      let { left, right, top, bottom } = rect;
      for (let a = el; a && a !== owner.parentElement; a = a.parentElement) {
        const cs = style(a);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          const b = inner(a);
          if (cs.overflowX !== "visible") [left, right] = [Math.max(left, b.left), Math.min(right, b.right)];
          if (cs.overflowY !== "visible") [top, bottom] = [Math.max(top, b.top), Math.min(bottom, b.bottom)];
        }
      }
      return right - left > 1 && bottom - top > 1 ? { left, right, top, bottom } : null;
    };
    const inkOfSvg = (svg) => {
      const r = svg.getBoundingClientRect();
      try {
        const b = svg.getBBox();
        const m = svg.getScreenCTM();
        if (b.width > 0 && m) {
          const a = new DOMPoint(b.x, b.y).matrixTransform(m);
          const c = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
          return { left: Math.min(a.x, c.x), right: Math.max(a.x, c.x), top: r.top, bottom: r.bottom, boxLeft: r.left, boxRight: r.right };
        }
      } catch {
        // getBBox throws for an svg that is not rendered; its box is the best measure left.
      }
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, boxLeft: r.left, boxRight: r.right };
    };

    const itemsBy = new Map();
    const boxItems = new Map();
    const add = (owner, item) => {
      if (!itemsBy.has(owner)) itemsBy.set(owner, []);
      itemsBy.get(owner).push(item);
    };
    const addBox = (owner, box, inkLeft) => {
      let item = boxItems.get(box);
      if (!item) {
        const r = box.getBoundingClientRect();
        const cs = style(box);
        const input = fieldOf(box);
        const fieldText = input ? input.getBoundingClientRect().left + parseFloat(style(input).paddingLeft) + parseFloat(style(input).borderLeftWidth) : undefined;
        item = { kind: "box", el: box, field: !!input, control: !!input || box.matches(CONTROLS), left: r.left, right: r.right, top: r.top, bottom: r.bottom, label: fieldText, t: `[${describe(box)}]` };
        boxItems.set(box, item);
        add(owner, item);
      }
      if (inkLeft !== undefined && (item.label === undefined || inkLeft < item.label)) item.label = inkLeft;
    };

    const unowned = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      const el = n.parentElement;
      if (!text || !el || el.closest("svg, template") || skipped(el) || !shown(el) || tiny(el)) continue;
      const owner = ownerOf(el);
      if (!owner) {
        let region = el;
        while (region.parentElement && region.parentElement !== document.body) region = region.parentElement;
        unowned.set(region, (unowned.get(region) || 0) + 1);
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(n);
      const rects = [...range.getClientRects()].map((r) => clip(r, el, owner)).filter(Boolean);
      if (!rects.length) continue;
      const box = boxIn(el, owner);
      if (box) {
        addBox(owner, box, Math.min(...rects.map((r) => r.left)));
        continue;
      }
      const font = `${style(el).fontSize} ${style(el).fontWeight} ${style(el).fontFamily}`;
      for (const r of rects) add(owner, { kind: "text", el, font, ...r, t: text.slice(0, 24) });
    }

    for (const field of visible.filter((el) => el.matches(FIELDS))) {
      const owner = ownerOf(field.parentElement);
      if (!owner) continue;
      const box = boxIn(field, owner) || (surface(field) ? field : null);
      if (box) addBox(owner, box);
    }

    for (const [region, count] of unowned) {
      findings.push({
        check: "not-measured",
        where: describe(region),
        message: `${count} text run${count === 1 ? "" : "s"} in ${describe(region)} sit in no container, so their rows were not checked; pass containers to name it`,
        measured: { text: count, selector: selectorOf(region) },
      });
    }

    const iconEls = visible.filter((el) => {
      if (el.matches(ICONS)) return !el.parentElement?.closest("svg");
      if (el.children.length || el.textContent.trim()) return false;
      const cs = style(el);
      const before = getComputedStyle(el, "::before").content;
      return cs.backgroundImage !== "none" || (cs.maskImage && cs.maskImage !== "none") || (before && before !== "none" && before !== "normal");
    });
    for (const el of iconEls) {
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.width > 64 || r.height < 6 || r.height > 64) continue;
      const owner = ownerOf(el);
      if (!owner) continue;
      const ink = el.tagName === "svg" ? inkOfSvg(el) : { left: r.left, right: r.right, top: r.top, bottom: r.bottom, boxLeft: r.left, boxRight: r.right };
      const box = boxIn(el.parentElement, owner);
      if (box) {
        addBox(owner, box, ink.left);
        continue;
      }
      if (!clip(r, el, owner)) continue;
      add(owner, { kind: "icon", el, ...ink, t: `<${el.tagName.toLowerCase()}>` });
    }

    // A disclosure marker is drawn by ::marker or ::before, not by a node; it starts its row.
    for (const summary of visible.filter((el) => el.matches("summary"))) {
      const owner = ownerOf(summary);
      if (!owner) continue;
      const range = document.createRange();
      range.selectNodeContents(summary);
      const first = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1).sort((a, b) => a.top - b.top || a.left - b.left)[0];
      const start = contentBox(summary).left;
      if (first && first.left - start > 4 && first.left - start <= 32) {
        add(owner, { kind: "icon", el: summary, left: start, right: first.left - 4, top: first.top, bottom: first.bottom, boxLeft: start, boxRight: first.left - 4, t: "<marker>" });
      }
    }

    // Shapes seed rows: a text line touching an icon, avatar, switch or box belongs to its row,
    // so a two-line row beside one shape stays one row. Other text joins by half its height.
    const rowsOf = (items) => {
      const rows = [];
      const overlap = (r, i) => Math.min(r.bottom, i.bottom) - Math.max(r.top, i.top);
      const join = (row, i) => {
        row.items.push(i);
        row.top = Math.min(row.top, i.top);
        row.bottom = Math.max(row.bottom, i.bottom);
      };
      const byTop = (a, b) => a.top - b.top || a.left - b.left;
      for (const i of items.filter((i) => i.kind !== "text").sort(byTop)) {
        const row = rows.find((r) => overlap(r, i) > TOLERANCE);
        if (row) join(row, i);
        else rows.push({ top: i.top, bottom: i.bottom, items: [i], seeded: true });
      }
      for (const i of items.filter((i) => i.kind === "text").sort(byTop)) {
        const h = i.bottom - i.top;
        const row =
          rows.find((r) => r.seeded && overlap(r, i) > TOLERANCE) ||
          rows.find((r) => !r.seeded && overlap(r, i) >= Math.min(h, r.bottom - r.top) / 2);
        if (row) join(row, i);
        else rows.push({ top: i.top, bottom: i.bottom, items: [i], seeded: false });
      }
      return rows.sort(byTop);
    };

    // A panel holding one row, such as a filled active nav item, is a row of its parent container.
    const depth = (el) => {
      let d = 0;
      for (let a = el; a; a = a.parentElement) d++;
      return d;
    };
    for (const owner of [...itemsBy.keys()].sort((a, b) => depth(b) - depth(a))) {
      if (!panelSet.has(owner) || cardEls.has(owner)) continue;
      const parent = ownerOf(owner.parentElement);
      if (!parent) continue;
      const cr = owner.getBoundingClientRect();
      const items = itemsBy.get(owner).filter((i) => i.left >= cr.left - 1 && i.right <= cr.right + 1);
      if (rowsOf(items).length > 1) continue;
      itemsBy.delete(owner);
      items.forEach((i) => add(parent, i));
    }

    const containers = [];
    const insets = [];
    for (const [owner, raw] of itemsBy) {
      const box = inner(owner);
      const width = box.right - box.left;
      const items = raw.filter((i) => i.left >= box.left - 1 && i.right <= box.right + 1 && i.top >= box.top - 1 && i.bottom <= box.bottom + 1);
      const rows = rowsOf(items);
      if (!rows.length) continue;

      const name = describe(owner);
      const mid = (box.left + box.right) / 2;
      const rowEdges = rows.map((row) => {
        const ordered = [...row.items].sort((a, b) => a.left - b.left);
        const L = ordered[0];
        const R = row.items.reduce((a, b) => (a.right >= b.right ? a : b));
        const next = L.kind === "icon" ? ordered.find((i) => i !== L && i.kind !== "icon" && i.left > L.right) : undefined;
        const lo = L.left;
        const hi = R.right;
        const shapes = row.items.filter((i) => i.kind !== "text");
        const texts = row.items.filter((i) => i.kind === "text");
        const centres = shapes.map((i) => (i.top + i.bottom) / 2);
        if (texts.length) centres.push((Math.min(...texts.map((i) => i.top)) + Math.max(...texts.map((i) => i.bottom))) / 2);
        const right = box.right - R.right;
        return {
          y: px((row.top + row.bottom) / 2 - box.top),
          left: L.left - box.left,
          leftKind: L.kind,
          lt: L.t,
          leftEl: L.el,
          iconLeft: L.kind === "icon" ? L.left - box.left : undefined,
          iconCentre: L.kind === "icon" ? (L.boxLeft + L.boxRight) / 2 - box.left : undefined,
          label: next ? (next.kind === "box" && next.label !== undefined ? next.label : next.left) - box.left : undefined,
          labelText: next?.t,
          labelEl: next?.el,
          boxLabel: L.kind === "box" && L.control && L.label !== undefined ? L.label - box.left : undefined,
          right,
          rt: R.t,
          rightEl: R.el,
          spanningField: R === L && R.field === true && right < width / 4,
          // Text is a trailing item only when it ends flush with its own box, as right-aligned text
          // or a shrink-wrapped label does. Left-aligned text that wraps ends where its words end.
          hasTrailingItem: R.kind !== "text" || (R !== L && near(R.right, Math.min(contentBox(blockOf(R.el)).right, box.right))),
          trailCentre: box.right - (R.left + R.right) / 2,
          trailingOnly: lo - box.left > width / 2 && right < width / 4,
          centred: hi - lo < width * 0.6 && Math.abs((lo + hi) / 2 - mid) <= TOLERANCE,
          centreSpread: centres.length > 1 ? Math.max(...centres) - Math.min(...centres) : 0,
          textBottom: texts.length ? Math.max(...texts.map((i) => i.bottom)) - box.top : undefined,
          textHeight: texts.length ? Math.max(...texts.map((i) => i.bottom)) - Math.min(...texts.map((i) => i.top)) : undefined,
          font: texts.sort((a, b) => a.left - b.left)[0]?.font,
          text: texts[0]?.t,
        };
      });

      const support = {};
      const dominant = (key, keep = () => true, name = key) => {
        const h = {};
        rowEdges.filter((e) => e[key] !== undefined && !e.centred && !e.trailingOnly && keep(e)).forEach((e) => (h[px(e[key])] = (h[px(e[key])] || 0) + 1));
        const top = Object.entries(h).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
        if (top) support[name] = top[1];
        return top ? +top[0] : undefined;
      };
      const reachesTrailing = (e) => e.right < width / 4 && !e.spanningField && e.hasTrailingItem;
      const label0 = dominant("label");
      const iconLeft0 = dominant("iconLeft");
      const isNested = (e) => e.iconLeft !== undefined && near(e.iconLeft, label0) && !near(e.iconLeft, iconLeft0);
      const lines = {
        text: dominant("left", (e) => e.leftKind !== "box" && !isNested(e), "text"),
        box: dominant("left", (e) => e.leftKind === "box", "box"),
        iconLeft: dominant("iconLeft", (e) => !isNested(e)),
        iconCentre: dominant("iconCentre", (e) => !isNested(e)),
        label: dominant("label", (e) => !isNested(e)),
        nestedLabel: dominant("label", isNested, "nestedLabel"),
        trailing: undefined,
        trailCentre: undefined,
      };
      {
        const h = {};
        const c = {};
        rowEdges.filter(reachesTrailing).forEach((e) => {
          h[px(e.right)] = (h[px(e.right)] || 0) + 1;
          c[px(e.trailCentre)] = (c[px(e.trailCentre)] || 0) + 1;
        });
        const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
        lines.trailing = top(h) ? +top(h)[0] : undefined;
        lines.trailCentre = top(c) ? +top(c)[0] : undefined;
        support.trailing = top(h)?.[1];
        support.trailCentre = top(c)?.[1];
      }
      // In a card, the style's pad is the text line once any row sits on it; the rows off it
      // are the misses, however many there are.
      const pad = tokensOf(ROLES.inset)[0];
      if (pad && cardEls.has(owner) && rowEdges.some((e) => e.leftKind !== "box" && near(e.left, pad.value))) {
        lines.text = pad.value;
        support.text = Infinity;
      }

      const misses = [];
      const miss = (e, edge, measured, line, item, el) => misses.push({ y: e.y, edge, px: px(measured), line, item, selector: el ? selectorOf(el) : undefined });
      // Text starts on the text line; only a box may start on the box line.
      const leadLines = [lines.text, lines.box, lines.iconLeft, lines.label, lines.nestedLabel];
      const textLines = leadLines.filter((l) => l !== lines.box || l === lines.text);
      for (const e of rowEdges) {
        if (e.centred) continue;
        const nested = isNested(e);
        // One cause, one finding: a shifted icon carries its label with it, so a row whose icon
        // misses reports the label only when it moved by a different amount.
        if (!e.trailingOnly) {
          const iconShift = e.iconLeft !== undefined && !nested && !near(e.iconCentre, lines.iconCentre) && !near(e.iconLeft, lines.iconLeft)
            ? e.iconCentre - lines.iconCentre
            : 0;
          if (iconShift) miss(e, "icon-column", e.iconCentre, lines.iconCentre, e.lt, e.leftEl);
          else if (e.iconLeft === undefined && !(e.leftKind === "box" ? leadLines : textLines).some((l) => near(e.left, l))) {
            const expected = (e.leftKind === "box" ? leadLines : textLines).filter((l) => l !== undefined).sort((a, b) => Math.abs(a - e.left) - Math.abs(b - e.left))[0];
            if (expected !== undefined) miss(e, "leading", e.left, expected, e.lt, e.leftEl);
          }
          const labelLine = nested ? lines.nestedLabel : lines.label;
          if (e.label !== undefined && labelLine !== undefined && !near(e.label - iconShift, labelLine)) miss(e, "label", e.label, labelLine, e.labelText, e.labelEl);
          // Only a box at the leading edge nests its label on the text line; a box further in is not leading.
          if (e.boxLabel !== undefined && lines.text !== undefined && e.left <= lines.text + TOLERANCE && !near(e.boxLabel, lines.text)) {
            miss(e, "box-label", e.boxLabel, lines.text, e.lt, e.leftEl);
          }
        }
        if (e.spanningField) {
          if (!near(e.right, e.left)) miss(e, "trailing", e.right, px(e.left), e.rt, e.rightEl);
        } else if (reachesTrailing(e) && !near(e.right, lines.trailing) && !near(e.trailCentre, lines.trailCentre)) {
          miss(e, "trailing", e.right, lines.trailing, e.rt, e.rightEl);
        }
        if (e.centreSpread > TOLERANCE) miss(e, "vertical-centre", e.centreSpread, 0, `${e.lt} … ${e.rt}`, e.leftEl);
      }
      // Rows missing the same vertical line by the same amount share one cause and make one finding.
      const byCause = new Map();
      for (const m of misses) {
        const key = m.edge === "vertical-centre" ? `${m.edge} ${m.y}` : `${m.edge} ${m.px} ${m.line}`;
        if (!byCause.has(key)) byCause.set(key, []);
        byCause.get(key).push(m);
      }
      for (const [, ms] of byCause) {
        const [m] = ms;
        const at = ms.length === 1 ? `row at y${m.y}` : `${ms.length} rows at y${ms.map((x) => x.y).join(", y")}`;
        findings.push({
          check: `row-${m.edge}`,
          where: name,
          message: `${name}, ${at}: ${m.edge} ${m.px}px, line ${m.line}px (${m.item})${m.selector ? ` at ${m.selector}` : ""}`,
          measured: { ...m, rows: ms.length, ys: ms.map((x) => x.y), selectors: ms.map((x) => x.selector).filter(Boolean).slice(0, 3) },
        });
      }
      // A stretched card shows a blank band where no content reaches (references/layout.md).
      let hole;
      if (cardEls.has(owner)) {
        const cs = style(owner);
        const top = box.top + parseFloat(cs.paddingTop);
        const bottom = box.bottom - parseFloat(cs.paddingBottom);
        const media = [...owner.querySelectorAll("svg, canvas, img, video, iframe, picture")]
          .filter((el) => !el.parentElement?.closest("svg") && shown(el))
          .map((el) => el.getBoundingClientRect());
        const nested = [...containerSet].filter((c) => c !== owner && owner.contains(c)).map((c) => c.getBoundingClientRect());
        const painted = [...owner.querySelectorAll("*")]
          .filter((el) => (opts.exclude && el.matches(opts.exclude)) || (shown(el) && !tiny(el) && !panelSet.has(el) && (surface(el) || style(el).backgroundImage !== "none")))
          // The box laying out painted marks, such as a bar chart's plot, is content too; a wrapper
          // around a badge or a button is not, or it would hide the hole below them.
          .flatMap((el) => (el.textContent.trim() || controlSet.has(el) || el.parentElement === owner ? [el] : [el, el.parentElement]))
          .map((el) => el.getBoundingClientRect());
        const spans = [...items, ...media, ...nested, ...painted].filter((r) => r.bottom > r.top).map((r) => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
        let reach = top;
        for (const [t, b] of [...spans, [bottom, bottom]]) {
          if (t - reach > HOLE && (!hole || t - reach > hole.px)) hole = { px: px(t - reach), y: px(reach - box.top) };
          reach = Math.max(reach, b);
        }
        if (hole) {
          findings.push({
            check: "hole",
            where: name,
            message: `${name}: a blank band of ${hole.px}px at y${hole.y} inside the card at ${selectorOf(owner)}`,
            measured: { ...hole, selector: selectorOf(owner) },
          });
        }
      }
      // A card's inset is where its content starts; a box on the box line sits outside it by design.
      const lead = [lines.text, lines.iconLeft].filter((v) => v !== undefined);
      if (cardEls.has(owner) && lead.length) insets.push({ px: Math.min(...lead), where: name, selector: selectorOf(owner) });
      containers.push({
        owner,
        rowEdges,
        name,
        selector: selectorOf(owner),
        x: px(box.left),
        y: px(box.top),
        w: px(width),
        box,
        lines,
        support,
        hole,
        misses,
        rows: opts.rows ? rowEdges.map(({ leftEl, labelEl, rightEl, ...e }) => ({ ...e, left: px(e.left), right: px(e.right) })) : undefined,
      });
    }
    const cardInsets = checkGroups(groupsOf(insets, ROLES.inset), ROLES.inset);

    // Cards built alike in one band put the same rows on the same lines, measured from each card's
    // top so a card that sits lower is its top edge, not its rows (references/layout.md). Rows are
    // compared in order while every card's row has the same font; a card whose rows all moved by
    // one amount is one finding.
    const bandRows = [];
    const containerOf = new Map(containers.map((c) => [c.owner, c]));
    for (const s of bands) {
      const cardsHere = s.items.filter((b) => !b.heading && containerOf.has(b.el));
      const single = cardsHere.filter((b) => !cardsHere.some((o) => o !== b && o.x0 < b.x1 - TOLERANCE && o.x1 > b.x0 + TOLERANCE));
      if (single.length < 2) continue;
      const textRows = single.map((b) => ({ b, rows: containerOf.get(b.el).rowEdges.filter((e) => e.textBottom !== undefined) }));
      const reported = new Map();
      for (let k = 0; ; k++) {
        if (!textRows.every((c) => c.rows[k]) || new Set(textRows.map((c) => c.rows[k].font)).size !== 1) break;
        const groups = groupsOf(textRows.map((c) => ({ px: c.rows[k].textBottom, where: c.rows[k].text, selector: c.b.selector })));
        const line = groups.sort((a, b) => b.count - a.count || a.px - b.px)[0];
        bandRows.push({ y: (Math.min(...single.map((b) => b.top)) + line.px), x0: Math.min(...single.map((b) => b.x0)), x1: Math.max(...single.map((b) => b.x1)), count: line.count });
        if (line.count < 2 && new Set(textRows.map((c) => c.rows.map((e) => e.font).join("|"))).size !== 1) continue;
        for (const c of textRows) {
          const delta = px(c.rows[k].textBottom - line.px);
          // A row further off than its own height is a different row: the cards differ in content above it.
          if (Math.abs(delta) <= TOLERANCE || Math.abs(delta) > c.rows[k].textHeight || reported.get(c.b) === delta) continue;
          reported.set(c.b, delta);
          findings.push({
            check: "band-row",
            where: c.b.name,
            message: `row ${k + 1} (${c.rows[k].text}) sits ${Math.abs(delta)}px ${delta > 0 ? "below" : "above"} the same row of ${line.examples.join(", ")} at ${c.b.selector}`,
            measured: { row: k + 1, text: c.rows[k].text, px: delta, selector: c.b.selector },
          });
        }
      }
    }

    if (opts.draw !== false) {
      const layer = document.createElement("div");
      layer.setAttribute(OVERLAY, "");
      Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: 2147483646, pointerEvents: "none" });
      const sx = window.scrollX;
      const sy = window.scrollY;
      // Shared lines are solid for block edges and dashed inside containers. A line only one row or
      // block holds is drawn dotted and faint: it is that item's own edge, kept for comparing by eye.
      const vline = (x, top, height, colour, kind, shared, solid = false) => {
        const d = document.createElement("div");
        d.dataset.geometryLine = kind;
        d.dataset.shared = String(shared);
        const pattern = !shared ? "dotted" : solid ? "solid" : "dashed";
        Object.assign(d.style, {
          position: "absolute", left: `${x + sx}px`, top: `${top + sy}px`, height: `${height}px`, width: "0",
          borderLeft: `1px ${pattern} ${colour}`, opacity: shared ? "1" : "0.45",
        });
        layer.appendChild(d);
      };
      const doc = document.documentElement.getBoundingClientRect();
      edges.left.forEach((g) => vline(canvas.left + g.px, doc.top, doc.height, "rgba(20,170,90,0.9)", "edge", g.count >= 2, true));
      edges.right.forEach((g) => vline(canvas.right - g.px, doc.top, doc.height, "rgba(20,170,90,0.9)", "edge", g.count >= 2, true));
      const hline = (y, left, width, colour, kind, shared) => {
        const d = document.createElement("div");
        d.dataset.geometryLine = kind;
        d.dataset.shared = String(shared);
        Object.assign(d.style, {
          position: "absolute", left: `${left + sx}px`, top: `${y + sy}px`, width: `${width}px`, height: "0",
          borderTop: `1px ${shared ? "solid" : "dotted"} ${colour}`, opacity: shared ? "1" : "0.45",
        });
        layer.appendChild(d);
      };
      bandEdges.forEach((e) => hline(e.y, canvas.left, canvas.right - canvas.left, "rgba(20,170,90,0.9)", `band-${e.side}`, e.count >= 2));
      bandRows.forEach((r) => hline(r.y, r.x0, r.x1 - r.x0, "rgba(255,60,60,0.8)", "band-row", r.count >= 2));
      for (const c of containers) {
        const { box, lines, support } = c;
        if (c.hole) {
          const d = document.createElement("div");
          d.textContent = "hole";
          Object.assign(d.style, {
            position: "absolute", left: `${box.left + sx}px`, top: `${box.top + c.hole.y + sy}px`, width: `${c.w}px`, height: `${c.hole.px}px`,
            outline: "1px dashed rgba(230,0,200,0.9)", font: "9px monospace", color: "rgb(230,0,200)", textAlign: "right",
          });
          layer.appendChild(d);
        }
        const h = box.bottom - box.top;
        const shared = (key) => support[key] >= 2;
        const at = (key, colour) => lines[key] !== undefined && vline(box.left + lines[key], box.top, h, colour, key, shared(key));
        const fromRight = (key, colour) => lines[key] !== undefined && vline(box.right - lines[key], box.top, h, colour, key, shared(key));
        at("text", "rgba(255,60,60,0.95)");
        at("label", "rgba(255,60,60,0.95)");
        if (lines.box !== lines.text) at("box", "rgba(255,60,60,0.5)");
        at("iconCentre", "rgba(255,60,60,0.35)");
        fromRight("trailing", "rgba(40,140,255,0.95)");
        fromRight("trailCentre", "rgba(255,170,30,0.7)");
        for (const m of c.misses) {
          const d = document.createElement("div");
          d.textContent = m.edge;
          Object.assign(d.style, {
            position: "absolute", left: `${box.left + sx}px`, top: `${box.top + m.y - 8 + sy}px`, width: `${c.w}px`, height: "16px",
            outline: "1px solid rgba(230,0,200,0.9)", font: "9px/16px monospace", color: "rgb(230,0,200)", textAlign: "right",
          });
          layer.appendChild(d);
        }
      }
      document.body.appendChild(layer);
      // An open modal dialog sits in the top layer, above any z-index; a popover shown after it sits
      // above it, and its absolute position still counts from the document's origin.
      if (layer.showPopover) {
        layer.popover = "manual";
        Object.assign(layer.style, { inset: "auto", left: "0", top: "0", margin: "0", padding: "0", border: "0", overflow: "visible", background: "transparent" });
        layer.showPopover();
      }
    }

    return {
      meta: {
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight },
        root: describe(rootEl),
        canvas: describe(canvasEl),
        blocks: cards.length,
        tolerance: TOLERANCE,
        driftMax: DRIFT_MAX,
        tokens,
        ignoredTokens: Object.keys(tokens).filter((name) => !known.includes(name)),
      },
      findings,
      edges,
      gutters,
      census: {
        fontSizes: sizes,
        fontWeights: weights,
        fontPairs: Object.entries(pairs).map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count),
        radii,
        controlHeights: heights,
        cardInsets,
        shadows: Object.entries(shadows).map(([value, count]) => ({ value, count })),
      },
      containers: containers.map(({ box, support, owner, rowEdges, ...c }) => c),
    };
  };
})();
