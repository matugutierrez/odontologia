(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  var smooth = { target: window.scrollY, current: window.scrollY, active: false };

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  if (!reduced && finePointer) {
    window.addEventListener(
      "wheel",
      function (e) {
        if (e.ctrlKey) return;
        if (document.body.style.overflow === "hidden") return;
        e.preventDefault();
        if (!smooth.active) {
          smooth.current = window.scrollY;
          smooth.target = window.scrollY;
          smooth.active = true;
        }
        smooth.target = Math.min(maxScroll(), Math.max(0, smooth.target + e.deltaY));
      },
      { passive: false }
    );

    window.addEventListener("keydown", function () {
      smooth.active = false;
    });
    window.addEventListener("touchstart", function () {
      smooth.active = false;
    });
  }

  var parallaxNodes = [];

  function collectParallax() {
    parallaxNodes = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
      return { el: el, img: el.querySelector("img"), amount: parseFloat(el.dataset.amount || "60") };
    });
  }

  function updateParallax() {
    var vh = window.innerHeight;
    for (var i = 0; i < parallaxNodes.length; i++) {
      var n = parallaxNodes[i];
      if (!n.img) continue;
      var r = n.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var p = (vh - r.top) / (vh + r.height); // 0 â†’ 1
      p = Math.min(1, Math.max(0, p));
      var range = n.amount / 12;
      var y = -range + p * range * 2;
      n.img.style.transform = "translate3d(0," + y.toFixed(3) + "%,0) scale(1.12)";
    }
  }

  function frame() {
    if (smooth.active) {
      smooth.current += (smooth.target - smooth.current) * 0.1;
      if (Math.abs(smooth.target - smooth.current) < 0.4) {
        smooth.current = smooth.target;
        smooth.active = false;
      }
      window.scrollTo(0, smooth.current);
    }
    if (!reduced) updateParallax();
    requestAnimationFrame(frame);
  }

  function setupObserver() {
    if (reduced) {
      [].forEach.call(document.querySelectorAll("[data-reveal],[data-parallax]"), function (el) {
        el.classList.add("animado");
      });
      [].forEach.call(document.querySelectorAll("[data-line-inner]"), function (el) {
        el.classList.add("animado");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          io.unobserve(el);
          if (el.hasAttribute("data-split") && el.dataset.trigger === "scroll") {
            playSplit(el);
          } else {
            el.classList.add("animado");
            if (el.dataset.stagger === "true") {
              [].forEach.call(el.children, function (child, i) {
                child.style.setProperty("--reveal-delay", i * 0.08 + "s");
                child.classList.add("animado");
              });
            }
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );

    [].forEach.call(document.querySelectorAll("[data-reveal]"), function (el) {
      el.style.setProperty("--reveal-y", (el.dataset.y || 28) + "px");
      el.style.setProperty("--reveal-delay", (el.dataset.delay || 0) + "s");
      if (el.dataset.stagger === "true") {
        [].forEach.call(el.children, function (child) {
          child.setAttribute("data-reveal", "");
          child.style.opacity = "0";
        });
      }
      io.observe(el);
    });

    var pio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          pio.unobserve(e.target);
          e.target.classList.add("animado");
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    [].forEach.call(document.querySelectorAll("[data-parallax]"), function (el) {
      pio.observe(el);
    });

    [].forEach.call(document.querySelectorAll("[data-split]"), function (el) {
      if (el.dataset.trigger === "scroll") {
        io.observe(el);
      } else {
        playSplit(el, parseFloat(el.dataset.delay || "0"));
      }
    });
  }

  function playSplit(el, delay) {
    var base = delay || parseFloat(el.dataset.delay || "0");
    [].forEach.call(el.querySelectorAll("[data-line-inner]"), function (line, i) {
      line.style.setProperty("--line-delay", (base + i * 0.09).toFixed(2) + "s");
      line.classList.add("animado");
    });
  }

  function setupMagnetic() {
    if (reduced || !finePointer) return;
    [].forEach.call(document.querySelectorAll("[data-magnetic]"), function (el) {
      var strength = parseFloat(el.dataset.magnetic || "0.3");
      var raf = null;
      var tx = 0,
        ty = 0,
        cx = 0,
        cy = 0;

      function loop() {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform = "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0)";
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      }
      function start() {
        if (!raf) raf = requestAnimationFrame(loop);
      }
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = (e.clientX - (r.left + r.width / 2)) * strength;
        ty = (e.clientY - (r.top + r.height / 2)) * strength;
        start();
      });
      el.addEventListener("mouseleave", function () {
        tx = 0;
        ty = 0;
        start();
      });
    });
  }

  function setupNav() {
    var btn = document.querySelector("[data-menu-btn]");
    var overlay = document.querySelector(".menu");
    if (!btn || !overlay) return;
    var label = btn.querySelector("[data-menu-label]");
    var timer = null;

    [].forEach.call(overlay.querySelectorAll(".menu-enlace"), function (item, i) {
      item.style.setProperty("--nav-delay", (0.25 + i * 0.06).toFixed(2) + "s");
    });

    function open() {
      clearTimeout(timer);
      overlay.classList.add("visible");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add("abierto");
        });
      });
      btn.classList.add("abierto");
      btn.setAttribute("aria-expanded", "true");
      if (label) label.textContent = "Cerrar";
      document.body.style.overflow = "hidden";
    }

    function close() {
      overlay.classList.remove("abierto");
      btn.classList.remove("abierto");
      btn.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Menú";
      document.body.style.overflow = "";
      timer = setTimeout(function () {
        overlay.classList.remove("visible");
      }, 600);
    }

    btn.addEventListener("click", function () {
      if (overlay.classList.contains("abierto")) close();
      else open();
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("abierto")) close();
    });
  }

  function setupPageTransition() {
    var curtain = document.querySelector(".cortina");
    if (!curtain) return;

    if (!reduced) {
      curtain.classList.add("activo");
      curtain.style.transition = "none";
      curtain.style.clipPath = "inset(0% 0% 0% 0%)";
      requestAnimationFrame(function () {
        curtain.style.transition = "clip-path 0.6s cubic-bezier(0.87,0,0.13,1)";
        curtain.style.clipPath = "inset(0% 0% 100% 0%)";
        setTimeout(function () {
          curtain.classList.remove("activo");
        }, 620);
      });
    }

    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (!a || reduced) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || href.charAt(0) === "#" || /^(https?:|mailto:|tel:)/.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      curtain.classList.add("activo");
      curtain.style.transition = "clip-path 0.55s cubic-bezier(0.87,0,0.13,1)";
      curtain.style.clipPath = "inset(0% 0% 0% 0%)";
      setTimeout(function () {
        window.location.href = href;
      }, 480);
    });
  }

  function init() {
    collectParallax();
    setupObserver();
    setupMagnetic();
    setupNav();
    setupPageTransition();
    updateParallax();
    requestAnimationFrame(frame);
    window.addEventListener("resize", function () {
      collectParallax();
      updateParallax();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

document.querySelector('a[href="#pedir-turno"]').addEventListener('click', function (e) {
    e.preventDefault();

    const destino = document.getElementById('pedir-turno');
    const altura = -100; 

    window.scrollTo({
        top: destino.offsetTop - altura,
        behavior: 'smooth'
    });
});
