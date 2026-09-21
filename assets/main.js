/**
 * Thrivebuild.co — Client-side Scripts
 * Mobile menu, single-open FAQ accordion, smooth scrolling, and Calendly embed handling.
 */

// ==========================================================================
// 1. CONFIGURATION — SWAP YOUR BOOKING URL HERE
// ==========================================================================
const CALENDLY_URL = "https://calendly.com/samthriver/workflow";

// ==========================================================================
// 2. DOM INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initStickyHeader();
  initMobileMenu();
  initAccordion();
  initCalendlyEmbed();
});

// ==========================================================================
// 3. STICKY HEADER SCROLL TREATMENT
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
// 4. ACCESSIBLE MOBILE MENU CONTROLLER
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
// 5. ACCORDION ENHANCEMENT (Progressive: keeps native <details> intact)
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
// 6. CALENDLY EMBED MANAGER & DEMO SCHEDULER
// ==========================================================================
function initCalendlyEmbed() {
  const widgetContainer = document.querySelector(".calendly-inline-widget");
  const fallbackPanel = document.getElementById("calendly-fallback");
  const demoPreview = document.getElementById("calendly-demo-preview");

  if (!widgetContainer) return;

  // Initialize interactive demo buttons regardless of mode
  initDemoSchedulerInteractions();

  // Check if a real Calendly link is configured or still a placeholder
  const isPlaceholder = !CALENDLY_URL || 
                        CALENDLY_URL.includes("[YOUR-USERNAME]") || 
                        CALENDLY_URL.includes("[YOUR") || 
                        CALENDLY_URL.includes("[") ||
                        !CALENDLY_URL.startsWith("https://calendly.com/");

  if (isPlaceholder) {
    // Keep clean demo preview visible; do not load Calendly's 404 iframe
    widgetContainer.classList.add("hidden");
    if (demoPreview) demoPreview.classList.remove("hidden");
    if (fallbackPanel) fallbackPanel.classList.add("hidden");
    return;
  }

  // Live Mode: A valid Calendly URL is provided
  if (demoPreview) demoPreview.classList.add("hidden");
  widgetContainer.classList.remove("hidden");
  widgetContainer.setAttribute("data-url", CALENDLY_URL);

  const fallbackLink = document.getElementById("fallback-booking-link");
  if (fallbackLink) {
    fallbackLink.setAttribute("href", CALENDLY_URL);
  }

  // Inject Calendly's script dynamically
  const script = document.createElement("script");
  script.src = "https://assets.calendly.com/assets/external/widget.js";
  script.async = true;

  let loaded = false;
  script.onload = () => {
    loaded = true;
    if (fallbackPanel) {
      fallbackPanel.classList.add("hidden");
    }
  };

  script.onerror = () => {
    showCalendlyFallback(widgetContainer, fallbackPanel);
  };

  document.head.appendChild(script);

  setTimeout(() => {
    if (!loaded) {
      showCalendlyFallback(widgetContainer, fallbackPanel);
    }
  }, 4000);
}

function showCalendlyFallback(widgetContainer, fallbackPanel) {
  if (widgetContainer) widgetContainer.classList.add("hidden");
  if (fallbackPanel) {
    fallbackPanel.classList.remove("hidden");
  }
}

function initDemoSchedulerInteractions() {
  const dayButtons = document.querySelectorAll(".demo-day-btn");
  const timeButtons = document.querySelectorAll(".demo-time-slot");
  const alertBox = document.getElementById("demo-slot-alert");
  const alertText = document.getElementById("demo-slot-text");

  let selectedDay = "Tomorrow";

  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dayButtons.forEach((b) => {
        b.classList.remove("border-brand", "bg-brand-tint", "text-brand");
        b.classList.add("border-line", "bg-surface", "text-slate-700");
      });
      btn.classList.remove("border-line", "bg-surface", "text-slate-700");
      btn.classList.add("border-brand", "bg-brand-tint", "text-brand");
      selectedDay = btn.getAttribute("data-day") || "Selected Day";
    });
  });

  timeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      timeButtons.forEach((b) => {
        b.classList.remove("border-brand", "bg-brand", "text-white");
        b.classList.add("border-line", "text-slate-800");
      });
      btn.classList.remove("border-line", "text-slate-800");
      btn.classList.add("border-brand", "bg-brand", "text-white");

      const time = btn.innerText.trim();
      if (alertBox && alertText) {
        alertText.innerText = `Demo Slot Selected: ${selectedDay} at ${time}`;
        alertBox.classList.remove("hidden");
      }
    });
  });
}
