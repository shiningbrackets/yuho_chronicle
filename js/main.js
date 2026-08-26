(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme ---------- */

  var themeToggle = document.querySelector("[data-theme-toggle]");
  var storedTheme = null;

  try {
    storedTheme = localStorage.getItem("theme");
  } catch (error) {
    storedTheme = null;
  }

  if (storedTheme === "dark" || storedTheme === "light") {
    root.setAttribute("data-theme", storedTheme);
  }

  function effectiveTheme() {
    if (root.getAttribute("data-theme")) {
      return root.getAttribute("data-theme");
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyThemeIcon() {
    if (themeToggle) {
      themeToggle.classList.toggle("is-dark", effectiveTheme() === "dark");
    }
  }

  applyThemeIcon();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      applyThemeIcon();
      try {
        localStorage.setItem("theme", next);
      } catch (error) {}
    });
  }

  var systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  if (systemTheme.addEventListener) {
    systemTheme.addEventListener("change", applyThemeIcon);
  } else if (systemTheme.addListener) {
    systemTheme.addListener(applyThemeIcon);
  }

  /* ---------- Editorial typography (token splitter) ---------
     Splits [data-char-reveal], [data-word-reveal], [data-line-reveal]
     into spans so CSS can stagger-reveal them. Leaves a hidden copy
     for screen readers so the text remains one continuous string. */

  function srWrap(text) {
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.style.position = "absolute";
    sr.style.width = "1px";
    sr.style.height = "1px";
    sr.style.padding = "0";
    sr.style.margin = "-1px";
    sr.style.overflow = "hidden";
    sr.style.clip = "rect(0,0,0,0)";
    sr.style.whiteSpace = "nowrap";
    sr.style.border = "0";
    sr.textContent = text;
    return sr;
  }

  function makeToken(text) {
    var span = document.createElement("span");
    span.setAttribute("data-token", "");
    var inner = document.createElement("span");
    inner.textContent = text;
    span.appendChild(inner);
    return span;
  }

  /* For line reveal we don't rely on hard <br>; we measure line
     boxes after layout, then group words per rendered line.
     This reflows when fonts load, so we re-split once more when
     fonts are ready. */

  function splitLines(node) {
    var text = node.textContent.replace(/\s+/g, " ").trim();
    var words = text.split(" ");

    if (!words.length || (words.length === 1 && !words[0])) {
      return [];
    }

    node.textContent = "";
    node.appendChild(srWrap(text));

    // Temporarily append calibrated measure node to detect line boxes.
    var cs = getComputedStyle(node);
    var measure = document.createElement("span");
    measure.style.position = "absolute";
    measure.style.visibility = "hidden";
    measure.style.top = "0";
    measure.style.left = "-9999px";
    measure.style.width = cs.width;
    measure.style.fontSize = cs.fontSize;
    measure.style.fontFamily = cs.fontFamily;
    measure.style.fontWeight = cs.fontWeight;
    measure.style.fontStyle = cs.fontStyle;
    measure.style.letterSpacing = cs.letterSpacing;
    measure.style.lineHeight = cs.lineHeight;
    measure.style.wordBreak = cs.wordBreak;
    measure.style.whiteSpace =
      cs.whiteSpace === "nowrap" ? "nowrap" : "normal";
    measure.style.padding = "0";
    measure.style.margin = "0";

    words.forEach(function (w, i) {
      if (i > 0) measure.appendChild(document.createTextNode(" "));
      var wx = document.createElement("span");
      wx.textContent = w;
      wx.style.display = "inline-block";
      wx.setAttribute("data-mi", String(i));
      measure.appendChild(wx);
    });

    node.appendChild(measure);
    var groups = {};
    var measureNodes = measure.querySelectorAll("[data-mi]");
    var prevTop = null;
    var lineIdx = -1;
    Array.prototype.forEach.call(measureNodes, function (mx) {
      var top = mx.offsetTop;
      if (prevTop === null || Math.abs(top - prevTop) > 2) {
        lineIdx++;
        prevTop = top;
      }
      if (!groups[lineIdx]) groups[lineIdx] = [];
      groups[lineIdx].push(parseInt(mx.getAttribute("data-mi"), 10));
    });
    node.removeChild(measure);

    if (lineIdx === -1) return [];

    var sorted = Object.keys(groups)
      .sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); })
      .map(function (k) { return groups[k]; });

    var frag = document.createDocumentFragment();
    sorted.forEach(function (idxs, lineI) {
      var lineBox = document.createElement("span");
      lineBox.setAttribute("data-tline", "");
      lineBox.style.display = "block";
      lineBox.style.overflow = "hidden";
      idxs.forEach(function (wi, i) {
        if (i > 0) lineBox.appendChild(document.createTextNode(" "));
        var tok = makeToken(words[wi]);
        tok.style.setProperty("--ti", String(lineI * 3 + i));
        lineBox.appendChild(tok);
      });
      frag.appendChild(lineBox);
      if (lineI < sorted.length - 1) {
        frag.appendChild(document.createTextNode(" "));
      }
    });
    node.appendChild(frag);
    return Array.prototype.slice.call(node.querySelectorAll("[data-token]"));
  }

  var splitTasks = [];

  document.querySelectorAll("[data-char-reveal]").forEach(function (el) {
    var inner = el.cloneNode(true);
    el.textContent = "";
    el.appendChild(srWrap(inner.textContent));
    var chars = inner.textContent;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === " ") {
        frag.appendChild(document.createTextNode(" "));
        continue;
      }
      var tok = document.createElement("span");
      tok.setAttribute("data-token", "");
      tok.style.setProperty("--ti", i);
      tok.style.display = "inline-block";
      var inw = document.createElement("span");
      inw.textContent = ch;
      tok.appendChild(inw);
      frag.appendChild(tok);
    }
    var wrapper = document.createElement("span");
    wrapper.style.display = "inline";
    wrapper.appendChild(frag);
    el.appendChild(wrapper);
  });

  document.querySelectorAll("[data-word-reveal]").forEach(function (el) {
    var text = el.textContent.trim();
    var words = text.split(/\s+/);
    el.textContent = "";
    el.appendChild(srWrap(text));
    var w = document.createElement("span");
    w.style.display = "inline";
    words.forEach(function (word, i) {
      if (i > 0) w.appendChild(document.createTextNode(" "));
      var tok = document.createElement("span");
      tok.setAttribute("data-token", "");
      tok.style.setProperty("--ti", i);
      tok.style.display = "inline-block";
      var inw = document.createElement("span");
      inw.textContent = word;
      tok.appendChild(inw);
      w.appendChild(tok);
    });
    el.appendChild(w);
  });

  document.querySelectorAll("[data-line-reveal]").forEach(function (el) {
    splitTasks.push(el);
  });

  function runLineSplit() {
    splitTasks.forEach(function (el) {
      // reset if already split
      el.querySelectorAll("[data-token], [data-tline], .sr-only").forEach(function (n) {
        n.parentNode && n.parentNode.removeChild(n);
      });
      if (el.getAttribute("data-original-text")) {
        el.textContent = el.getAttribute("data-original-text");
      } else {
        el.setAttribute("data-original-text", el.textContent);
      }
      splitLines(el);
    });
  }

  // Run line split once after fonts are ready (so line boxes are correct).
  if (splitTasks.length) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(runLineSplit, runLineSplit);
    } else {
      runLineSplit();
    }
    setTimeout(runLineSplit, 600);
    var resizeRan = false;
    var resizeTm = null;
    window.addEventListener("resize", function () {
      if (resizeTm) clearTimeout(resizeTm);
      resizeTm = setTimeout(function () {
        if (!resizeRan || splitTasks.length) runLineSplit();
      }, 250);
    });
  }

  /* Reveal tokens when their host element becomes visible,
     or when the host is in the hero (revealed on load). */
  function activateTokens(host) {
    if (!host) return;
    var tokens = host.querySelectorAll("[data-token]");
    tokens.forEach(function (t, i) {
      t.classList.add("is-in");
    });
  }



  var revealTargets = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            activateTokens(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px 0px 0px" }
    );

    // Clip-path reveal targets hide their own pixels, which can make
    // intersectionRatio read as 0 on Chromium. Watch them with a
    // dedicated, eagerly-firing observer so they still reveal.
    var clipObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            activateTokens(entry.target);
            clipObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach(function (target) {
      if (target.getAttribute("data-reveal") === "clip" || target.getAttribute("data-reveal") === "clip-l") {
        clipObserver.observe(target);
      } else {
        observer.observe(target);
      }
    });
  } else {
    revealTargets.forEach(function (target) {
      target.classList.add("is-visible");
      activateTokens(target);
    });
  }

  /* ---------- Hero glyph reveal ---------- */

  var heroName = document.querySelector('.hero__name[data-char-reveal]');
  var heroWord = document.querySelector('.hero [data-word-reveal]');

  function activateHeroGlyphs() {
    if (heroName) {
      var tokens = heroName.querySelectorAll("[data-token]");
      tokens.forEach(function (t, i) {
        setTimeout(function () { t.classList.add("is-in"); }, 700 + i * 90);
      });
    }
    if (heroWord) {
      var ws = heroWord.querySelectorAll("[data-token]");
      ws.forEach(function (t, i) {
        setTimeout(function () { t.classList.add("is-in"); }, 560 + i * 60);
      });
    }
  }

  requestAnimationFrame(activateHeroGlyphs);
  setTimeout(activateHeroGlyphs, 200);

  /* ---------- Hero cinematic scroll ---------- */

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var hero = document.querySelector("[data-hero]");
  var heroMedia = document.querySelector("[data-hero-media]");
  var heroVideo = heroMedia ? heroMedia.querySelector(".hero__video[data-hero-video]") : null;
  var heroFallback = heroMedia ? heroMedia.querySelector(".hero__fallback") : null;
  var heroImg = heroFallback ? heroFallback.querySelector("img") : null;
  var heroLoader = heroMedia ? heroMedia.querySelector(".hero__loader") : null;
  var soundBtn = document.querySelector("[data-sound-toggle]");
  var soundEnabled = false;

  /* Hero loader: hide when video can play */
  if (heroLoader && heroVideo) {
    function onVideoReady() {
      heroVideo.classList.add("is-loaded");
      heroFallback.classList.add("is-hidden");
      heroLoader.classList.add("is-hidden");
      heroVideo.removeEventListener("canplay", onVideoReady);
      heroVideo.removeEventListener("error", onVideoError);
    }
    function onVideoError() {
      heroFallback.classList.remove("is-hidden");
      heroLoader.classList.add("is-hidden");
      heroVideo.style.display = "none";
      heroVideo.removeEventListener("canplay", onVideoReady);
      heroVideo.removeEventListener("error", onVideoError);
    }
    heroVideo.addEventListener("canplay", onVideoReady);
    heroVideo.addEventListener("error", onVideoError);
    if (heroVideo.readyState >= 3) {
      onVideoReady();
    }
  }

  /* Sound toggle: mute/unmute the SAME video */
  if (soundBtn && heroVideo) {
    soundBtn.addEventListener("click", function () {
      soundEnabled = !soundEnabled;
      heroVideo.muted = !soundEnabled;
      soundBtn.classList.toggle("is-on", soundEnabled);
      soundBtn.setAttribute("aria-pressed", soundEnabled);
      soundBtn.setAttribute("aria-label", soundEnabled ? "소리 끄기" : "소리 켜기");
    });

    // Pause when page hidden
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        heroVideo.pause();
      } else {
        heroVideo.play().catch(function () { /* ignore */ });
      }
    });
  }

  if (hero && (heroVideo || heroImg) && !reducedMotion) {
    var raf = null;
    function updateHero() {
      raf = null;
      var rect = hero.getBoundingClientRect();
      var h = hero.offsetHeight || window.innerHeight;
      var p = Math.min(Math.max(-rect.top / h, 0), 1);
      var scale = 1 + p * 0.06;
      var y = -p * 24;
      var blur = p * 4;
      var bright = 1 - p * 0.18;
      // Target the currently visible video
      var target = null;
      if (soundEnabled && heroVideoSound && heroVideoSound.classList.contains("is-playing")) {
        target = heroVideoSound;
      } else if (heroVideo && heroVideo.classList.contains("is-loaded")) {
        target = heroVideo;
      } else {
        target = heroImg;
      }
      if (target) {
        target.style.transform =
          "translate3d(0," + y.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
        target.style.filter = "blur(" + blur + "px) brightness(" + bright.toFixed(3) + ")";
      }
      var copy = hero.querySelector(".hero__copy");
      if (copy) {
        copy.style.opacity = Math.max(1 - p * 1.4, 0).toString();
        copy.style.transform = "translateY(" + (p * -28).toFixed(1) + "px)";
      }
      var scrollInd = hero.querySelector(".hero__scroll");
      if (scrollInd) {
        scrollInd.style.opacity = Math.max(1 - p * 2.2, 0).toString();
      }
    }

    function scheduleUpdate() {
      if (raf) return;
      raf = requestAnimationFrame(updateHero);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    updateHero();
  }

  /* ---------- Parallax on photo frames ---------- */

  var parallaxNodes = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var parallaxImgs = [];

  if (parallaxNodes.length && !reducedMotion) {
    parallaxNodes.forEach(function (frame) {
      var img = frame.querySelector("img");
      if (img) {
        parallaxImgs.push({ frame: frame, img: img, speed: parseFloat(frame.getAttribute("data-parallax")) || 0.08 });
      }
    });
  }

  if (parallaxImgs.length) {
    var pRaf = null;
    function updateParallax() {
      pRaf = null;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      parallaxImgs.forEach(function (item) {
        var rect = item.frame.getBoundingClientRect();
        if (rect.bottom < -40 || rect.top > vh + 40) return;
        // how far through the viewport the frame is centered: -1..1
        var center = rect.top + rect.height / 2;
        var t = (center - vh / 2) / (vh / 2 + rect.height / 2);
        var py = (-t * item.speed * 100).toFixed(2);
        item.img.style.setProperty("--py", py + "%");
      });
    }
    function scheduleParallax() {
      if (pRaf) return;
      pRaf = requestAnimationFrame(updateParallax);
    }
    window.addEventListener("scroll", scheduleParallax, { passive: true });
    window.addEventListener("resize", scheduleParallax, { passive: true });
    updateParallax();
  }

  /* ---------- Masonry individual tile reveal ---------- */

  var masonryTiles = Array.prototype.slice.call(document.querySelectorAll(".masonry .masonry__item"));
  if (masonryTiles.length && "IntersectionObserver" in window) {
    var masonryObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            masonryObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    masonryTiles.forEach(function (tile, i) {
      var dir = tile.getAttribute("data-reveal") || "up";
      var rx = 0, ry = 30;
      if (dir === "left") { rx = 44; ry = 18; }
      else if (dir === "right") { rx = -44; ry = 18; }
      else if (dir === "down") { ry = -36; }
      else if (dir === "zoom") { tile.style.setProperty("--ps", "1.06"); ry = 0; }
      tile.style.setProperty("--rx", rx + "px");
      tile.style.setProperty("--ry", ry + "px");
      tile.style.setProperty("--gi", i % 6);
      masonryObserver.observe(tile);
    });
  } else if (masonryTiles.length) {
    masonryTiles.forEach(function (tile) { tile.classList.add("is-visible"); });
  }


  /* ---------- Gallery shuffle (randomize order on load) ---------- */
  (function () {
    var masonry = document.querySelector(".masonry");
    if (!masonry) return;
    var items = Array.prototype.slice.call(masonry.querySelectorAll(".masonry__item"));
    if (items.length < 2) return;

    // Fisher-Yates shuffle
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }

    // Re-append in shuffled order and update indices
    items.forEach(function (item, idx) {
      item.setAttribute("data-gallery-index", String(idx));
      masonry.appendChild(item);
    });

    // Re-fetch galleryItems for lightbox to use the new order
    galleryItems = Array.prototype.slice.call(masonry.querySelectorAll(".masonry__item"));
  })();

  var galleryItems = Array.prototype.slice.call(document.querySelectorAll(".masonry__item"));
  var lightbox = document.querySelector("[data-lightbox]");
  var lightboxImage = lightbox && lightbox.querySelector("[data-lightbox-image]");
  var lightboxImg = lightbox && lightbox.querySelector("[data-lightbox-img]");
  var lightboxWebp = lightbox && lightbox.querySelector("[data-webp-src]");
  var lightboxCaption = lightbox && lightbox.querySelector("[data-lightbox-caption]");
  var lightboxCounter = lightbox && lightbox.querySelector("[data-lightbox-counter]");
  var lightboxClose = lightbox && lightbox.querySelector("[data-lightbox-close]");
  var lightboxDialog = lightbox && lightbox.querySelector(".lightbox__dialog");
  var currentIndex = 0;
  var lastFocused = null;

  function updateLightbox(index, direction) {
    var count = galleryItems.length;
    var nextIndex = (index + count) % count;
    var picture = lightboxImg ? lightboxImg.closest("picture") : null;

    function refreshMeta() {
      var item = galleryItems[currentIndex];
      var caption = item ? item.getAttribute("data-caption") : "";
      lightboxCaption.textContent = caption;
      lightboxCounter.textContent =
        String(currentIndex + 1).padStart(2, "0") +
        " / " +
        String(count).padStart(2, "0");
    }

    if (direction && picture) {
      var translate = direction === "prev" ? "-12%" : "12%";
      picture.style.transition = "transform 0.4s var(--ease), opacity 0.4s var(--ease), filter 0.4s var(--ease)";
      picture.style.transform = "translateX(" + translate + ")";
      picture.style.opacity = "0";
      picture.style.filter = "blur(10px)";

      window.setTimeout(function () {
        currentIndex = nextIndex;
        applyLightboxContent(picture);
        void picture.offsetWidth;
        picture.style.transition = "none";
        picture.style.transform = "translateX(" + (direction === "prev" ? "12%" : "-12%") + ")";
        picture.style.opacity = "0";
        picture.style.filter = "blur(10px)";
        void picture.offsetWidth;
        picture.style.transition = "transform 0.5s var(--ease), opacity 0.5s var(--ease), filter 0.5s var(--ease)";
        picture.style.transform = "translateX(0)";
        picture.style.opacity = "1";
        picture.style.filter = "blur(0)";
        refreshMeta();
      }, 220);
    } else {
      currentIndex = nextIndex;
      applyLightboxContent(picture);
      if (picture) {
        picture.style.transition = "";
        picture.style.transform = "";
        picture.style.opacity = "";
        picture.style.filter = "";
        picture.style.animation = "none";
        void picture.offsetWidth;
        picture.style.animation = "";
      }
      refreshMeta();
    }
  }

  function applyLightboxContent(picture) {
    var item = galleryItems[currentIndex];
    if (!item) return;
    var webpSrc = item.getAttribute("data-webp");
    var src = item.getAttribute("data-src");
    var alt = (item.querySelector("img") && item.querySelector("img").getAttribute("alt")) || "";
    if (lightboxWebp && webpSrc) {
      lightboxWebp.srcset = webpSrc;
    }
    lightboxImg.src = src;
    lightboxImg.alt = alt;
  }

  function openLightbox(index) {
    if (!lightbox || galleryItems.length === 0) {
      return;
    }
    lastFocused = document.activeElement;
    updateLightbox(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxDialog.focus();
    document.addEventListener("keydown", onLightboxKeydown);
  }

  function closeLightbox() {
    if (!lightbox) {
      return;
    }
    lightbox.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onLightboxKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function onLightboxKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateLightbox(currentIndex + 1, "next");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateLightbox(currentIndex - 1, "prev");
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function trapFocus(event) {
    if (!lightbox) {
      return;
    }
    var focusables = lightbox.querySelectorAll('button:not([hidden]), [href], [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) {
      return;
    }
    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindLightboxSwipe() {
    if (!lightboxImage) {
      return;
    }

    var picture = lightboxImage.querySelector("picture");
    var startX = null;
    var pointerId = null;

    lightboxImage.addEventListener("pointerdown", function (event) {
      startX = event.clientX;
      pointerId = event.pointerId;
      lightboxImage.classList.add("is-dragging");
      if (picture) {
        picture.style.transition = "none";
      }
    });

    lightboxImage.addEventListener("pointermove", function (event) {
      if (startX === null) {
        return;
      }
      var dx = event.clientX - startX;
      if (picture) {
        picture.style.transform = "translateX(" + dx + "px)";
      }
    });

    function endSwipe(event) {
      if (startX === null) {
        return;
      }
      var dx = event.clientX - startX;
      var threshold = Math.min(60, window.innerWidth * 0.1);
      startX = null;
      pointerId = null;
      lightboxImage.classList.remove("is-dragging");

      if (picture) {
        picture.style.transition = "";
        picture.style.transform = "";
      }

      if (dx < -threshold) {
        updateLightbox(currentIndex + 1, "next");
      } else if (dx > threshold) {
        updateLightbox(currentIndex - 1, "prev");
      }
    }

    lightboxImage.addEventListener("pointerup", endSwipe);
    lightboxImage.addEventListener("pointercancel", endSwipe);
    lightboxImage.addEventListener("pointerleave", function (event) {
      if (startX !== null && pointerId !== null) {
        endSwipe(event);
      }
    });
  }

  galleryItems.forEach(function (item, index) {
    item.addEventListener("click", function () {
      openLightbox(index);
    });
  });

  if (lightbox) {
    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });

    var prevButton = lightbox.querySelector("[data-lightbox-prev]");
    var nextButton = lightbox.querySelector("[data-lightbox-next]");

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        updateLightbox(currentIndex - 1, "prev");
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        updateLightbox(currentIndex + 1, "next");
      });
    }

    bindLightboxSwipe();
  }

  /* ---------- Calendar ---------- */

  var calendarButton = document.querySelector("[data-calendar]");

  if (calendarButton) {
    calendarButton.addEventListener("click", function () {
      var ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Invitation//Yuho First Birthday//KO",
        "BEGIN:VEVENT",
        "UID:yuho-first-birthday-20260817",
        "DTSTAMP:20260101T000000Z",
        "DTSTART;TZID=Asia/Seoul:20260817T113000",
        "DTEND;TZID=Asia/Seoul:20260817T133000",
        "SUMMARY:유호의 첫돌",
        "LOCATION:더우미제 스튜디오, 경기도 용인시 기흥구 사은로 175",
        "DESCRIPTION:2026년 8월 17일 월요일 오전 11시 30분부터 오후 1시 30분까지",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      var blob = new Blob(["\ufeff" + ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "yuho-first-birthday-2026-08-17.ics";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    });
  }

  /* ---------- Kakao Map ---------- */

  var mapContainer = document.querySelector("[data-map]");
  var KAKAO_JS_KEY = mapContainer ? mapContainer.getAttribute("data-kakao-key") || "" : "";
  var KAKAO_SDK_URL =
    "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(KAKAO_JS_KEY) + "&autoload=false";
  var kakaoMapStarted = false;

  function initKakaoMap() {
    if (!mapContainer || !window.kakao || !window.kakao.maps) {
      return;
    }

    var lat = parseFloat(mapContainer.getAttribute("data-map-lat")) || 37.2559;
    var lng = parseFloat(mapContainer.getAttribute("data-map-lng")) || 127.1247;
    var fallback = mapContainer.querySelector(".map__fallback");
    var tilesLoaded = false;

    var options = {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: 4,
    };

    var map = new window.kakao.maps.Map(mapContainer, options);

    var markerImage = new window.kakao.maps.MarkerImage(
      "./assets/map-marker.svg",
      new window.kakao.maps.Size(40, 40),
      { offset: new window.kakao.maps.Point(20, 38) }
    );

    var marker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(lat, lng),
      image: markerImage,
      map: map,
    });

    window.kakao.maps.event.addListener(map, "tileloaded", function () {
      if (!tilesLoaded) {
        tilesLoaded = true;
        if (fallback) {
          fallback.hidden = true;
        }
      }
    });

    setTimeout(function () {
      if (!tilesLoaded && fallback) {
        fallback.hidden = false;
      }
    }, 8000);
  }

  function startKakaoMap() {
    if (kakaoMapStarted || !mapContainer || !KAKAO_JS_KEY) {
      return;
    }
    kakaoMapStarted = true;

    var script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = function () {
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(initKakaoMap);
      }
    };
    script.onerror = function () {};
    document.head.appendChild(script);
  }

  if (mapContainer && KAKAO_JS_KEY) {
    if ("IntersectionObserver" in window) {
      var mapObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startKakaoMap();
              mapObserver.disconnect();
            }
          });
        },
        { rootMargin: "200px 0px" }
      );
      mapObserver.observe(mapContainer);
    } else {
      startKakaoMap();
    }
  }
})();
