/*!
 * Still Growing reviews widget.
 * Dependency-free: assumes nothing about the host page's CSS/JS stack
 * (built for embedding in a Systeme.io custom-HTML block), so every style
 * is either inline or injected as its own scoped <style> tag, and every
 * class name is prefixed sg-review* to avoid colliding with host styles.
 *
 * Usage on the host page:
 *   <div id="stillgrowing-reviews"></div>
 *   <script src="https://stillgrowing.co/embeds/reviews-widget.js"></script>
 */
(function () {
  "use strict";

  var API_URL = "https://stillgrowing.co/api/reviews/public";
  var MOUNT_ID = "stillgrowing-reviews";
  var STYLE_ID = "stillgrowing-reviews-style";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".sg-reviews { display: flex; flex-direction: column; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
      ".sg-review-card { background: #ffffff; border: 1px solid #F7E1E9; border-radius: 16px; padding: 20px 24px; box-sizing: border-box; }",
      ".sg-review-stars { display: flex; gap: 2px; margin-bottom: 10px; }",
      ".sg-review-text { color: #3A3A3A; font-style: italic; line-height: 1.6; margin: 0 0 10px; }",
      ".sg-review-name { color: #9CA3AF; font-size: 13px; margin: 0; }",
      ".sg-reviews-empty { color: #9CA3AF; text-align: center; padding: 24px; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
    ].join("\n");
    document.head.appendChild(style);
  }

  function starSvg(filled) {
    var fill = filled ? "#E5B94E" : "none";
    var stroke = filled ? "#E5B94E" : "#E5E7EB";
    return (
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
      fill +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5" aria-hidden="true">' +
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
      "</svg>"
    );
  }

  function starsHtml(rating) {
    var html = '<div class="sg-review-stars" role="img" aria-label="' + rating + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) {
      html += starSvg(i <= rating);
    }
    html += "</div>";
    return html;
  }

  // Review text/name are user-submitted (moderated + admin-approved
  // before ever reaching this endpoint, but this script runs on a
  // third-party page, so it escapes before splicing into innerHTML
  // regardless -- defense in depth, not a trust judgment on the data).
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderReviews(mount, reviews) {
    if (!reviews.length) {
      mount.innerHTML = '<div class="sg-reviews-empty">No reviews yet.</div>';
      return;
    }
    var html = '<div class="sg-reviews">';
    for (var i = 0; i < reviews.length; i++) {
      var r = reviews[i];
      var name = escapeHtml(r.display_name_override || "A reader");
      var text = escapeHtml(r.text || "");
      html +=
        '<div class="sg-review-card">' +
        starsHtml(r.rating || 0) +
        '<p class="sg-review-text">&ldquo;' +
        text +
        "&rdquo;</p>" +
        '<p class="sg-review-name">' +
        name +
        "</p>" +
        "</div>";
    }
    html += "</div>";
    mount.innerHTML = html;
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    injectStyles();
    mount.innerHTML = '<div class="sg-reviews-empty">Loading reviews…</div>';

    fetch(API_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        renderReviews(mount, data.reviews || []);
      })
      .catch(function () {
        // Fail quietly on a third-party host page rather than leaving a
        // "Loading..." placeholder stuck or an error box on someone's
        // sales page.
        mount.innerHTML = "";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
