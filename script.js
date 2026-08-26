(function () {
  "use strict";

  const body = document.querySelector("body");
  const header = document.querySelector("#header");
  const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
  const scrollTop = document.querySelector(".scroll-top");
  const navLinks = document.querySelectorAll("#navmenu a");

  function toggleScrolled() {
    if (!header) return;
    window.scrollY > 70 ? body.classList.add("scrolled") : body.classList.remove("scrolled");
  }

  function toggleScrollTop() {
    if (!scrollTop) return;
    window.scrollY > 120 ? scrollTop.classList.add("active") : scrollTop.classList.remove("active");
  }

  function closeMobileNav() {
    if (!body.classList.contains("mobile-nav-active")) return;
    body.classList.remove("mobile-nav-active");
    mobileNavToggle?.classList.add("bi-list");
    mobileNavToggle?.classList.remove("bi-x");
    mobileNavToggle?.setAttribute("aria-expanded", "false");
    mobileNavToggle?.setAttribute("aria-label", "Open navigation");
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

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  scrollTop?.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

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

  window.addEventListener("load", () => {
    toggleScrolled();
    toggleScrollTop();
    navmenuScrollspy();
  });

  document.addEventListener("scroll", () => {
    toggleScrolled();
    toggleScrollTop();
    navmenuScrollspy();
  });
})();
