(function () {
  "use strict";

  const body = document.body;
  const header = document.querySelector("#header");
  const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
  const scrollTop = document.querySelector(".scroll-top");
  const navLinks = document.querySelectorAll("#navmenu a");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scrollFrame = 0;
  let readingProgress;
  const pendingReveals = new Set();

  function toggleScrolled() {
    if (!header) return;
    body.classList.toggle("scrolled", window.scrollY > 70);
  }

  function toggleScrollTop() {
    if (!scrollTop) return;
    scrollTop.classList.toggle("active", window.scrollY > 120);
  }

  function updateReadingProgress() {
    if (!readingProgress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    readingProgress.style.setProperty("--reading-progress", progress.toFixed(4));
    readingProgress.classList.toggle("is-active", progress > 0.002);
  }

  function updateAmbientMedia() {
    if (reducedMotion) return;
    document.querySelectorAll(".operations-visual").forEach((section) => {
      const image = section.querySelector(".operations-visual-image");
      if (!image) return;
      const bounds = section.getBoundingClientRect();
      if (bounds.bottom < -120 || bounds.top > window.innerHeight + 120) return;
      const centerOffset = window.innerHeight / 2 - (bounds.top + bounds.height / 2);
      const progress = centerOffset / Math.max(window.innerHeight + bounds.height, 1);
      const shift = Math.max(-22, Math.min(22, progress * 54));
      image.style.setProperty("--operations-shift-y", `${shift.toFixed(2)}px`);
    });
  }

  function revealPassedItems() {
    if (reducedMotion || !pendingReveals.size) return;
    const revealLine = window.innerHeight * 0.92;
    pendingReveals.forEach((element) => {
      if (element.getBoundingClientRect().top > revealLine) return;
      element.classList.add("is-visible");
      pendingReveals.delete(element);
    });
  }

  function closeMobileNav() {
    if (!body.classList.contains("mobile-nav-active")) return;
    body.classList.remove("mobile-nav-active");
    mobileNavToggle?.classList.add("bi-list");
    mobileNavToggle?.classList.remove("bi-x");
    mobileNavToggle?.setAttribute("aria-expanded", "false");
    mobileNavToggle?.setAttribute("aria-label", "Open navigation");
  }

  function navmenuScrollspy() {
    const position = window.scrollY + 220;
    navLinks.forEach((link) => {
      if (!link.hash) return;
      const section = document.querySelector(link.hash);
      if (!section) return;
      if (position >= section.offsetTop && position <= section.offsetTop + section.offsetHeight) {
        navLinks.forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }

  function updateScrollEffects() {
    scrollFrame = 0;
    toggleScrolled();
    toggleScrollTop();
    updateReadingProgress();
    updateAmbientMedia();
    revealPassedItems();
    navmenuScrollspy();
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  }

  function initReadingProgress() {
    readingProgress = document.createElement("div");
    readingProgress.className = "reading-progress";
    readingProgress.setAttribute("aria-hidden", "true");
    body.append(readingProgress);
  }

  function initPageEntrance() {
    if (reducedMotion) {
      body.classList.add("page-ready");
      return;
    }

    body.classList.add("motion-ready");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => body.classList.add("page-ready"));
    });
  }

  function initHeroMotion() {
    const hero = document.querySelector(".hero");
    const visual = hero?.querySelector(".hero-visual");
    if (!hero || !visual || reducedMotion) return;

    const finePointer = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    let pointerX = 0;
    let pointerY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = 0;
    let isVisible = true;

    function renderHeroMotion(time) {
      animationFrame = 0;
      if (!isVisible || document.hidden) return;

      const scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(hero.offsetHeight, 1)));
      currentX += (pointerX - currentX) * 0.055;
      currentY += (pointerY - currentY) * 0.055;

      const driftX = Math.sin(time / 6200) * (finePointer.matches ? 3.5 : 1.25);
      const driftY = Math.cos(time / 7600) * (finePointer.matches ? 2.5 : 1);
      visual.style.setProperty("--hero-shift-x", `${(currentX + driftX).toFixed(2)}px`);
      visual.style.setProperty("--hero-shift-y", `${(currentY + driftY + scrollRatio * 28).toFixed(2)}px`);
      animationFrame = window.requestAnimationFrame(renderHeroMotion);
    }

    function startHeroMotion() {
      if (!animationFrame && isVisible && !document.hidden) {
        animationFrame = window.requestAnimationFrame(renderHeroMotion);
      }
    }

    function stopHeroMotion() {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    hero.addEventListener("pointermove", (event) => {
      if (!finePointer.matches) return;
      const bounds = hero.getBoundingClientRect();
      const localX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const localY = (event.clientY - bounds.top) / bounds.height - 0.5;
      pointerX = localX * -18;
      pointerY = localY * -12;
    });

    hero.addEventListener("pointerleave", () => {
      pointerX = 0;
      pointerY = 0;
    });

    document.addEventListener("visibilitychange", () => {
      document.hidden ? stopHeroMotion() : startHeroMotion();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        isVisible ? startHeroMotion() : stopHeroMotion();
      }, { threshold: 0.01 });
      observer.observe(hero);
    }

    startHeroMotion();
  }

  function initScrollReveals() {
    if (reducedMotion) return;

    const revealItems = new Set();

    function register(element, type = "up", delay = 0) {
      if (!element || revealItems.has(element)) return;
      element.classList.add("motion-reveal", `motion-reveal--${type}`);
      element.style.setProperty("--reveal-delay", `${delay}ms`);
      revealItems.add(element);
      pendingReveals.add(element);
    }

    function registerGroup(selector, type = "up", interval = 80, maxDelay = 320) {
      document.querySelectorAll(selector).forEach((element, index) => {
        register(element, type, Math.min(index * interval, maxDelay));
      });
    }

    document.querySelectorAll(".section-title").forEach((element) => register(element));
    document.querySelectorAll(".section-intro-grid").forEach((grid) => {
      Array.from(grid.children).forEach((element, index) => register(element, index ? "right" : "left", index * 100));
    });

    registerGroup(".outcome-grid article", "up", 90);
    document.querySelectorAll(".operations-visual-copy").forEach((element) => register(element, "left"));
    registerGroup(".operations-signals span", "up", 80, 160);
    registerGroup(".capability-jump a", "up", 65, 260);
    document.querySelectorAll(".capability-row").forEach((row) => {
      register(row.querySelector(".capability-heading"), "left");
      register(row.querySelector(".capability-content"), "right", 90);
    });
    registerGroup(".product-proof-grid article", "up", 110);
    registerGroup(".delivery-steps li", "up", 105);
    register(document.querySelector(".delivery-steps"), "timeline");
    document.querySelectorAll(".engagement-band").forEach((band) => register(band));
    document.querySelectorAll(".contact-layout").forEach((layout) => {
      Array.from(layout.children).forEach((element, index) => register(element, index ? "right" : "left", index * 90));
    });

    registerGroup(".proof-stat", "up", 90);
    registerGroup(".pitch-panel", "up", 100);
    document.querySelectorAll(".feature-showcase").forEach((showcase, index) => {
      register(showcase.querySelector(".col-lg-5"), index % 2 ? "right" : "left");
      register(showcase.querySelector(".feature-shot"), "media", 90);
    });
    registerGroup(".benefit-card", "up", 90);
    document.querySelectorAll(".detail-cta").forEach((cta) => register(cta));
    registerGroup(".footer-top .footer-grid > *, .footer-top .row > *", "up", 75, 240);

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((element) => {
        element.classList.add("is-visible");
        pendingReveals.delete(element);
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        pendingReveals.delete(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -9% 0px",
      threshold: 0.08,
    });

    revealItems.forEach((element) => observer.observe(element));
  }

  function initProofCounters() {
    if (reducedMotion || !("IntersectionObserver" in window)) return;

    const counters = Array.from(document.querySelectorAll(".proof-stat strong"))
      .map((element) => {
        const match = element.textContent.match(/[\d,]+/);
        if (!match) return null;
        const value = Number(match[0].replaceAll(",", ""));
        if (!Number.isFinite(value) || value < 10) return null;
        return { element, match: match[0], value, original: element.textContent };
      })
      .filter(Boolean);

    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const counter = counters.find(({ element }) => element === entry.target);
        if (!counter) return;

        const start = performance.now();
        const duration = Math.min(1450, 850 + Math.log10(counter.value + 1) * 180);

        function update(now) {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const formatted = Math.round(counter.value * eased).toLocaleString("en-US");
          counter.element.textContent = counter.original.replace(counter.match, formatted);
          if (progress < 1) window.requestAnimationFrame(update);
        }

        window.requestAnimationFrame(update);
        observer.unobserve(counter.element);
      });
    }, { threshold: 0.55 });

    counters.forEach(({ element }) => observer.observe(element));
  }

  mobileNavToggle?.addEventListener("click", () => {
    const isOpen = body.classList.toggle("mobile-nav-active");
    mobileNavToggle.classList.toggle("bi-list");
    mobileNavToggle.classList.toggle("bi-x");
    mobileNavToggle.setAttribute("aria-expanded", String(isOpen));
    mobileNavToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      mobileNavToggle?.focus();
    }
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMobileNav));

  scrollTop?.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  initReadingProgress();
  initPageEntrance();
  initHeroMotion();
  initScrollReveals();
  initProofCounters();
  updateScrollEffects();

  window.addEventListener("load", updateScrollEffects);
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  document.addEventListener("scroll", requestScrollUpdate, { passive: true });
})();
