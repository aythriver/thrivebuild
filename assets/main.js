/**
 * Thrivebuild.co — Client-side Scripts
 * Configuration, sticky header, mobile drawer menu, single-open FAQ accordion,
 * and reliable Calendly inline embed management.
 */

// ==========================================================================
// 1. CONFIGURATION OBJECT
// Centralized settings. Edit here to update links across the site.
// ==========================================================================
const CONFIG = {
  SITE_URL: "https://thrivebuild.vercel.app", // change to https://thrivebuild.co once custom domain is connected
  CALENDLY_URL: "https://calendly.com/samthriver/workflow",
  CONTACT_EMAIL: "aythriver@gmail.com",
  FORM_URL: "#intake",
  FOOTER_LOCATION: "Remote · Serving US remodelers · Available US Eastern hours",
};

// ==========================================================================
// 2. DOM INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initConfigHydration();
  initStickyHeader();
  initMobileMenu();
  initAccordion();
  initCalendlyEmbed();
});

// ==========================================================================
// 3. CONFIG HYDRATION
// Injects CONFIG values into elements with data-config attributes
// ==========================================================================
function initConfigHydration() {
  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (!CONFIG[key]) return;

    if (el.tagName === "A") {
      if (key === "CONTACT_EMAIL") {
        const subject = el.getAttribute("data-config-subject");
        el.href = `mailto:${CONFIG[key]}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
      } else if (key === "CALENDLY_URL" || key === "FORM_URL" || key === "SITE_URL") {
        el.href = CONFIG[key];
      }
    } else {
      el.textContent = CONFIG[key];
    }
  });

  // Hide form link triggers if FORM_URL is not yet connected to a live form
  if (CONFIG.FORM_URL === "#intake" || !CONFIG.FORM_URL) {
    document.querySelectorAll("[data-hide-if-no-form]").forEach((el) => {
      el.classList.add("hidden");
    });
  }
}

// ==========================================================================
// 4. STICKY HEADER SCROLL TREATMENT
// ==========================================================================
function initStickyHeader() {
  const header = document.querySelector("header");
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ==========================================================================
// 5. ACCESSIBLE MOBILE MENU CONTROLLER
// ==========================================================================
function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileNav = document.getElementById("mobile-nav");
  const menuIcon = document.getElementById("menu-icon");
  const closeIcon = document.getElementById("close-icon");

  if (!menuBtn || !mobileNav) return;

  const toggleMenu = (open) => {
    const isOpen = open !== undefined ? open : menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      mobileNav.classList.remove("hidden");
      mobileNav.classList.add("flex");
      document.body.classList.add("nav-open");
      if (menuIcon) menuIcon.classList.add("hidden");
      if (closeIcon) closeIcon.classList.remove("hidden");

      // Move focus into the first link of mobile menu
      const firstLink = mobileNav.querySelector("a, button");
      if (firstLink) firstLink.focus();
    } else {
      mobileNav.classList.add("hidden");
      mobileNav.classList.remove("flex");
      document.body.classList.remove("nav-open");
      if (menuIcon) menuIcon.classList.remove("hidden");
      if (closeIcon) closeIcon.classList.add("hidden");
    }
  };

  menuBtn.addEventListener("click", () => toggleMenu());

  // Close when clicking any nav link
  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggleMenu(false);
      menuBtn.focus();
    });
  });

  // Close on Escape key press and return focus
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
      toggleMenu(false);
      menuBtn.focus();
    }
  });
}

// ==========================================================================
// 6. ACCORDION ENHANCEMENT (Progressive: keeps native <details> intact)
// ==========================================================================
function initAccordion() {
  const allDetails = document.querySelectorAll("#faq details");

  allDetails.forEach((targetDetail) => {
    targetDetail.addEventListener("toggle", () => {
      if (targetDetail.open) {
        // Close other accordion items for a clean single-open reading flow
        allDetails.forEach((otherDetail) => {
          if (otherDetail !== targetDetail && otherDetail.open) {
            otherDetail.removeAttribute("open");
          }
        });
      }
    });
  });
}

// ==========================================================================
// 7. CALENDLY EMBED MANAGER (Reliable loading & non-destructive fallback)
// ==========================================================================
function initCalendlyEmbed() {
  const widgetContainer = document.querySelector(".calendly-inline-widget");
  const fallbackPanel = document.getElementById("calendly-fallback");

  if (!widgetContainer) return;

  // Build full Calendly embed URL with clean display parameters
  const embedUrl = `${CONFIG.CALENDLY_URL}?hide_gdpr_banner=1&primary_color=c2410c`;
  widgetContainer.setAttribute("data-url", embedUrl);

  const fallbackLink = document.getElementById("fallback-booking-link");
  if (fallbackLink) {
    fallbackLink.setAttribute("href", CONFIG.CALENDLY_URL);
  }

  // Inject Calendly's script dynamically
  const script = document.createElement("script");
  script.src = "https://assets.calendly.com/assets/external/widget.js";
  script.async = true;

  let scriptLoaded = false;
  script.onload = () => {
    scriptLoaded = true;
  };

  script.onerror = () => {
    showCalendlyFallback(widgetContainer, fallbackPanel);
  };

  document.head.appendChild(script);

  // Generous 10-second safety check for slow mobile networks.
  // Never hide the widget if an iframe has already been spawned.
  setTimeout(() => {
    const hasIframe = widgetContainer.querySelector("iframe");
    if (!scriptLoaded && !hasIframe) {
      showCalendlyFallback(widgetContainer, fallbackPanel);
    }
  }, 10000);
}

function showCalendlyFallback(widgetContainer, fallbackPanel) {
  if (widgetContainer) widgetContainer.classList.add("hidden");
  if (fallbackPanel) fallbackPanel.classList.remove("hidden");
}
