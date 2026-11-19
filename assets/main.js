/**
 * Thrivebuild.co - Client-side Scripts
 * Configuration, sticky header, mobile drawer menu, single-open FAQ accordion,
 * and reliable Calendly inline embed management.
 */

// ==========================================================================
// 1. CONFIGURATION OBJECT
// Centralized settings. Edit here to update links across the site.
// ==========================================================================
const CONFIG = {
  SITE_URL: "https://thrivebuild.co",
  CALENDLY_URL: "https://calendly.com/samthriver/workflow",
  CONTACT_EMAIL: "sam@thrivebuild.co",
  FORM_URL: "#intake",
  FOOTER_LOCATION: "Remote · Serving home improvement companies in the US, Canada, UK and Australia",
  LINKEDIN_URL: "https://www.linkedin.com/company/thrivebuild-co",
};

// ==========================================================================
// 2. DOM INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initConfigHydration();
  initStickyHeader();
  initMobileMenu();
  initLogoNavigation();
  initAccordion();
  initCalendlyEmbed();
  initMetaPixelEvents();
  initIntakeForm();
  initMoneyCheckForm();
  initMobileStickyCta();
  initCarousels();
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
      } else if (key === "CALENDLY_URL" || key === "FORM_URL" || key === "SITE_URL" || key === "LINKEDIN_URL") {
        el.href = CONFIG[key];
      }
    } else if (el.classList.contains("calendly-inline-widget")) {
      // Never insert text into Calendly widgets
      return;
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
// 5b. LOGO CLICK / TAP NAVIGATION
// Ensures clicking or tapping the logo navigates to homepage or scrolls cleanly to top
// ==========================================================================
function initLogoNavigation() {
  document.querySelectorAll('a[aria-label="Thrivebuild"]').forEach((logoLink) => {
    logoLink.addEventListener("click", (e) => {
      const pathname = window.location.pathname.replace(/\/$/, "");
      const isHomePage =
        pathname === "" ||
        pathname === "/" ||
        pathname.endsWith("/index.html") ||
        pathname === "/index.html";

      if (isHomePage) {
        // If already on the homepage, scroll smoothly to the top and reset hash
        e.preventDefault();
        if (window.location.hash) {
          history.pushState(null, "", window.location.pathname);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Close mobile menu if currently open
        const mobileNav = document.getElementById("mobile-nav");
        const menuBtn = document.getElementById("mobile-menu-btn");
        if (mobileNav && !mobileNav.classList.contains("hidden")) {
          mobileNav.classList.add("hidden");
          mobileNav.classList.remove("flex");
          document.body.classList.remove("nav-open");
          if (menuBtn) {
            menuBtn.setAttribute("aria-expanded", "false");
            const menuIcon = document.getElementById("menu-icon");
            const closeIcon = document.getElementById("close-icon");
            if (menuIcon) menuIcon.classList.remove("hidden");
            if (closeIcon) closeIcon.classList.add("hidden");
            menuBtn.focus();
          }
        }
      }
    });
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

  // Inject Calendly's script if not already present
  let scriptLoaded = false;
  const existingScript = document.querySelector('script[src*="calendly.com/assets/external/widget.js"]');
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
    };
    script.onerror = () => {
      showCalendlyFallback(widgetContainer, fallbackPanel);
    };
    document.head.appendChild(script);
  } else {
    scriptLoaded = true;
  }

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

// ==========================================================================
// 8. META (FACEBOOK) PIXEL EVENT TRACKING
// Tracks 'Lead' on booking calendar button clicks, intake form submissions,
// and Calendly schedule confirmations.
// ==========================================================================
function initMetaPixelEvents() {
  const fireLeadEvent = () => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead");
    }
  };

  // 1. Fire 'Lead' when clicking any booking / choose system / workflow map button
  document.addEventListener("click", (e) => {
    const target = e.target.closest("a, button");
    if (!target) return;

    const href = (target.getAttribute("href") || "").toLowerCase();
    const text = (target.textContent || "").trim();

    const isBookingButton =
      href === "#book" ||
      href === "#intake" ||
      href.includes("calendly.com") ||
      /book/i.test(text) ||
      /choose.*system/i.test(text) ||
      /scope.*system/i.test(text) ||
      /workflow map/i.test(text) ||
      /walkthrough/i.test(text);

    if (isBookingButton) {
      fireLeadEvent();
    }
  });

  // 2. Fire 'Lead' when short intake form is submitted
  document.addEventListener("submit", () => {
    fireLeadEvent();
  });

  // 3. Fire 'Lead' if an appointment is confirmed inside Calendly inline widget
  window.addEventListener("message", (e) => {
    if (e.data && e.data.event === "calendly.event_scheduled") {
      fireLeadEvent();
    }
  });
}

// ==========================================================================
// 9. LEAD FORMS (FormSubmit AJAX)
// Shared handler: honeypot check, button state, JSON post to FormSubmit,
// success/error panels, and Meta Pixel Lead on success. Used by the homepage
// intake form and the Solar page money check form.
// ==========================================================================
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/767b7119365982ec0d15aab06df33e14";

function initLeadForm({ form, successPanel, errorPanel, submitBtn, buildPayload, onReset }) {
  if (!form) return;

  const showSuccess = () => {
    form.reset();
    if (onReset) onReset();
    form.classList.add("hidden");
    if (errorPanel) errorPanel.classList.add("hidden");
    if (successPanel) {
      successPanel.classList.remove("hidden");
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset error state
    if (errorPanel) errorPanel.classList.add("hidden");

    // FormSubmit honeypot spam trap
    const honeyInput = form.querySelector('input[name="_honey"]');
    const honeyValue = honeyInput ? honeyInput.value.trim() : "";
    if (honeyValue) {
      // Spam detected: silently simulate success without submitting
      showSuccess();
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    const restoreButton = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    };
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    const showError = () => {
      restoreButton();
      if (successPanel) successPanel.classList.add("hidden");
      if (errorPanel) {
        errorPanel.classList.remove("hidden");
        errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const payload = {
      "_honey": honeyValue,
      "_cc": "aythriver@gmail.com",
      "_template": "table",
      "_captcha": "false",
      ...buildPayload(),
      "Page URL": window.location.href
    };

    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 200) {
        const data = await res.json().catch(() => ({}));
        if (data && (data.success === true || data.success === "true")) {
          restoreButton();
          showSuccess();

          // Fire Meta Pixel Lead event ONLY after a successful response
          if (typeof window.fbq === "function") {
            window.fbq("track", "Lead");
          }
          return;
        }
      }

      showError();
    } catch (err) {
      showError();
    }
  });
}

const fieldValue = (id) => document.getElementById(id)?.value.trim() || "";

// Homepage intake form ("Get a recorded walkthrough")
function initIntakeForm() {
  const form = document.getElementById("intake-form");
  if (!form) return;

  const softwareSelect = document.getElementById("intake-software");
  const softwareOtherWrapper = document.getElementById("intake-software-other-wrapper");
  const softwareOtherInput = document.getElementById("intake-software-other");

  if (softwareSelect && softwareOtherWrapper && softwareOtherInput) {
    // "Which one?" is only shown and required when "Other" is selected
    const syncSoftwareOther = (focus) => {
      if (softwareSelect.value === "Other") {
        softwareOtherWrapper.classList.remove("hidden");
        softwareOtherInput.required = true;
        if (focus) softwareOtherInput.focus();
      } else {
        softwareOtherWrapper.classList.add("hidden");
        softwareOtherInput.required = false;
        softwareOtherInput.value = "";
      }
    };
    softwareSelect.addEventListener("change", () => syncSoftwareOther(true));
    // Covers browsers restoring a previously selected "Other" on back navigation
    syncSoftwareOther(false);
  }

  initLeadForm({
    form,
    successPanel: document.getElementById("intake-success"),
    errorPanel: document.getElementById("intake-error"),
    submitBtn: document.getElementById("intake-submit-btn"),
    onReset: () => {
      if (softwareOtherWrapper) softwareOtherWrapper.classList.add("hidden");
      if (softwareOtherInput) {
        softwareOtherInput.required = false;
        softwareOtherInput.value = "";
      }
    },
    buildPayload: () => {
      const emailVal = fieldValue("intake-email");
      const companyVal = fieldValue("intake-company");
      const rawSoftware = softwareSelect ? softwareSelect.value : "";
      const otherSoftware = softwareOtherInput ? softwareOtherInput.value.trim() : "";
      const softwareVal = (rawSoftware === "Other" && otherSoftware)
        ? `Other: ${otherSoftware}`
        : (rawSoftware === "Other" ? "Other" : rawSoftware);

      return {
        "_subject": `New Thrivebuild lead: ${companyVal} (${softwareVal})`,
        "_replyto": emailVal,
        "Name": fieldValue("intake-name"),
        "Email": emailVal,
        "Company": companyVal,
        "Website": fieldValue("intake-website"),
        "City and state": fieldValue("intake-location"),
        "Team size": document.getElementById("intake-team-size")?.value || "",
        "How leads reach them": fieldValue("intake-lead-source"),
        "Biggest headache": document.getElementById("intake-headache")?.value || "",
        "Software": softwareVal,
        "Phone": fieldValue("intake-phone"),
        "Notes": fieldValue("intake-notes")
      };
    }
  });
}

// Solar page money check form ("Where earned money hides in a solar company")
function initMoneyCheckForm() {
  const form = document.getElementById("money-check-form");
  if (!form) return;

  initLeadForm({
    form,
    successPanel: document.getElementById("money-check-success"),
    errorPanel: document.getElementById("money-check-error"),
    submitBtn: document.getElementById("money-check-submit-btn"),
    buildPayload: () => {
      const emailVal = fieldValue("money-check-email");
      return {
        "_subject": form.querySelector('input[name="_subject"]')?.value || "Money check request",
        "_replyto": emailVal,
        "First name": fieldValue("money-check-name"),
        "Email": emailVal,
        "Company": fieldValue("money-check-company")
      };
    }
  });
}

// ==========================================================================
// 10. MOBILE STICKY CTA
// Slim "Book a 20-Min Workflow Map" bar on mobile. Hidden while the hero button,
// booking calendar or intake form is on screen, so it never duplicates the hero
// CTA or covers the calendar, form or keyboard.
// ==========================================================================
function initMobileStickyCta() {
  const bar = document.getElementById("mobile-sticky-cta");
  if (!bar) return;
  document.body.classList.add("has-sticky-cta");

  const targets = ["hero-cta", "book", "intake", "money-check"].map((id) => document.getElementById(id)).filter(Boolean);
  // Bar starts hidden in the markup; show it straight away if we can't observe
  if (!targets.length || !("IntersectionObserver" in window)) {
    bar.classList.remove("is-hidden");
    return;
  }

  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    bar.classList.toggle("is-hidden", visible.size > 0);
  });
  targets.forEach((el) => observer.observe(el));
}

