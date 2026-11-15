(function () {
  var cfg = window.BIZORA_CONFIG || {};

  function safeHttpUrl(candidate) {
    // Allow only absolute http/https URLs. Reject javascript:, data:, vbscript:
    // and anything that cannot be parsed as a URL, so config values can never
    // inject an XSS payload into href attributes.
    if (typeof candidate !== "string") return null;
    var trimmed = candidate.trim();
    if (!trimmed) return null;
    try {
      var u = new URL(trimmed, window.location.href);
      // Require an absolute URL with an explicit http/https scheme. Relative
      // references resolve against the page URL without a scheme check, so
      // reject them here too (config links must be absolute external URLs).
      if (!/^(https?):\/\//i.test(trimmed)) return null;
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch (e) {
      return null;
    }
  }

  function safeRelativeUrl(candidate, fallback) {
    // For same-origin config values like statsUrl, allow only relative paths
    // or http/https absolute URLs. Returns fallback on anything else.
    if (typeof candidate !== "string" || !candidate.trim()) return fallback;
    var trimmed = candidate.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      return (safeHttpUrl(trimmed) !== null) ? trimmed : fallback;
    }
    // No scheme: treat as a relative path, so javascript: etc. cannot slip in.
    return trimmed;
  }

  var appUrl = safeHttpUrl(cfg.appUrl);
  var legacyUrl = safeHttpUrl(cfg.legacyPrototypeUrl);

  document.querySelectorAll("[data-app-cta]").forEach(function (el) {
    if (appUrl) { el.href = appUrl; el.textContent = "Open Bizora"; }
    else { el.href = "#get"; el.textContent = "How to get Bizora"; }
  });

  var live = document.getElementById("liveOptions");
  if (live) {
    // Build links with DOM methods and set href via the property instead of
    // string concatenation into innerHTML, so config values cannot break out
    // of the attribute context.
    live.textContent = "";
    function makeLink(cls, href, text) {
      var a = document.createElement("a");
      a.className = cls;
      a.setAttribute("rel", "noopener");
      a.setAttribute("target", "_blank");
      a.href = href; // href is already validated to http/https above
      a.textContent = text;
      return a;
    }
    if (appUrl) {
      live.appendChild(makeLink("btn primary", appUrl, "Open Bizora web app"));
    } else {
      var disabled = document.createElement("span");
      disabled.className = "btn disabled";
      disabled.setAttribute("aria-disabled", "true");
      disabled.textContent = "Bizora 2.3 web app: not hosted yet";
      live.appendChild(disabled);
    }
    if (legacyUrl) {
      live.appendChild(document.createTextNode(" "));
      live.appendChild(makeLink("btn ghost", legacyUrl, "Open earlier BizLedger prototype"));
    }
  }

  var mount = document.getElementById("statsMount");
  if (mount && window.BizoraStats) {
    var statsEndpoint = safeRelativeUrl(cfg.statsUrl, "stats.json");
    var statsUnavailable = {
      status: "not_connected",
      note: "Stats file could not be loaded, so no counts are shown."
    };
    var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;
    fetch(statsEndpoint, { cache: "no-store", signal: controller ? controller.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("stats fetch failed"); return r.json(); })
      .catch(function () { return null; })
      .then(function (d) {
        if (timer) clearTimeout(timer);
        // Render the honest unavailable state with the reason instead of
        // leaving the stats panel blank when the load fails.
        var data = (d && typeof d === "object") ? d : statsUnavailable;
        mount.textContent = "";
        var tmp = document.createElement("div");
        tmp.innerHTML = window.BizoraStats.render(data);
        mount.appendChild(tmp);
      });
  }

  var btn = document.getElementById("navBtn"), nav = document.getElementById("nav");
  // Only wire up the toggle when both the button and the nav exist.
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "A") {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    // Escape closes the mobile menu and returns focus to the toggle button.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!nav.classList.contains("open")) return;
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    });
  }

  var y = document.getElementById("yr"); if (y) y.textContent = new Date().getFullYear();
})();
