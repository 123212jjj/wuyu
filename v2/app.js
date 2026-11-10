(() => {
  "use strict";

  const body = document.body;
  const portal = document.getElementById("portal");
  const track = document.getElementById("track");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const tabs = Array.from(document.querySelectorAll(".rail-tab"));
  const prevSlide = document.getElementById("prevSlide");
  const nextSlide = document.getElementById("nextSlide");
  const railIndex = document.getElementById("railIndex");
  const progress = document.getElementById("slideProgress");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!portal || !track || !slides.length) return;

  const hashes = slides.map((slide) => slide.dataset.hash || "");
  const pad = (value) => String(value).padStart(2, "0");
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  let index = 0;
  let width = portal.clientWidth || window.innerWidth;
  let drag = null;
  let wheelLockedAt = 0;
  let animationTimer = 0;
  let lastDragAt = 0;
  let lastDragDistance = 0;

  const setTheme = (nextIndex) => {
    const slide = slides[nextIndex];
    const theme = slide?.dataset.theme === "light" ? "light" : "dark";

    body.dataset.slide = String(nextIndex);
    body.dataset.theme = theme;

    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "light" ? "#f1eee7" : "#050608");
    }
  };

  const setTransform = (offset, animated) => {
    track.style.transition = animated && !reduceMotion.matches
      ? "transform 0.96s cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
  };

  const animateIn = () => {
    if (reduceMotion.matches) return;

    const activeSlide = slides[index];
    if (!activeSlide) return;

    activeSlide.classList.remove("animate-in");
    // Force a style flush so the entrance can replay when returning to a slide.
    void activeSlide.offsetWidth;
    activeSlide.classList.add("animate-in");

    window.clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => {
      activeSlide.classList.remove("animate-in");
    }, 1650);
  };

  const updateUI = () => {
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.inert = !active;

      if (!active) slide.classList.remove("animate-in");
    });

    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-current", active ? "true" : "false");
    });

    if (railIndex) railIndex.textContent = pad(index + 1);
    if (prevSlide) prevSlide.disabled = index === 0;
    if (nextSlide) nextSlide.disabled = index === slides.length - 1;

    if (progress) {
      progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    }

    setTheme(index);
  };

  const writeHash = () => {
    const hash = hashes[index];
    if (!hash) return;
    if (window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, "", `#${hash}`);
    }
  };

  const goTo = (nextIndex, options = {}) => {
    const { animate = true, updateHash = true } = options;
    const next = clamp(nextIndex, 0, slides.length - 1);

    if (next === index) {
      if (animate) animateIn();
      return;
    }

    index = next;
    width = portal.clientWidth || window.innerWidth;
    updateUI();
    setTransform(-index * width, true);

    if (animate) animateIn();
    if (updateHash) writeHash();
  };

  const step = (direction) => {
    const next = clamp(index + direction, 0, slides.length - 1);
    if (next === index) return;
    goTo(next, { animate: true });
  };

  const initialFromHash = () => {
    const raw = window.location.hash.replace(/^#/, "");
    const found = hashes.indexOf(raw);
    return found >= 0 ? found : 0;
  };

  /* ------------------------------------------------------------------
     Pointer drag
  ------------------------------------------------------------------ */
  const clampDragOffset = (delta) => {
    if ((index === 0 && delta > 0) || (index === slides.length - 1 && delta < 0)) {
      return delta * 0.26;
    }
    return delta;
  };

  const finishDrag = (event, cancelled = false) => {
    if (!drag || event.pointerId !== drag.id) return;

    const delta = drag.moved ? event.clientX - drag.startX : 0;
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = delta / elapsed;
    const threshold = width * 0.16;
    const shouldMove = !cancelled && drag.moved && (Math.abs(delta) > threshold || Math.abs(velocity) > 0.45);

    lastDragAt = performance.now();
    lastDragDistance = Math.abs(delta);

    const currentDrag = drag;
    drag = null;

    portal.classList.remove("is-dragging");
    portal.releasePointerCapture?.(currentDrag.id);

    if (shouldMove) {
      const direction = delta < 0 ? 1 : -1;
      const next = clamp(index + direction, 0, slides.length - 1);

      if (next !== index) {
        index = next;
        updateUI();
        setTransform(-index * width, true);
        writeHash();
        return;
      }
    }

    setTransform(-index * width, true);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("a, button, [data-no-drag]")) return;

    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      moved: false,
    };

    portal.classList.add("is-dragging");
    portal.setPointerCapture?.(event.pointerId);
    track.style.transition = "none";
  };

  const onPointerMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) > 6) drag.moved = true;

    const offset = clampDragOffset(deltaX);
    track.style.transform = `translate3d(${(-index * width + offset).toFixed(2)}px, 0, 0)`;
  };

  portal.addEventListener("pointerdown", onPointerDown, { passive: true });
  portal.addEventListener("pointermove", onPointerMove, { passive: true });
  portal.addEventListener("pointerup", (event) => finishDrag(event), { passive: true });
  portal.addEventListener("pointercancel", (event) => finishDrag(event, true), { passive: true });

  /* ------------------------------------------------------------------
     Wheel / trackpad
  ------------------------------------------------------------------ */
  portal.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;

      event.preventDefault();

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 4) return;

      const now = performance.now();
      if (now - wheelLockedAt < 900) return;
      wheelLockedAt = now;

      step(delta > 0 ? 1 : -1);
    },
    { passive: false }
  );

  /* ------------------------------------------------------------------
     Keyboard
  ------------------------------------------------------------------ */
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
    }

    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0, { animate: true });
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(slides.length - 1, { animate: true });
    }
  });

  /* ------------------------------------------------------------------
     Navigation
  ------------------------------------------------------------------ */
  document.querySelectorAll("[data-goto]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (performance.now() - lastDragAt < 360 && lastDragDistance > 8) {
        event.preventDefault();
        return;
      }

      const target = Number(element.dataset.goto);
      if (!Number.isFinite(target)) return;

      event.preventDefault();
      goTo(target, { animate: true });
    });
  });

  prevSlide?.addEventListener("click", () => step(-1));
  nextSlide?.addEventListener("click", () => step(1));

  window.addEventListener("hashchange", () => {
    const target = initialFromHash();
    if (target !== index) goTo(target, { animate: true, updateHash: false });
  });

  /* ------------------------------------------------------------------
     Layout / boot
  ------------------------------------------------------------------ */
  const refreshLayout = () => {
    width = portal.clientWidth || window.innerWidth;
    setTransform(-index * width, false);
  };

  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshLayout, 100);
    },
    { passive: true }
  );

  if (document.fonts?.ready) {
    document.fonts.ready.then(refreshLayout).catch(() => {});
  }

  index = initialFromHash();
  width = portal.clientWidth || window.innerWidth;
  updateUI();
  setTransform(-index * width, false);
  animateIn();
})();
