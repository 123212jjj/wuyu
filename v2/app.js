(() => {
  "use strict";

  const body = document.body;
  const portal = document.getElementById("portal");
  const track = document.getElementById("track");
  const slides = Array.from(document.querySelectorAll(".slide")).filter(
    (slide) => !slide.classList.contains("slide--clone")
  );
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
  let loop = null;
  let loopTimer = 0;
  let isLooping = false;

  /* ------------------------------------------------------------------
     Infinite loop stage
     [clone of last] [slide 0] [slide 1] [slide 2] [clone of first]
  ------------------------------------------------------------------ */
  const makeClone = (slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.add("slide--clone");
    clone.classList.remove("is-active", "animate-in");
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    return clone;
  };

  const firstSlide = slides[0];
  const lastSlide = slides[slides.length - 1];
  track.insertBefore(makeClone(lastSlide), firstSlide);
  track.appendChild(makeClone(firstSlide));

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

  const setLogicalPosition = (logicalIndex, animated) => {
    setTransform(-(logicalIndex + 1) * width, animated);
  };

  const jumpToLogical = (logicalIndex) => {
    track.style.transition = "none";
    track.style.transform = `translate3d(${(-(logicalIndex + 1) * width).toFixed(2)}px, 0, 0)`;
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

    // The carousel loops forever: previous from page 1 goes to page 3,
    // next from page 3 returns to page 1.
    if (prevSlide) prevSlide.disabled = false;
    if (nextSlide) nextSlide.disabled = false;

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

  const finishLoop = () => {
    if (!loop) return;

    const nextIndex = loop.nextIndex;
    loop = null;
    isLooping = false;
    window.clearTimeout(loopTimer);
    loopTimer = 0;

    // The clone and the real slide look identical. Jump from the clone
    // back to the real slide with no transition, so the loop is seamless.
    jumpToLogical(nextIndex);
  };

  const startLoop = (nextIndex, direction) => {
    index = nextIndex;
    updateUI();
    writeHash();

    if (reduceMotion.matches) {
      jumpToLogical(nextIndex);
      return;
    }

    // Forward from page 3 goes to clone of page 1 at position 4.
    // Backward from page 1 goes to clone of page 3 at position 0.
    const targetPosition = direction > 0 ? slides.length + 1 : 0;

    loop = { nextIndex };
    isLooping = true;
    setTransform(-targetPosition * width, true);

    window.clearTimeout(loopTimer);
    loopTimer = window.setTimeout(finishLoop, 1050);
  };

  const goTo = (nextIndex, options = {}) => {
    if (isLooping) return;

    const { animate = true, updateHash = true } = options;
    const next = ((nextIndex % slides.length) + slides.length) % slides.length;

    if (next === index) {
      if (animate) animateIn();
      return;
    }

    index = next;
    width = portal.clientWidth || window.innerWidth;
    updateUI();
    setLogicalPosition(index, true);

    if (animate) animateIn();
    if (updateHash) writeHash();
  };

  const step = (direction) => {
    if (isLooping) return;

    const next = (index + direction + slides.length) % slides.length;
    const wrapsForward = direction > 0 && index === slides.length - 1;
    const wrapsBackward = direction < 0 && index === 0;

    if (wrapsForward || wrapsBackward) {
      startLoop(next, direction);
      return;
    }

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
      const next = (index + direction + slides.length) % slides.length;
      const wrapsForward = direction > 0 && index === slides.length - 1;
      const wrapsBackward = direction < 0 && index === 0;

      if (wrapsForward || wrapsBackward) {
        startLoop(next, direction);
        return;
      }

      index = next;
      updateUI();
      setLogicalPosition(index, true);
      writeHash();
      return;
    }

    setLogicalPosition(index, true);
  };

  const onPointerDown = (event) => {
    if (isLooping) return;
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

    const offset = clamp(deltaX, -width * 1.04, width * 1.04);
    track.style.transform = `translate3d(${(-(index + 1) * width + offset).toFixed(2)}px, 0, 0)`;
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
    if (element.closest(".slide--clone")) return;

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
    if (isLooping) return;
    width = portal.clientWidth || window.innerWidth;
    jumpToLogical(index);
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
  jumpToLogical(index);
  animateIn();
})();