// ==========================================================================
// TESTIMONIAL SLIDER
// Swipe, drag-scroll or use the arrows and dots. Add a slide by adding an
// <article> inside [data-carousel-track]. Controls hide when there is 1 slide.
// ==========================================================================
function initCarousels() {
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    const slides = Array.from(track ? track.children : []);
    const controls = carousel.querySelector("[data-carousel-controls]");
    const dotsWrap = carousel.querySelector("[data-carousel-dots]");
    const prev = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    if (!track || !slides.length) return;
    if (slides.length < 2) {
      if (controls) controls.classList.add("hidden");
      return;
    }

    slides.forEach((slide, i) => slide.setAttribute("aria-label", `${i + 1} of ${slides.length}`));

    const dots = slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "h-2.5 rounded-full transition-all duration-200 bg-slate-600 w-2.5";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap && dotsWrap.appendChild(dot);
      return dot;
    });

    const maxScroll = () => track.scrollWidth - track.clientWidth;
    const current = () => {
      if (track.scrollLeft >= maxScroll() - 4) return slides.length - 1;
      let best = 0;
      slides.forEach((slide, i) => {
        if (Math.abs(slide.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft)) best = i;
      });
      return best;
    };
    const goTo = (i) => {
      const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
      track.scrollTo({ left: Math.min(target.offsetLeft, maxScroll()), behavior: "smooth" });
    };
    const update = () => {
      const i = current();
      dots.forEach((dot, d) => {
        dot.classList.toggle("bg-brand", d === i);
        dot.classList.toggle("w-6", d === i);
        dot.classList.toggle("bg-slate-600", d !== i);
        dot.classList.toggle("w-2.5", d !== i);
        dot.setAttribute("aria-current", d === i ? "true" : "false");
      });
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= maxScroll() - 4;
    };

    prev && prev.addEventListener("click", () => goTo(current() - 1));
    next && next.addEventListener("click", () => goTo(current() + 1));
    let ticking = false;
    track.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    });
    window.addEventListener("resize", update);
    update();
  });
}

