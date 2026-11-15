/* Honest stats component. Numbers are shown only when stats.json has status "connected",
   a named source, a valid updatedAt, and every metric value is a finite non-negative number.
   Anything else renders "unavailable". */
(function (root) {
  var MAX_METRICS = 12;
  var MAX_LABEL_LENGTH = 80;
  // Stats older than ~1 year are treated as stale and not shown.
  var MAX_AGE_MS = 366 * 24 * 60 * 60 * 1000;
  function validate(data) {
    if (!data || typeof data !== "object") return { ok: false, reason: "Stats file missing or unreadable." };
    if (data.status !== "connected") return { ok: false, reason: data.note || "Download analytics are not connected." };
    if (!data.source || !data.updatedAt || isNaN(Date.parse(data.updatedAt))) return { ok: false, reason: "Stats file has no named source or valid timestamp, so it is not shown." };
    var updatedMs = Date.parse(data.updatedAt);
    var ageMs = Date.now() - updatedMs;
    if (ageMs > MAX_AGE_MS || ageMs < -5 * 60 * 1000) return { ok: false, reason: "Stats file timestamp is stale or in the future, so it is not shown." };
    if (!Array.isArray(data.metrics) || !data.metrics.length) return { ok: false, reason: "Stats file has no metrics." };
    if (data.metrics.length > MAX_METRICS) return { ok: false, reason: "Stats file has too many metrics, so none are shown." };
    var seen = {};
    for (const m of data.metrics) {
      if (!m || typeof m.label !== "string" || !m.label.trim()) return { ok: false, reason: "A metric in the stats file is invalid, so none are shown." };
      if (m.label.trim().length > MAX_LABEL_LENGTH) return { ok: false, reason: "A metric label in the stats file is too long, so none are shown." };
      var key = m.label.trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(seen, key)) return { ok: false, reason: "Stats file has duplicate metric labels, so none are shown." };
      seen[key] = true;
      if (typeof m.value !== "number" || !isFinite(m.value) || m.value < 0) return { ok: false, reason: "A metric in the stats file is invalid, so none are shown." };
      if (m.period != null && m.period !== "" && (typeof m.period !== "string" || m.period.length > MAX_LABEL_LENGTH)) return { ok: false, reason: "A metric period in the stats file is invalid, so none are shown." };
    }
    return { ok: true };
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function render(data) {
    var v = validate(data);
    if (!v.ok) {
      var labels = ["Web app installs", "Android downloads", "Active devices"];
      return '<div class="stat-grid">' + labels.map(function (l) { return '<div class="stat na"><span class="stat-val" aria-label="unavailable">N/A</span><span class="stat-label">' + l + '</span><span class="stat-sub">Counts unavailable</span></div>'; }).join("") +
        '</div><p class="stat-note"><strong>Download analytics are not connected.</strong> ' + esc(v.reason) + '</p>';
    }
    var when = new Date(data.updatedAt).toUTCString();
    return '<div class="stat-grid">' + data.metrics.map(function (m) { return '<div class="stat"><span class="stat-val">' + m.value.toLocaleString("en-US") + '</span><span class="stat-label">' + esc(m.label.trim()) + '</span><span class="stat-sub">' + esc(m.period || "") + '</span></div>'; }).join("") +
      '</div><p class="stat-note">Source: ' + esc(data.source) + '. Updated ' + esc(when) + '.</p>';
  }
  var api = { validate: validate, render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BizoraStats = api;
})(typeof window !== "undefined" ? window : this);
