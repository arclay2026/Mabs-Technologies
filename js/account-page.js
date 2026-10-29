/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT (account.html)
   Signed out: Login and Register (tabs), "Forgot your password?", and the
   pages the emailed links open (?verify=… confirms the email address,
   ?reset=… chooses a new password). ?next=checkout.html returns there
   after logging in. Signed in: personal details, newsletter and password.
   The work is done by api/account.php through M.account (js/api.js).
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS, esc = M.esc, I = M.icon;
  var root = document.getElementById("account-root");
  var params = new URLSearchParams(location.search);
  var MIN = 8;
  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/></svg>';
  var MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/></svg>';

  // after logging in, only pages of this shop are returned to
  function nextPage() {
    var n = params.get("next") || "";
    return /^[a-z-]+\.html([?#][\w=&%.,+#-]*)?$/i.test(n) ? n : "";
  }

  var ERRORS = {
    BAD_LOGIN: "That email address and password don’t match. Check them and try again, or reset your password.",
    EMAIL_TAKEN: 'There’s already an account for this email address. <a href="?tab=signin" data-tab="signin">Log in</a> or <a href="?tab=forgot" data-tab="forgot">reset your password</a>.',
    WEAK_PASSWORD: "Use at least " + MIN + " characters for your password, and not your email address.",
    BAD_EMAIL: "Please enter a valid email address.",
    BAD_PHONE: "Please check your cellphone number, e.g. 082 123 4567.",
    MISSING_NAME: "Please enter your first name and surname.",
    BAD_LINK: "This link has expired or has already been used.",
    BAD_PASSWORD: "Your current password isn’t right.",
    TOO_MANY: "Too many attempts. Please wait 15 minutes and try again.",
    SIGNED_OUT: "You’ve been logged out. Please log in again."
  };
  function errorText(e) { return ERRORS[e && e.code] || "Something went wrong. Please check your connection and try again."; }

  /* ---------- form pieces ---------- */
  // opts.icon: a line icon inside the field (the login and register forms)
  function field(id, label, input, opts) {
    opts = opts || {};
    var eye = opts.password ? '<button type="button" class="pw-show" data-show="' + id + '" aria-label="Show password" aria-pressed="false">' + EYE + "</button>" : "";
    return '<div class="field' + (opts.wide ? " field-wide" : "") + '">' +
      '<label for="' + id + '">' + label + (opts.optional ? ' <span class="opt">(optional)</span>' : "") + "</label>" +
      (opts.password || opts.icon ? '<div class="pw-wrap' + (opts.icon ? " has-icon" : "") + '">' + (opts.icon ? '<span class="in-icon" aria-hidden="true">' + opts.icon + "</span>" : "") + input + eye + "</div>" : input) +
      (opts.hint ? '<p class="hint" id="' + id + '-hint">' + opts.hint + "</p>" : "") +
      '<p class="err" id="' + id + '-err"></p></div>';
  }
  function alertBox(kind) { return '<div class="form-alert' + (kind ? " is-" + kind : "") + '" role="alert" tabindex="-1" hidden></div>'; }
  function showAlert(form, html, kind) {
    var a = form.querySelector(".form-alert");
    a.className = "form-alert" + (kind ? " is-" + kind : "");
    a.innerHTML = html;
    a.hidden = false;
    a.focus();
  }
  // the browser's own checks, with the shop's wording, before anything is sent
  var MESSAGES = {
    email: "Please enter a valid email address.",
    password: "Use at least " + MIN + " characters.",
    first: "Please enter your first name.", last: "Please enter your surname.",
    phone: "Please check your cellphone number, e.g. 082 123 4567.",
    confirm: "The passwords don’t match.", current: "Please enter your current password."
  };
  function check(el) {
    var key = el.getAttribute("data-msg"), err = document.getElementById(el.id + "-err");
    var ok = el.checkValidity() && !(key === "confirm" && el.value !== el.form.elements.password.value);
    el.setAttribute("aria-invalid", !ok);
    if (err) {
      err.textContent = ok ? "" : MESSAGES[key] || "Please fill this in.";
      el.setAttribute("aria-describedby", [ok ? "" : err.id, document.getElementById(el.id + "-hint") ? el.id + "-hint" : ""].join(" ").trim());
    }
    return ok;
  }
  function valid(form) {
    var bad = null;
    form.querySelectorAll("[data-msg]").forEach(function (el) { if (!check(el) && !bad) bad = el; });
    if (bad) bad.focus();
    return !bad;
  }
  // "Logging in…" while a request runs; afterwards the label comes back with its icon
  function busy(btn, on, text) {
    if (on) { btn._label = btn.innerHTML; btn.textContent = text; btn.disabled = true; }
    else { btn.innerHTML = btn._label; btn.disabled = false; }
  }
  root.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid") === "true") check(e.target); });
  root.addEventListener("blur", function (e) { if (e.target.matches && e.target.matches("[data-msg]") && e.target.value) check(e.target); }, true);
  root.addEventListener("click", function (e) {
    var show = e.target.closest("[data-show]");
    if (show) {
      var input = document.getElementById(show.getAttribute("data-show")), on = input.type === "password";
      input.type = on ? "text" : "password";
      show.setAttribute("aria-pressed", on);
      show.setAttribute("aria-label", on ? "Hide password" : "Show password");
      input.focus();
      return;
    }
    var tab = e.target.closest("[data-tab]");
    if (tab) { e.preventDefault(); showAuth(tab.getAttribute("data-tab"), true); }
  });

  /* ---------- signed out: login, register, forgot password ---------- */
  var PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';
  // brand panel beside the form: why an account is worth it
  var SIDE = '<aside class="auth-side" aria-label="Why create an account">' +
    '<img class="auth-side-logo" src="assets/logo-light.svg" alt="" height="28">' +
    '<div class="auth-side-copy"><p class="auth-eyebrow">Your ' + esc(M.store.name.split(" ")[0]) + " account</p>" +
      '<p class="auth-headline">Shop faster and follow every order.</p><ul class="auth-points">' +
      "<li>" + I.cart + "<span><b>Faster checkout</b>Your name, email and number are filled in for you.</span></li>" +
      "<li>" + I.box + "<span><b>All your orders in one place</b>See what you ordered and where it is, on any device.</span></li>" +
      "<li>" + MAIL + "<span><b>Deals in your inbox</b>Hear about sales and new arrivals first, if you’d like to.</span></li>" +
    "</ul></div>" +
    '<p class="auth-side-foot">' + LOCK + "Your password is stored encrypted. We never share your details.</p></aside>";
  var SECURE = '<p class="auth-secure">' + I.shield + "<span>Protected login. After 5 wrong passwords, logging in pauses for 15 minutes.</span></p>";

  function authShell(tab, body) {
    var tabs = tab === "forgot" ? "" :
      '<div class="auth-tabs" role="tablist">' +
        '<a role="tab" href="?tab=signin" data-tab="signin" aria-selected="' + (tab === "signin") + '">Login</a>' +
        '<a role="tab" href="?tab=register" data-tab="register" aria-selected="' + (tab === "register") + '">Register</a></div>';
    return '<div class="auth">' + SIDE +
      '<section class="auth-card" aria-labelledby="auth-title"><div class="auth-form-box">' + tabs + body + "</div></section></div>";
  }

  function signinHtml() {
    return '<span class="auth-badge" aria-hidden="true">' + LOCK + "</span>" +
      '<h1 id="auth-title">Welcome back</h1><p class="auth-sub">Log in to your ' + esc(M.store.name) + " account.</p>" +
      (params.get("out") ? '<p class="form-alert is-ok" role="status">You’ve been logged out.</p>' : "") +
      '<form id="signin-form" novalidate>' + alertBox() +
        field("si-email", "Email address", '<input id="si-email" name="email" type="email" autocomplete="username" required data-msg="email" maxlength="190" placeholder="you@example.com">', { wide: true, icon: MAIL }) +
        field("si-pass", "Password", '<input id="si-pass" name="password" type="password" autocomplete="current-password" required data-msg="current" maxlength="72" placeholder="Your password">', { wide: true, password: true, icon: LOCK }) +
        '<div class="auth-row"><label class="check"><input type="checkbox" name="remember" checked> Keep me logged in</label>' +
          '<a href="?tab=forgot" data-tab="forgot">Forgot your password?</a></div>' +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Login' + I.arrow + "</button>" +
      "</form>" + SECURE +
      '<p class="auth-switch">New to ' + esc(M.store.name) + '? <a href="?tab=register" data-tab="register">Create an account</a></p>';
  }

  function registerHtml() {
    return '<h1 id="auth-title">Create your account</h1><p class="auth-sub">It takes less than a minute.</p>' +
      '<form id="register-form" novalidate>' + alertBox() +
        '<div class="field-grid">' +
          field("rg-first", "First name", '<input id="rg-first" name="firstName" autocomplete="given-name" required data-msg="first" maxlength="60">', { icon: I.user }) +
          field("rg-last", "Surname", '<input id="rg-last" name="lastName" autocomplete="family-name" required data-msg="last" maxlength="60">', { icon: I.user }) +
          field("rg-email", "Email address", '<input id="rg-email" name="email" type="email" autocomplete="email" required data-msg="email" maxlength="190" placeholder="you@example.com">', { wide: true, icon: MAIL }) +
          field("rg-phone", "Cellphone number", '<input id="rg-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="\\+?[0-9][0-9 ]{8,}" data-msg="phone" maxlength="30" placeholder="e.g. 082 123 4567">', { wide: true, optional: true, icon: PHONE }) +
          field("rg-pass", "Password", '<input id="rg-pass" name="password" type="password" autocomplete="new-password" required minlength="' + MIN + '" maxlength="72" data-msg="password">', { wide: true, password: true, icon: LOCK, hint: "At least " + MIN + " characters. A short sentence is easy to remember and hard to guess." }) +
        "</div>" +
        '<label class="check auth-check"><input type="checkbox" name="newsletter"> Email me about deals and new arrivals</label>' +
        '<label class="check auth-check"><input type="checkbox" name="remember" checked> Keep me logged in</label>' +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Create account' + I.arrow + "</button>" +
      "</form>" +
      '<p class="auth-switch">Already have an account? <a href="?tab=signin" data-tab="signin">Log in</a></p>';
  }

  function forgotHtml() {
    return '<a class="auth-back" href="?tab=signin" data-tab="signin">' + I.chevron + "Back to login</a>" +
      '<h1 id="auth-title">Reset your password</h1>' +
      '<p class="auth-lead">Enter the email address of your account and we’ll email you a link to choose a new password.</p>' +
      '<form id="forgot-form" novalidate>' + alertBox() +
        field("fg-email", "Email address", '<input id="fg-email" name="email" type="email" autocomplete="email" required data-msg="email" maxlength="190" placeholder="you@example.com">', { wide: true, icon: MAIL }) +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Email me a link</button>' +
      "</form>";
  }

  function showAuth(tab, push) {
    tab = ["signin", "register", "forgot"].indexOf(tab) !== -1 ? tab : "signin";
    if (push) {
      params.set("tab", tab); params.delete("out");
      history.replaceState(null, "", "account.html?" + params.toString());
    }
    root.innerHTML = authShell(tab, tab === "register" ? registerHtml() : tab === "forgot" ? forgotHtml() : signinHtml());
    document.title = (tab === "register" ? "Register" : tab === "forgot" ? "Reset your password" : "Login") + " — " + M.store.name;
    var first = root.querySelector("input");
    if (push && first) first.focus();
    var f = root.querySelector("form");
    if (f) f.addEventListener("submit", SUBMIT[f.id]);
  }

  function done(r) {
    var note = r && r.emailed ? "Welcome, " + esc(M.customer.firstName) + "! We’ve emailed you a link to confirm your email address." :
      r && r.welcome ? "Welcome, " + esc(M.customer.firstName) + "! Your account is ready." : "";
    var next = nextPage();
    if (next) { // back where they were; the welcome shows there (js/app.js)
      if (note) try { sessionStorage.setItem("mabs.flash", note); } catch (e) { /* storage unavailable */ }
      location.href = next;
      return;
    }
    history.replaceState(null, "", "account.html");
    showDashboard(note ? { kind: "ok", html: note } : null);
  }

  var SUBMIT = {
    "signin-form": function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector("[type=submit]");
      if (!valid(f)) return;
      busy(btn, true, "Logging in…");
      M.account.signin({ email: f.elements.email.value.trim(), password: f.elements.password.value, remember: f.elements.remember.checked })
        .then(done, function (err) { busy(btn, false); showAlert(f, errorText(err), "error"); });
    },
    "register-form": function (e) {
      e.preventDefault();
      var f = e.target, el = f.elements, btn = f.querySelector("[type=submit]");
      if (!valid(f)) return;
      busy(btn, true, "Creating your account…");
      M.account.signup({
        firstName: el.firstName.value.trim(), lastName: el.lastName.value.trim(), email: el.email.value.trim(),
        phone: el.phone.value.trim(), password: el.password.value, newsletter: el.newsletter.checked, remember: el.remember.checked
      }).then(function (r) { r.welcome = true; done(r); }, function (err) { busy(btn, false); showAlert(f, errorText(err), "error"); });
    },
    "forgot-form": function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector("[type=submit]"), email = f.elements.email.value.trim();
      if (!valid(f)) return;
      busy(btn, true, "Sending…");
      M.account.forgot(email).then(function (r) {
        busy(btn, false);
        if (!r.mail) { showAlert(f, "We can’t send emails just yet. Please contact us and we’ll help you get back into your account.", "error"); return; }
        f.outerHTML = '<div class="auth-sent">' + M.emptyIcon(MAIL) +
          "<p>If there’s an account for <b>" + esc(email) + "</b>, we’ve emailed it a link to reset the password. The link works for an hour.</p>" +
          '<p class="fine">Nothing arrived? Check your spam folder, or <a href="?tab=forgot" data-tab="forgot">try again</a>.</p></div>';
      }, function (err) { busy(btn, false); showAlert(f, errorText(err), "error"); });
    }
  };

  /* ---------- from the emailed links ---------- */
  function showReset(token) {
    root.innerHTML = authShell("forgot",
      '<h1 id="auth-title">Choose a new password</h1>' +
      '<form id="reset-form" novalidate>' + alertBox() +
        field("rs-pass", "New password", '<input id="rs-pass" name="password" type="password" autocomplete="new-password" required minlength="' + MIN + '" maxlength="72" data-msg="password">', { wide: true, password: true, hint: "At least " + MIN + " characters." }) +
        field("rs-confirm", "Type it again", '<input id="rs-confirm" name="confirm" type="password" autocomplete="new-password" required data-msg="confirm" maxlength="72">', { wide: true }) +
        '<button type="submit" class="btn btn-primary btn-block btn-lg">Save new password</button>' +
      "</form>");
    document.title = "Choose a new password — " + M.store.name;
    root.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector("[type=submit]");
      if (!valid(f)) return;
      busy(btn, true, "Saving…");
      M.account.reset(token, f.elements.password.value).then(function () {
        history.replaceState(null, "", "account.html");
        showDashboard({ kind: "ok", html: "Your password has been changed and you’re logged in." });
      }, function (err) {
        busy(btn, false);
        showAlert(f, errorText(err) + (err && err.code === "BAD_LINK" ? ' <a href="?tab=forgot" data-tab="forgot">Get a new link</a>.' : ""), "error");
      });
    });
  }

  function showVerify(token) {
    root.innerHTML = '<div class="auth-status" role="status">' + M.emptyIcon(MAIL) + "<p>Confirming your email address…</p></div>";
    M.account.verify(token).then(function () {
      history.replaceState(null, "", "account.html");
      if (M.customer) { M.customer.verified = true; showDashboard({ kind: "ok", html: "Thanks, your email address is confirmed. Orders you placed with it before are now in your account." }); return; }
      root.innerHTML = '<div class="auth-status">' + M.emptyIcon(I.check) + "<h1>Email address confirmed</h1>" +
        "<p>Thanks! Log in to see your account and orders.</p>" +
        '<a class="btn btn-primary btn-lg" href="account.html?tab=signin">Log in</a></div>';
    }, function (err) {
      root.innerHTML = '<div class="auth-status">' + M.emptyIcon(MAIL) + "<h1>This link doesn’t work any more</h1>" +
        "<p>" + esc(errorText(err)) + (M.customer ? " Ask for a new one below." : " Log in and we’ll send you a new one.") + "</p>" +
        '<a class="btn btn-primary btn-lg" href="account.html">' + (M.customer ? "Go to my account" : "Log in") + "</a></div>";
    });
  }

  /* ---------- signed in ---------- */
  function showDashboard(note) {
    var c = M.customer;
    document.title = "My Account — " + M.store.name;
    root.innerHTML =
      '<nav class="crumbs account-crumbs" aria-label="Breadcrumb"><ol><li><a href="account.html">My Account</a></li><li aria-current="page">Personal details</li></ol></nav>' +
      '<div class="account-layout"><aside class="account-nav" id="account-nav" aria-label="My Account"></aside>' +
      '<section class="account-main" aria-labelledby="acct-title">' +
        '<div class="account-head"><h1 id="acct-title">Hi, ' + esc(c.firstName) + "</h1></div>" +
        '<div class="account-notes" aria-live="polite">' +
          (note ? '<p class="form-alert is-' + note.kind + '">' + note.html + "</p>" : "") +
          (c.verified ? "" : '<div class="verify-note">' + MAIL + "<p><b>Please confirm your email address.</b> We sent a link to " + esc(c.email) + ". " +
            "Confirming it adds any orders you placed with this address before you registered.</p>" +
            '<button type="button" class="btn btn-ghost btn-sm" id="resend">Send the link again</button></div>') +
        "</div>" +
        '<section class="account-panel acct-section" id="details" aria-labelledby="details-title">' +
          '<h2 id="details-title">Personal details</h2>' +
          '<form id="details-form" novalidate>' + alertBox() +
            '<div class="field-grid">' +
              field("pd-first", "First name", '<input id="pd-first" name="firstName" autocomplete="given-name" required data-msg="first" maxlength="60" value="' + esc(c.firstName) + '">') +
              field("pd-last", "Surname", '<input id="pd-last" name="lastName" autocomplete="family-name" required data-msg="last" maxlength="60" value="' + esc(c.lastName) + '">') +
              '<div class="field field-wide"><label for="pd-email">Email address</label>' +
                '<div class="readonly-field"><input id="pd-email" value="' + esc(c.email) + '" readonly aria-describedby="pd-email-note">' +
                (c.verified ? '<span class="pill-ok">' + I.check + "Confirmed</span>" : '<span class="pill-wait">Not confirmed yet</span>') + "</div>" +
                '<p class="hint" id="pd-email-note">To change your email address, please contact us.</p></div>' +
              field("pd-phone", "Cellphone number", '<input id="pd-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="\\+?[0-9][0-9 ]{8,}" data-msg="phone" maxlength="30" value="' + esc(c.phone) + '">', { wide: true, optional: true }) +
            "</div>" +
            '<label class="check auth-check" id="newsletter"><input type="checkbox" name="newsletter"' + (c.newsletter ? " checked" : "") + "> Email me about deals and new arrivals</label>" +
            '<button type="submit" class="btn btn-primary">Save details</button>' +
          "</form></section>" +
        '<section class="account-panel acct-section" id="security" aria-labelledby="security-title">' +
          '<h2 id="security-title">Security</h2>' +
          '<p class="acct-lead">Changing your password logs you out on your other devices.</p>' +
          '<form id="password-form" novalidate>' + alertBox() +
            '<div class="field-grid">' +
              field("pw-current", "Current password", '<input id="pw-current" name="current" type="password" autocomplete="current-password" required data-msg="current" maxlength="72">', { wide: true, password: true }) +
              field("pw-new", "New password", '<input id="pw-new" name="password" type="password" autocomplete="new-password" required minlength="' + MIN + '" maxlength="72" data-msg="password">', { password: true, hint: "At least " + MIN + " characters." }) +
              field("pw-confirm", "Type it again", '<input id="pw-confirm" name="confirm" type="password" autocomplete="new-password" required data-msg="confirm" maxlength="72">') +
            "</div>" +
            '<button type="submit" class="btn btn-dark">Change password</button>' +
          "</form></section>" +
      "</section></div>";
    M.accountNav(location.hash === "#security" ? "security" : location.hash === "#newsletter" ? "newsletter" : "details");
    if (location.hash) { var target = document.querySelector(location.hash); if (target) target.scrollIntoView(); }

    var resend = document.getElementById("resend");
    if (resend) resend.addEventListener("click", function () {
      resend.disabled = true;
      M.account.resend().then(function (r) {
        resend.outerHTML = '<span class="fine">' + (r.emailed ? "Sent. Check your inbox (and spam folder)." : r.verified ? "Your email address is already confirmed." : "We couldn’t send it just now. Please try again later.") + "</span>";
      }, function (err) { resend.disabled = false; M.account.signedOut(err); M.toast(errorText(err)); });
    });

    document.getElementById("details-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, el = f.elements, btn = f.querySelector("[type=submit]");
      if (!valid(f)) return;
      busy(btn, true, "Saving…");
      M.account.update({ firstName: el.firstName.value.trim(), lastName: el.lastName.value.trim(), phone: el.phone.value.trim(), newsletter: el.newsletter.checked })
        .then(function () {
          busy(btn, false);
          showAlert(f, "Your details are saved.", "ok");
          document.getElementById("acct-title").textContent = "Hi, " + M.customer.firstName;
        }, function (err) { busy(btn, false); M.account.signedOut(err); showAlert(f, errorText(err), "error"); });
    });

    document.getElementById("password-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector("[type=submit]");
      if (!valid(f)) return;
      busy(btn, true, "Saving…");
      M.account.password(f.elements.current.value, f.elements.password.value).then(function () {
        busy(btn, false);
        f.reset();
        showAlert(f, "Password changed. You’re still logged in here; your other devices have been logged out.", "ok");
      }, function (err) { busy(btn, false); M.account.signedOut(err); showAlert(f, errorText(err), "error"); });
    });
  }

  /* ---------- which page ---------- */
  document.addEventListener("account:change", function () {
    // logged out somewhere else (another tab, or the session ended)
    if (!M.customer && document.getElementById("details-form")) showAuth("signin");
  });

  root.removeAttribute("aria-busy");
  if (!M.account.available()) {
    root.innerHTML = '<div class="auth-status">' + M.emptyIcon(I.user) + "<h1>Accounts are coming soon</h1>" +
      "<p>You can still shop and check out as a guest. Your orders are saved on this device.</p>" +
      '<div class="cart-empty-actions"><a class="btn btn-primary btn-lg" href="index.html#shop">Start shopping</a><a class="btn btn-ghost btn-lg" href="orders.html">Your orders</a></div></div>';
  } else if (params.get("verify")) {
    showVerify(params.get("verify"));
  } else if (params.get("reset")) {
    showReset(params.get("reset"));
  } else if (M.customer) {
    if (nextPage()) location.replace(nextPage()); else showDashboard();
  } else {
    showAuth(params.get("tab"));
  }
})();
