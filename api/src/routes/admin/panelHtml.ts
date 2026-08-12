/**
 * The admin page: one file, no build step, no dependencies.
 *
 * Two rules hold the whole thing together:
 *   1. The token lives in `location.hash` and is never written into a URL the
 *      server sees — fragments are not sent, so it stays out of access logs.
 *   2. Every value that came from a user (email, id, order, detail) is placed
 *      with `textContent`, never `innerHTML`. There is no escaping to get
 *      wrong because no markup is ever built from data.
 */

export const PANEL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Legibly — admin</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f3f2f2;
    --surface: #fbfafa;
    --surface-2: #eae9e9;
    --text: #201f1d;
    --muted: #504d4d;
    --line: #d8d5d5;
    --accent: #b68235;
    --accent-text: #684607;
    --good: #1c6b3f;
    --good-bg: #e4f2ea;
    --bad: #96261f;
    --bad-bg: #fbe9e7;
    --warn-bg: #fdf3dd;
    --warn-text: #6b4a06;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #17161a;
      --surface: #201f24;
      --surface-2: #2a292f;
      --text: #f2f0ee;
      --muted: #b5b1ac;
      --line: #3a3840;
      --accent: #d8a85a;
      --accent-text: #e0b268;
      --good: #7fd0a3;
      --good-bg: #1c3328;
      --bad: #f2a49c;
      --bad-bg: #3a201e;
      --warn-bg: #38300f;
      --warn-text: #f0d79a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .wrap { max-width: 1240px; margin: 0 auto; padding: 28px 22px 80px; }
  header.top { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  h1 { font-size: 1.35rem; margin: 0; letter-spacing: -0.01em; }
  h1 .dot { color: var(--accent-text); }
  .sub { color: var(--muted); font-size: 0.85rem; }
  .spacer { flex: 1 1 auto; }
  nav.tabs { display: flex; gap: 4px; margin: 20px 0 22px; border-bottom: 1px solid var(--line); }
  nav.tabs button {
    background: none; border: none; border-bottom: 2px solid transparent; color: var(--muted);
    padding: 9px 14px; font-size: 0.92rem; cursor: pointer; border-radius: 6px 6px 0 0;
  }
  nav.tabs button:hover { color: var(--text); background: var(--surface); }
  nav.tabs button.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
  h2 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin: 26px 0 10px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .card .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .card .value { font-size: 1.65rem; font-weight: 650; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .card .meta { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
  .chart { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .chart .legend { display: flex; gap: 16px; font-size: 0.78rem; color: var(--muted); margin-bottom: 6px; }
  .chart .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  .toolbar .count { margin-left: auto; color: var(--muted); font-size: 0.82rem; }
  input[type="text"], input[type="number"], select {
    background: var(--surface); color: var(--text); border: 1px solid var(--line);
    border-radius: 7px; padding: 7px 10px; font-size: 0.88rem; font-family: inherit;
  }
  input:focus-visible, select:focus-visible, button:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  .btn {
    background: var(--surface); color: var(--text); border: 1px solid var(--line);
    border-radius: 7px; padding: 7px 12px; font-size: 0.85rem; cursor: pointer; font-family: inherit;
  }
  .btn:hover { background: var(--surface-2); }
  .btn.active { background: var(--text); color: var(--bg); border-color: var(--text); font-weight: 600; }
  /* Both inks are flipped against --bg rather than hard-coded white: in dark
     mode --accent-text and --bad are the light colours, so white on white. */
  .btn.primary { background: var(--accent-text); color: var(--bg); border-color: var(--accent-text); }
  .btn.danger { background: var(--bad); color: var(--bg); border-color: var(--bad); }
  .btn:disabled { opacity: 0.45; cursor: default; }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 9px 12px; font-size: 0.86rem; border-bottom: 1px solid var(--line); }
  th { background: var(--surface-2); color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; }
  tr:last-child td { border-bottom: none; }
  tr.clickable { cursor: pointer; }
  tr.clickable:hover td { background: var(--surface-2); }
  td.num, td.mono { font-variant-numeric: tabular-nums; }
  td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78rem; }
  td.muted, .muted { color: var(--muted); }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: var(--surface-2); color: var(--muted); }
  .pill.pro { background: var(--good-bg); color: var(--good); }
  .pill.ok { background: var(--good-bg); color: var(--good); }
  .pill.bad { background: var(--bad-bg); color: var(--bad); }
  .pager { display: flex; gap: 6px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
  .page-btn { border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 6px; min-width: 32px; height: 32px; padding: 0 9px; font-size: 0.83rem; cursor: pointer; }
  .page-btn.active { background: var(--text); color: var(--bg); border-color: var(--text); font-weight: 600; }
  .page-btn:disabled { opacity: 0.4; cursor: default; }
  .banner { border-radius: 9px; padding: 12px 15px; font-size: 0.88rem; margin-bottom: 16px; }
  .banner.warn { background: var(--warn-bg); color: var(--warn-text); border: 1px solid var(--accent); }
  .banner.error { background: var(--bad-bg); color: var(--bad); border: 1px solid var(--bad); }
  code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 0.85em; }
  .copy { border: none; background: none; color: var(--muted); cursor: pointer; font-size: 0.85rem; padding: 1px 4px; border-radius: 4px; }
  .copy:hover { background: var(--surface-2); color: var(--text); }
  .overlay { position: fixed; inset: 0; background: rgba(20, 19, 18, 0.45); display: flex; justify-content: flex-end; z-index: 40; }
  .drawer { background: var(--bg); width: min(760px, 100%); height: 100%; overflow-y: auto; box-shadow: -18px 0 44px rgba(0,0,0,0.22); }
  .drawer-head { position: sticky; top: 0; background: var(--surface); border-bottom: 1px solid var(--line); padding: 16px 20px; display: flex; align-items: flex-start; gap: 12px; }
  .drawer-head h3 { margin: 0 0 3px; font-size: 1.02rem; }
  .drawer-body { padding: 18px 20px 40px; }
  .facts { display: grid; grid-template-columns: 150px 1fr; gap: 5px 14px; font-size: 0.88rem; margin-bottom: 18px; }
  .facts .k { color: var(--muted); }
  .actions { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
  .actions .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
  .actions label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); display: block; margin-bottom: 4px; }
  .actions input[type="text"] { width: 100%; }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 26px; padding: 11px 18px; border-radius: 9px; font-size: 0.9rem; z-index: 60; color: var(--bg); background: var(--text); box-shadow: 0 10px 26px rgba(0,0,0,0.25); }
  .toast.ok { background: var(--good); color: var(--bg); }
  .toast.err { background: var(--bad); color: var(--bg); }
  .empty { text-align: center; color: var(--muted); padding: 20px; font-style: italic; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>Legibly <span class="dot">·</span> admin</h1>
    <span class="sub" id="generated">Loading…</span>
    <span class="spacer"></span>
    <button class="btn" id="reload">Reload</button>
  </header>
  <div id="banner"></div>
  <nav class="tabs" id="tabs"></nav>
  <main id="view"></main>
</div>
<div id="overlay-root"></div>
<div id="toast-root"></div>
<script>
(function () {
  "use strict";

  // ── plumbing ─────────────────────────────────────────────────────────────
  var TABS = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "payments", label: "Payments" },
    { key: "activity", label: "Activity" }
  ];

  var state = {
    tab: "overview",
    users: { page: 1, search: "", plan: "", paid: false, sort: "recent" },
    payments: { page: 1, status: "" },
    activity: { page: 1, kind: "" }
  };

  var PAGE_SIZE = 25;

  function token() {
    var match = location.hash.match(/token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function el(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.title) node.title = opts.title;
    if (opts.onClick) node.addEventListener("click", opts.onClick);
    return node;
  }

  function money(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
  }

  function date(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }

  function when(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  function ago(iso) {
    if (!iso) return "never";
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return days + "d ago";
  }

  function toast(message, kind) {
    var root = document.getElementById("toast-root");
    root.replaceChildren(el("div", { className: "toast " + (kind || ""), text: message }));
    setTimeout(function () { root.replaceChildren(); }, 3200);
  }

  function banner(message, kind) {
    var root = document.getElementById("banner");
    if (!message) { root.replaceChildren(); return; }
    var box = el("div", { className: "banner " + (kind || "warn") });
    box.appendChild(el("span", { text: message }));
    root.replaceChildren(box);
  }

  function api(path, params) {
    var url = "/api/admin/" + path;
    var query = [];
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === "" || value == null || value === false) return;
      query.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    if (query.length) url += "?" + query.join("&");
    return fetch(url, { headers: { Authorization: "Bearer " + token() } }).then(function (res) {
      if (res.status === 401) throw new Error("unauthorized");
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function post(path, body) {
    return fetch("/api/admin/" + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    });
  }

  function copyButton(value) {
    var button = el("button", { className: "copy", text: "⧉", title: "Copy" });
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (navigator.clipboard) navigator.clipboard.writeText(String(value));
      button.textContent = "✓";
      setTimeout(function () { button.textContent = "⧉"; }, 1000);
    });
    return button;
  }

  // ── shared building blocks ───────────────────────────────────────────────
  function card(label, value, meta) {
    var node = el("div", { className: "card" });
    node.appendChild(el("div", { className: "label", text: label }));
    node.appendChild(el("div", { className: "value", text: value }));
    if (meta) node.appendChild(el("div", { className: "meta", text: meta }));
    return node;
  }

  function section(title, cards) {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("h2", { text: title }));
    var grid = el("div", { className: "grid" });
    cards.forEach(function (c) { grid.appendChild(c); });
    frag.appendChild(grid);
    return frag;
  }

  function pill(text, kind) {
    return el("span", { className: "pill " + (kind || ""), text: text });
  }

  function table(headers, rows) {
    var node = el("table");
    var head = el("thead");
    var headRow = el("tr");
    headers.forEach(function (h) { headRow.appendChild(el("th", { text: h })); });
    head.appendChild(headRow);
    node.appendChild(head);

    var body = el("tbody");
    if (!rows.length) {
      var cell = el("td", { className: "empty", text: "Nothing here yet" });
      cell.colSpan = headers.length;
      var row = el("tr");
      row.appendChild(cell);
      body.appendChild(row);
    }
    rows.forEach(function (r) { body.appendChild(r); });
    node.appendChild(body);
    return node;
  }

  function pageWindow(page, totalPages) {
    var start = Math.max(1, Math.min(page - 2, totalPages - 4));
    var pages = [];
    for (var i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);
    return pages;
  }

  function pager(total, page, limit, onGo) {
    var totalPages = Math.max(1, Math.ceil(total / limit));
    if (totalPages <= 1) return null;
    var wrap = el("div", { className: "pager" });

    function nav(label, target, disabled, title) {
      var button = el("button", { className: "page-btn", text: label, title: title });
      if (disabled) button.disabled = true;
      else button.addEventListener("click", function () { onGo(target); });
      return button;
    }

    wrap.appendChild(nav("«", 1, page <= 1, "First"));
    wrap.appendChild(nav("‹", page - 1, page <= 1, "Previous"));
    pageWindow(page, totalPages).forEach(function (p) {
      var button = el("button", { className: "page-btn" + (p === page ? " active" : ""), text: String(p) });
      if (p !== page) button.addEventListener("click", function () { onGo(p); });
      wrap.appendChild(button);
    });
    wrap.appendChild(nav("›", page + 1, page >= totalPages, "Next"));
    wrap.appendChild(nav("»", totalPages, page >= totalPages, "Last"));
    wrap.appendChild(el("span", { className: "count", text: "Page " + page + " of " + totalPages }));
    return wrap;
  }

  function filterGroup(options, current, onPick) {
    var group = document.createDocumentFragment();
    options.forEach(function (option) {
      group.appendChild(el("button", {
        className: "btn" + (option.value === current ? " active" : ""),
        text: option.label,
        onClick: function () { onPick(option.value); }
      }));
    });
    return group;
  }

  // ── overview ─────────────────────────────────────────────────────────────
  // Two series, one 30-day frame: how many people showed up, and how many are
  // new. Drawn as an SVG by hand — the panel ships no chart library.
  function sparkline(daily) {
    var width = 720;
    var height = 130;
    var padding = 6;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", "100%");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Daily active and new users over the last 30 days");

    var max = 1;
    daily.forEach(function (d) { max = Math.max(max, d.activeUsers, d.newUsers); });
    var step = daily.length > 1 ? (width - padding * 2) / (daily.length - 1) : 0;

    function pathFor(pick, color, fill) {
      var points = daily.map(function (d, i) {
        var x = padding + i * step;
        var y = height - padding - (pick(d) / max) * (height - padding * 2);
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", points.join(" "));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linejoin", "round");
      if (fill) line.setAttribute("stroke-dasharray", "4 3");
      svg.appendChild(line);
    }

    pathFor(function (d) { return d.activeUsers; }, "#b68235", false);
    pathFor(function (d) { return d.newUsers; }, "#2e8b5f", true);
    return svg;
  }

  function renderOverview(view) {
    api("stats").then(function (payload) {
      var s = payload.stats;
      document.getElementById("generated").textContent = "As of " + when(s.generatedAt);
      banner("");

      var frag = document.createDocumentFragment();

      frag.appendChild(section("People", [
        card("Total users", s.users.total, s.users.lapsed + " lapsed Pro"),
        card("Pro (live)", s.users.pro, s.conversion.lifetimeRatePercent + "% of all users have paid"),
        card("Free", s.users.free),
        card("New · 7d", s.users.new7d),
        card("New · 30d", s.users.new30d),
        card("Active · 7d", s.users.active7d, "opened the plugin"),
        card("Active · 30d", s.users.active30d, "MAU")
      ]));

      var chart = el("div", { className: "chart" });
      var legend = el("div", { className: "legend" });
      var activeKey = el("span");
      var activeSwatch = el("span", { className: "swatch" });
      activeSwatch.style.background = "#b68235";
      activeKey.appendChild(activeSwatch);
      activeKey.appendChild(el("span", { text: "Daily active" }));
      var newKey = el("span");
      var newSwatch = el("span", { className: "swatch" });
      newSwatch.style.background = "#2e8b5f";
      newKey.appendChild(newSwatch);
      newKey.appendChild(el("span", { text: "New users" }));
      legend.appendChild(activeKey);
      legend.appendChild(newKey);
      legend.appendChild(el("span", { text: "last 30 days · UTC" }));
      chart.appendChild(legend);
      chart.appendChild(sparkline(s.daily || []));
      frag.appendChild(el("h2", { text: "Trend" }));
      frag.appendChild(chart);

      frag.appendChild(section("Revenue", [
        card("Gross · 30d", money(s.revenue.gross30dCents), s.revenue.approved30d + " approved charges"),
        card("Refunded · 30d", money(s.revenue.refunded30dCents), s.revenue.reversed30d + " reversed"),
        card("Net · 30d", money(s.revenue.net30dCents)),
        card("Gross · 7d", money(s.revenue.gross7dCents), s.revenue.approved7d + " approved"),
        card("Lifetime gross", money(s.revenue.lifetimeGrossCents))
      ]));

      frag.appendChild(section("Payments", [
        card("Declined · 30d", s.payments.declined30d, "declined + expired"),
        card("Success rate · 30d", s.payments.successRate30dPercent + "%"),
        card("Monthly · 30d", s.payments.monthly30d),
        card("Yearly · 30d", s.payments.yearly30d)
      ]));

      frag.appendChild(section("Conversion", [
        card("Paying now", s.conversion.payingNow),
        card("Paid ever", s.conversion.paidEver, "admin grants excluded"),
        card("Signed up 30d → paid", s.conversion.rate30dPercent + "%"),
        card("Lifetime", s.conversion.lifetimeRatePercent + "%")
      ]));

      frag.appendChild(section("AI Judge", [
        card("Calls · 30d", s.judge.calls30d, s.judge.users30d + " users"),
        card("Failed · 30d", s.judge.failed30d, "refused or unavailable"),
        card("Free trials used", s.judge.trialsUsedTotal, "lifetime, all users"),
        card("Pro calls this month", s.judge.proCallsThisMonth)
      ]));

      var note = el("p", { className: "sub", text: "Live from Postgres. Cross-check revenue against the Flitt settlement report before booking it." });
      note.style.marginTop = "26px";
      frag.appendChild(note);

      view.replaceChildren(frag);
    }).catch(showError);
  }

  // ── users ────────────────────────────────────────────────────────────────
  function renderUsers(view) {
    var q = state.users;
    api("users", { search: q.search, plan: q.plan, paid: q.paid, sort: q.sort, page: q.page, limit: PAGE_SIZE })
      .then(function (payload) {
        var frag = document.createDocumentFragment();
        var toolbar = el("div", { className: "toolbar" });

        var search = el("input");
        search.type = "text";
        search.placeholder = "email or exact Figma user id";
        search.value = q.search;
        search.addEventListener("keydown", function (event) {
          if (event.key !== "Enter") return;
          q.search = search.value.trim();
          q.page = 1;
          render();
        });
        toolbar.appendChild(search);

        toolbar.appendChild(filterGroup(
          [{ value: "", label: "All" }, { value: "pro", label: "Pro" }, { value: "free", label: "Free" }],
          q.plan,
          function (value) { q.plan = value; q.page = 1; render(); }
        ));

        toolbar.appendChild(el("button", {
          className: "btn" + (q.paid ? " active" : ""),
          text: "Has paid",
          onClick: function () { q.paid = !q.paid; q.page = 1; render(); }
        }));

        var sort = el("select");
        [
          { value: "recent", label: "Newest" },
          { value: "seen", label: "Last seen" },
          { value: "ends", label: "Licence ends" },
          { value: "judge", label: "Most judge use" }
        ].forEach(function (option) {
          var node = el("option", { text: option.label });
          node.value = option.value;
          if (option.value === q.sort) node.selected = true;
          sort.appendChild(node);
        });
        sort.addEventListener("change", function () { q.sort = sort.value; q.page = 1; render(); });
        toolbar.appendChild(sort);

        toolbar.appendChild(el("button", {
          className: "btn",
          text: "Export CSV",
          onClick: function () { downloadCsv(q); }
        }));

        toolbar.appendChild(el("span", { className: "count", text: payload.total + " user(s)" }));
        frag.appendChild(toolbar);

        var rows = payload.rows.map(function (user, index) {
          var tr = el("tr", { className: "clickable", onClick: function () { openUser(user.figmaUserId); } });
          tr.appendChild(el("td", { className: "muted num", text: (payload.page - 1) * payload.limit + index + 1 }));
          var idCell = el("td", { className: "mono" });
          idCell.appendChild(el("span", { text: user.figmaUserId }));
          idCell.appendChild(copyButton(user.figmaUserId));
          tr.appendChild(idCell);
          tr.appendChild(user.email ? el("td", { text: user.email }) : el("td", { className: "muted", text: "—" }));
          var planCell = el("td");
          planCell.appendChild(pill(user.plan, user.plan === "pro" ? "pro" : ""));
          if (user.paid) planCell.appendChild(el("span", { className: "muted", text: " paid" }));
          tr.appendChild(planCell);
          tr.appendChild(el("td", { className: "num", text: user.plan === "pro" ? user.daysLeft + "d" : "—" }));
          tr.appendChild(el("td", { className: "num", text: user.judgeUsed + " / " + user.judgeMonthUsed }));
          tr.appendChild(el("td", { className: "muted", text: ago(user.lastSeenAt) }));
          tr.appendChild(el("td", { className: "muted", text: date(user.createdAt) }));
          return tr;
        });

        frag.appendChild(table(["#", "Figma id", "Email", "Plan", "Left", "Judge (free/mo)", "Last seen", "Joined"], rows));
        var pages = pager(payload.total, payload.page, payload.limit, function (page) { q.page = page; render(); });
        if (pages) frag.appendChild(pages);
        view.replaceChildren(frag);
      })
      .catch(showError);
  }

  // The CSV needs the token in a header, so it cannot be a plain link — fetch
  // it, then hand the browser a blob.
  function downloadCsv(q) {
    var params = ["search=" + encodeURIComponent(q.search), "plan=" + encodeURIComponent(q.plan), "sort=" + encodeURIComponent(q.sort)];
    if (q.paid) params.push("paid=true");
    fetch("/api/admin/users.csv?" + params.join("&"), { headers: { Authorization: "Bearer " + token() } })
      .then(function (res) { return res.ok ? res.blob() : Promise.reject(new Error("HTTP " + res.status)); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = el("a", {});
        link.href = url;
        link.download = "legibly-users.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast("CSV downloaded", "ok");
      })
      .catch(function (error) { toast("Export failed: " + error.message, "err"); });
  }

  // ── payments ─────────────────────────────────────────────────────────────
  function renderPayments(view) {
    var q = state.payments;
    api("payments", { status: q.status, page: q.page, limit: PAGE_SIZE }).then(function (payload) {
      var frag = document.createDocumentFragment();
      var toolbar = el("div", { className: "toolbar" });
      toolbar.appendChild(filterGroup(
        [
          { value: "", label: "All" },
          { value: "approved", label: "Approved" },
          { value: "declined", label: "Declined" },
          { value: "expired", label: "Expired" },
          { value: "reversed", label: "Reversed" }
        ],
        q.status,
        function (value) { q.status = value; q.page = 1; render(); }
      ));
      toolbar.appendChild(el("span", { className: "count", text: payload.total + " event(s)" }));
      frag.appendChild(toolbar);

      var rows = payload.rows.map(function (payment) {
        var tr = el("tr", { className: "clickable", onClick: function () { openUser(payment.figmaUserId); } });
        tr.appendChild(el("td", { className: "muted", text: when(payment.at) }));
        tr.appendChild(payment.email
          ? el("td", { text: payment.email })
          : el("td", { className: "mono muted", text: payment.figmaUserId }));
        var orderCell = el("td", { className: "mono" });
        orderCell.appendChild(el("span", { text: payment.orderId }));
        orderCell.appendChild(copyButton(payment.orderId));
        tr.appendChild(orderCell);
        var statusCell = el("td");
        statusCell.appendChild(pill(payment.status, payment.status === "approved" ? "ok" : payment.status === "reversed" ? "bad" : ""));
        tr.appendChild(statusCell);
        tr.appendChild(el("td", { className: "num", text: payment.amountCents == null ? "—" : money(payment.amountCents) }));
        return tr;
      });

      frag.appendChild(table(["When", "User", "Order", "Status", "Amount"], rows));
      var pages = pager(payload.total, payload.page, payload.limit, function (page) { q.page = page; render(); });
      if (pages) frag.appendChild(pages);
      view.replaceChildren(frag);
    }).catch(showError);
  }

  // ── activity ─────────────────────────────────────────────────────────────
  var KINDS = [
    { value: "", label: "All" },
    { value: "checkin", label: "Check-ins" },
    { value: "checkout_created", label: "Checkout started" },
    { value: "checkout_paid", label: "Paid" },
    { value: "checkout_failed", label: "Payment failed" },
    { value: "checkout_refunded", label: "Refunded" },
    { value: "judge_call", label: "Judge" }
  ];

  function renderActivity(view) {
    var q = state.activity;
    api("activity", { kind: q.kind, page: q.page, limit: PAGE_SIZE }).then(function (payload) {
      var frag = document.createDocumentFragment();
      var toolbar = el("div", { className: "toolbar" });
      toolbar.appendChild(filterGroup(KINDS, q.kind, function (value) { q.kind = value; q.page = 1; render(); }));
      toolbar.appendChild(el("span", { className: "count", text: payload.total + " event(s)" }));
      frag.appendChild(toolbar);

      var note = el("p", { className: "sub", text: "Metadata only — a kind, a result and a short label. Nothing from anyone's design is recorded. Check-ins collapse to one row per user per day." });
      note.style.margin = "0 0 12px";
      frag.appendChild(note);

      frag.appendChild(table(["When", "User", "Event", "Result", "Detail"], payload.rows.map(function (event) {
        var tr = el("tr", { className: "clickable", onClick: function () { openUser(event.figmaUserId); } });
        tr.appendChild(el("td", { className: "muted", text: when(event.at) }));
        tr.appendChild(event.email
          ? el("td", { text: event.email })
          : el("td", { className: "mono muted", text: event.figmaUserId }));
        tr.appendChild(el("td", { text: event.kind }));
        var resultCell = el("td");
        resultCell.appendChild(pill(event.ok ? "ok" : "failed", event.ok ? "ok" : "bad"));
        tr.appendChild(resultCell);
        tr.appendChild(el("td", { className: "muted", text: event.detail || "—" }));
        return tr;
      })));

      var pages = pager(payload.total, payload.page, payload.limit, function (page) { q.page = page; render(); });
      if (pages) frag.appendChild(pages);
      view.replaceChildren(frag);
    }).catch(showError);
  }

  // ── user drawer ──────────────────────────────────────────────────────────
  function closeDrawer() {
    document.getElementById("overlay-root").replaceChildren();
  }

  function openUser(figmaUserId) {
    var root = document.getElementById("overlay-root");
    var overlay = el("div", { className: "overlay" });
    overlay.addEventListener("click", function (event) { if (event.target === overlay) closeDrawer(); });
    var drawer = el("div", { className: "drawer" });
    drawer.appendChild(el("div", { className: "drawer-body muted", text: "Loading…" }));
    overlay.appendChild(drawer);
    root.replaceChildren(overlay);

    api("user", { figmaUserId: figmaUserId }).then(function (payload) {
      drawer.replaceChildren(drawerHead(payload.user), drawerBody(payload, figmaUserId));
    }).catch(function (error) {
      drawer.replaceChildren(el("div", { className: "drawer-body banner error", text: "Failed to load: " + error.message }));
    });
  }

  function drawerHead(user) {
    var head = el("div", { className: "drawer-head" });
    var titles = el("div");
    var name = el("h3", { text: user.email || "(no email on file)" });
    titles.appendChild(name);
    var idLine = el("div", { className: "sub" });
    idLine.appendChild(el("span", { text: user.figmaUserId }));
    idLine.appendChild(copyButton(user.figmaUserId));
    titles.appendChild(idLine);
    head.appendChild(titles);
    head.appendChild(el("span", { className: "spacer" }));
    head.appendChild(el("button", { className: "btn", text: "✕", title: "Close", onClick: closeDrawer }));
    return head;
  }

  function facts(user) {
    var grid = el("div", { className: "facts" });
    [
      ["Plan", user.plan + (user.paid ? " · has paid" : " · never paid")],
      ["Status", user.status],
      ["Licence ends", user.cycleEndsAt ? date(user.cycleEndsAt) + " (" + user.daysLeft + "d left)" : "—"],
      ["Last bought", user.lastDuration || "—"],
      ["Judge", user.judgeUsed + " free trials · " + user.judgeMonthUsed + " this month"],
      ["Last seen", user.lastSeenAt ? when(user.lastSeenAt) : "never"],
      ["Joined", when(user.createdAt)]
    ].forEach(function (pair) {
      grid.appendChild(el("div", { className: "k", text: pair[0] }));
      grid.appendChild(el("div", { text: pair[1] }));
    });
    return grid;
  }

  function actionBlock(figmaUserId) {
    var block = el("div", { className: "actions" });
    block.appendChild(el("h2", { text: "Actions" }));

    var reasonWrap = el("div");
    reasonWrap.appendChild(el("label", { text: "Reason (recorded in the audit trail — required)" }));
    var reason = el("input");
    reason.type = "text";
    reason.placeholder = "e.g. support comp after failed checkout #4821";
    reasonWrap.appendChild(reason);
    block.appendChild(reasonWrap);

    var days = el("input");
    days.type = "number";
    days.min = "1";
    days.max = "3650";
    days.placeholder = "days";
    days.style.width = "90px";

    function run(body, label) {
      if (reason.value.trim().length < 3) { toast("A reason is required", "err"); return; }
      body.figmaUserId = figmaUserId;
      body.reason = reason.value.trim();
      post("license", body).then(function (result) {
        if (!result.ok || !result.data.success) {
          toast("Failed: " + (result.data && result.data.error ? result.data.error : "unknown"), "err");
          return;
        }
        toast(label + " applied", "ok");
        openUser(figmaUserId);
      });
    }

    var row = el("div", { className: "row" });
    row.appendChild(el("button", {
      className: "btn primary", text: "Grant monthly",
      onClick: function () { run({ action: "grant", duration: "monthly" }, "Monthly grant"); }
    }));
    row.appendChild(el("button", {
      className: "btn primary", text: "Grant yearly",
      onClick: function () { run({ action: "grant", duration: "yearly" }, "Yearly grant"); }
    }));
    row.appendChild(days);
    row.appendChild(el("button", {
      className: "btn", text: "Grant days",
      onClick: function () { run({ action: "grant", days: Number(days.value) }, "Grant"); }
    }));
    row.appendChild(el("span", { className: "spacer" }));
    row.appendChild(el("button", {
      className: "btn danger", text: "Revoke now",
      onClick: function () {
        if (!confirm("End this licence immediately?")) return;
        run({ action: "revoke" }, "Revoke");
      }
    }));
    block.appendChild(row);
    return block;
  }

  function listTable(title, headers, rows) {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("h2", { text: title }));
    frag.appendChild(table(headers, rows));
    return frag;
  }

  function drawerBody(payload, figmaUserId) {
    var body = el("div", { className: "drawer-body" });
    body.appendChild(facts(payload.user));
    body.appendChild(actionBlock(figmaUserId));

    body.appendChild(listTable("Audit trail", ["When", "Action", "By", "Reason", "Detail"], payload.audit.map(function (entry) {
      var tr = el("tr");
      tr.appendChild(el("td", { className: "muted", text: when(entry.at) }));
      tr.appendChild(el("td", { text: entry.action }));
      tr.appendChild(el("td", { className: "muted", text: entry.actor }));
      tr.appendChild(el("td", { text: entry.reason || "—" }));
      tr.appendChild(el("td", { className: "muted", text: entry.detail || "—" }));
      return tr;
    })));

    body.appendChild(listTable("Payments", ["When", "Order", "Status", "Amount"], payload.payments.map(function (payment) {
      var tr = el("tr");
      tr.appendChild(el("td", { className: "muted", text: when(payment.at) }));
      tr.appendChild(el("td", { className: "mono", text: payment.orderId }));
      var statusCell = el("td");
      statusCell.appendChild(pill(payment.status, payment.status === "approved" ? "ok" : payment.status === "reversed" ? "bad" : ""));
      tr.appendChild(statusCell);
      tr.appendChild(el("td", { className: "num", text: payment.amountCents == null ? "—" : money(payment.amountCents) }));
      return tr;
    })));

    body.appendChild(listTable("Activity", ["When", "Event", "Result", "Detail"], payload.events.map(function (event) {
      var tr = el("tr");
      tr.appendChild(el("td", { className: "muted", text: when(event.at) }));
      tr.appendChild(el("td", { text: event.kind }));
      var resultCell = el("td");
      resultCell.appendChild(pill(event.ok ? "ok" : "failed", event.ok ? "ok" : "bad"));
      tr.appendChild(resultCell);
      tr.appendChild(el("td", { className: "muted", text: event.detail || "—" }));
      return tr;
    })));

    return body;
  }

  // ── shell ────────────────────────────────────────────────────────────────
  function showError(error) {
    if (error.message === "unauthorized") {
      banner("Unauthorized. Open this page with #token=<ADMIN_TOKEN> at the end of the URL.", "error");
      document.getElementById("view").replaceChildren();
      return;
    }
    banner("Request failed: " + error.message, "error");
  }

  function renderTabs() {
    var nav = document.getElementById("tabs");
    nav.replaceChildren();
    TABS.forEach(function (tab) {
      nav.appendChild(el("button", {
        className: state.tab === tab.key ? "active" : "",
        text: tab.label,
        onClick: function () { state.tab = tab.key; render(); }
      }));
    });
  }

  function render() {
    renderTabs();
    var view = document.getElementById("view");
    view.replaceChildren(el("p", { className: "muted", text: "Loading…" }));
    if (!token()) {
      banner("No admin token. Append #token=<ADMIN_TOKEN> to the URL.", "warn");
      view.replaceChildren();
      return;
    }
    if (state.tab === "overview") renderOverview(view);
    else if (state.tab === "users") renderUsers(view);
    else if (state.tab === "payments") renderPayments(view);
    else renderActivity(view);
  }

  document.getElementById("reload").addEventListener("click", render);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeDrawer(); });
  window.addEventListener("hashchange", render);
  render();
})();
</script>
</body>
</html>`;
