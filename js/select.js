/* =====================================================================
   MABS TECHNOLOGIES — DESIGNED DROPDOWNS
   ---------------------------------------------------------------------
   A browser draws a <select>'s open list itself, so it can't be styled.
   This turns every <select> on the page (including ones added later)
   into a styled button + list, while the real <select> stays in the page,
   hidden: forms submit it, scripts read and set it, and its change events
   fire as before. Works with a mouse, touch and the keyboard (arrows,
   Home/End, Enter/Space, Escape, Tab and typing the first letters).
   Standalone: used by the shop and the admin panel. Styles: css/select.css.
   ===================================================================== */
(function () {
  "use strict";
  if (window.MabsSelect) return;
  var seq = 0, open = null;
  var CHEVRON = '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var TICK = '<svg class="dd-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function labelOf(sel) {
    if (sel.getAttribute("aria-label")) return sel.getAttribute("aria-label");
    var l = sel.id && document.querySelector('label[for="' + sel.id + '"]');
    if (!l) l = sel.closest("label");
    if (!l) return "";
    // the label's own words, without the select's options inside it
    var text = "";
    l.childNodes.forEach(function (n) { if (n !== sel && n.nodeType === 3) text += n.textContent; else if (n.nodeType === 1 && !n.contains(sel) && n.tagName !== "SELECT") text += n.textContent; });
    return text.replace(/\s+/g, " ").trim();
  }

  function enhance(sel) {
    if (sel.dataset.dd || sel.multiple || sel.size > 1) return;
    sel.dataset.dd = "1";
    var id = "dd" + (++seq);
    var wrap = document.createElement("span");
    wrap.className = "dd";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("dd-native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");

    var name = labelOf(sel); // read before the label is pointed at the new button
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd-btn";
    btn.id = id + "-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id + "-list");
    btn.innerHTML = '<span class="dd-value"></span>' + CHEVRON;
    var list = document.createElement("ul");
    list.className = "dd-menu";
    list.id = id + "-list";
    list.setAttribute("role", "listbox");
    list.tabIndex = -1;
    list.hidden = true;
    wrap.appendChild(btn);
    wrap.appendChild(list);
    // a <label for> on the select should focus the new button instead
    if (sel.id) document.querySelectorAll('label[for="' + sel.id + '"]').forEach(function (l) { l.htmlFor = btn.id; });

    var active = -1, typed = "", typedAt = 0;

    function sync() {
      var o = sel.options[sel.selectedIndex];
      var placeholder = !o || o.value === "";
      btn.querySelector(".dd-value").textContent = o ? o.text : "";
      btn.classList.toggle("is-placeholder", placeholder && sel.required);
      btn.setAttribute("aria-label", (name ? name + ": " : "") + (o ? o.text : ""));
      btn.disabled = sel.disabled;
      if (sel.getAttribute("aria-invalid") === "true") btn.setAttribute("aria-invalid", "true"); else btn.removeAttribute("aria-invalid");
      wrap.classList.toggle("is-disabled", sel.disabled);
    }

    function build() {
      list.innerHTML = "";
      Array.prototype.forEach.call(sel.options, function (o, i) {
        var li = document.createElement("li");
        li.id = id + "-o" + i;
        li.setAttribute("role", "option");
        li.dataset.index = i;
        li.setAttribute("aria-selected", i === sel.selectedIndex ? "true" : "false");
        if (o.disabled) { li.setAttribute("aria-disabled", "true"); li.className = "is-disabled"; }
        li.innerHTML = "<span></span>" + TICK;
        li.firstChild.textContent = o.text;
        list.appendChild(li);
      });
    }

    function highlight(i) {
      var items = list.children;
      if (!items.length) return;
      i = Math.max(0, Math.min(i, items.length - 1));
      if (active >= 0 && items[active]) items[active].classList.remove("is-active");
      active = i;
      items[i].classList.add("is-active");
      list.setAttribute("aria-activedescendant", items[i].id);
      var top = items[i].offsetTop, bottom = top + items[i].offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top - 4;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 4;
    }

    function step(from, dir) {
      var i = from;
      do { i += dir; } while (sel.options[i] && sel.options[i].disabled);
      return sel.options[i] ? i : from;
    }

    function choose(i) {
      if (!sel.options[i] || sel.options[i].disabled) return;
      var changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      close(true);
      if (changed) {
        sel.dispatchEvent(new Event("input", { bubbles: true }));
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function openMenu() {
      if (sel.disabled) return;
      if (open && open !== api) open.close(false);
      build();
      list.hidden = false;
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      // open upwards when there isn't room below
      wrap.classList.remove("is-up");
      var r = btn.getBoundingClientRect();
      if (window.innerHeight - r.bottom < Math.min(list.scrollHeight, 280) + 12 && r.top > window.innerHeight - r.bottom) wrap.classList.add("is-up");
      list.focus({ preventScroll: true });
      active = -1;
      typed = "";
      highlight(Math.max(0, sel.selectedIndex));
      open = api;
    }

    function close(focusBtn) {
      if (list.hidden) return;
      list.hidden = true;
      wrap.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      list.removeAttribute("aria-activedescendant");
      if (open === api) open = null;
      if (focusBtn) btn.focus({ preventScroll: true });
    }

    btn.addEventListener("click", function () { if (list.hidden) openMenu(); else close(true); });
    btn.addEventListener("keydown", function (e) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].indexOf(e.key) !== -1) { e.preventDefault(); openMenu(); }
      else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openMenu(); typeAhead(e.key); }
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("li");
      if (li && !li.classList.contains("is-disabled") && +li.dataset.index !== active) highlight(+li.dataset.index);
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest("li");
      if (li) choose(+li.dataset.index);
    });
    list.addEventListener("keydown", function (e) {
      var n = sel.options.length;
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(step(active, 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(step(active, -1)); }
      else if (e.key === "Home") { e.preventDefault(); highlight(step(-1, 1)); }
      else if (e.key === "End") { e.preventDefault(); highlight(step(n, -1)); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") { choose(active); }
      else if (e.key.length === 1 && /\S/.test(e.key)) typeAhead(e.key);
    });

    // jump to the option starting with what's typed (also works on the closed button)
    function typeAhead(key) {
      var n = sel.options.length, now = Date.now();
      typed = (now - typedAt > 700 ? "" : typed) + key.toLowerCase();
      typedAt = now;
      for (var k = 0; k < n; k++) {
        var j = (Math.max(active, 0) + (typed.length === 1 ? 1 : 0) + k) % n;
        if (!sel.options[j].disabled && sel.options[j].text.toLowerCase().indexOf(typed) === 0) { highlight(j); break; }
      }
    }
    list.addEventListener("focusout", function (e) { if (!wrap.contains(e.relatedTarget)) close(false); });
    // scripts that focus the hidden select (e.g. form checks) land on the button
    sel.addEventListener("focus", function () { btn.focus(); });
    sel.addEventListener("change", sync);

    // keep the button right when a script sets the value directly
    var proto = HTMLSelectElement.prototype;
    ["value", "selectedIndex"].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(proto, prop);
      Object.defineProperty(sel, prop, {
        configurable: true,
        get: function () { return d.get.call(this); },
        set: function (v) { d.set.call(this, v); sync(); }
      });
    });
    new MutationObserver(sync).observe(sel, { attributes: true, attributeFilter: ["disabled", "aria-invalid", "required"], childList: true, subtree: true });

    var api = { close: close };
    sync();
  }

  function enhanceAll(root) {
    (root.querySelectorAll ? root : document).querySelectorAll("select").forEach(enhance);
  }

  document.addEventListener("mousedown", function (e) {
    if (open && !e.target.closest(".dd.is-open")) open.close(false);
  });
  window.addEventListener("resize", function () { if (open) open.close(false); });

  function start() {
    enhanceAll(document);
    // pages draw parts of themselves later (cart, reviews): enhance those selects too
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === "SELECT") enhance(n); else if (n.querySelector) enhanceAll(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.MabsSelect = { enhance: enhance };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
