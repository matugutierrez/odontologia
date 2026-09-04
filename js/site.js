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
      var p = (vh - r.top) / (vh + r.height);
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
    window.sitio = {
      recargar: function () {
        collectParallax();
        setupObserver();
        setupMagnetic();
        updateParallax();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

var anclaTurno = document.querySelector('a[href="#pedir-turno"]');
if (anclaTurno) anclaTurno.addEventListener('click', function (e) {
    e.preventDefault();

    const destino = document.getElementById('pedir-turno');
    const altura = -100; 

    window.scrollTo({
        top: destino.offsetTop - altura,
        behavior: 'smooth'
    });
});

(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;

  function progreso() {
    if (reduce) return;
    var bar = document.createElement("div");
    bar.className = "progreso-lectura";
    document.body.appendChild(bar);
    function upd() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)).toFixed(4) + ")";
    }
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

function marquee() {
  if (reduce) return;

  const pistas = [...document.querySelectorAll(".carrusel-pista")];
  if (!pistas.length) return;

  pistas.forEach((pista) => {
    // Desactiva la animación CSS y deja que JS controle el movimiento.
    pista.style.animation = "none";

    let posicion = 0;
    let velocidad = 0;
    let velocidadObjetivo = 0;

    const duracion = parseFloat(
      pista.dataset.base ||
      pista.style.getPropertyValue("--marquee-duration") ||
      "38"
    );

    function actualizar() {
      const mitad = pista.scrollWidth / 2;

      // Velocidad normal calculada según la duración configurada.
      const velocidadBase = mitad / (duracion * 1000);

      // Si el mouse está encima, el objetivo es detenerse.
      velocidadObjetivo = pista.matches(":hover")
        ? 0
        : velocidadBase;

      // Suaviza muchísimo la aceleración y la frenada.
      velocidad += (velocidadObjetivo - velocidad) * 0.035;

      posicion -= velocidad * 16.67;

      // Cuando termina la primera copia, vuelve al principio sin salto visible.
      if (posicion <= -mitad) {
        posicion += mitad;
      }

      pista.style.transform = `translate3d(${posicion}px, 0, 0)`;

      requestAnimationFrame(actualizar);
    }

    actualizar();
  });
}

  function palabras() {
    var nodos = document.querySelectorAll("[data-palabras]");
    if (!nodos.length) return;
    [].forEach.call(nodos, function (el) {
      var i = 0;
      var piezas = [];
      [].forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/\s+/).filter(Boolean).forEach(function (w) {
            piezas.push({ texto: w, clase: null });
          });
        } else if (n.nodeType === 1) {
          n.textContent.split(/\s+/).filter(Boolean).forEach(function (w) {
            piezas.push({ texto: w, clase: n.className });
          });
        }
      });
      el.textContent = "";
      piezas.forEach(function (p) {
        var m = document.createElement("span");
        m.className = "palabra-mascara";
        var inner = document.createElement("span");
        inner.textContent = p.texto;
        if (p.clase) inner.className = p.clase;
        inner.style.setProperty("--palabra-delay", (i * 0.06).toFixed(2) + "s");
        i++;
        m.appendChild(inner);
        if (/^[.,;:!?)]/.test(p.texto) && el.lastChild && el.lastChild.nodeType === 3) {
          el.removeChild(el.lastChild);
        }
        el.appendChild(m);
        el.appendChild(document.createTextNode(" "));
      });
    });
    if (reduce) {
      [].forEach.call(nodos, function (el) { el.classList.add("animado"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add("animado");
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    [].forEach.call(nodos, function (el) { io.observe(el); });
  }

  function cortinas() {
    var nodos = document.querySelectorAll("[data-parallax]");
    [].forEach.call(nodos, function (el) { el.classList.add("revelado"); });
    if (reduce) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add("animado");
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    [].forEach.call(nodos, function (el) { io.observe(el); });
  }

  function estado() {
    var chip = document.querySelector("[data-estado]");
    var lista = document.querySelector("[data-horarios]");
    if (!chip || !lista) return;
    var txt = chip.querySelector("[data-estado-texto]");
    var dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    var items = [].slice.call(lista.querySelectorAll("li"));
    var mapa = {};
    items.forEach(function (li) {
      var d = parseInt(li.dataset.dia, 10);
      var r = (li.dataset.rangos || "").split(",").filter(Boolean).map(function (x) {
        var p = x.split("-");
        return [min(p[0]), min(p[1])];
      });
      mapa[d] = r;
    });
    function min(h) {
      var p = h.split(":");
      return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    }
    var ahora = new Date();
    var hoy = ahora.getDay();
    var m = ahora.getHours() * 60 + ahora.getMinutes();
    items.forEach(function (li) {
      if (parseInt(li.dataset.dia, 10) === hoy) li.classList.add("hoy");
    });
    var abierto = (mapa[hoy] || []).some(function (r) { return m >= r[0] && m < r[1]; });
    if (abierto) {
      chip.classList.remove("cerrado");
      txt.textContent = "Abierto ahora";
      return;
    }
    chip.classList.add("cerrado");
    var prox = null;
    for (var i = 0; i < 7; i++) {
      var d = (hoy + i) % 7;
      var rangos = mapa[d] || [];
      for (var j = 0; j < rangos.length; j++) {
        if (i === 0 && rangos[j][0] <= m) continue;
        prox = { dia: d, ini: rangos[j][0], hoy: i === 0, manana: i === 1 };
        break;
      }
      if (prox) break;
    }
    if (!prox) { txt.textContent = "Cerrado"; return; }
    var hh = String(Math.floor(prox.ini / 60)).padStart(2, "0") + ":" + String(prox.ini % 60).padStart(2, "0");
    var cuando = prox.hoy ? "hoy" : prox.manana ? "mañana" : dias[prox.dia];
    txt.textContent = "Cerrado — abre " + cuando + " " + hh;
  }

  function ctaFlotante() {
    if (document.querySelector(".cta-flotante")) return;
    var a = document.createElement("a");
    a.className = "cta-flotante";
    a.href = "https://wa.me/+5491141578654?text=%C2%A1Hola%21%20Quiero%20pedir%20un%20turno%20en%20Odontolog%C3%ADa%20C%26C.";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = "<span>Pedir turno por WhatsApp</span><span>\u2192</span>";
    document.body.appendChild(a);
    function upd() {
      if (window.scrollY > window.innerHeight * 0.6) a.classList.add("visible");
      else a.classList.remove("visible");
    }
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  function tarjetas() {
    [].forEach.call(document.querySelectorAll(".tarjeta"), function (el) {
      el.addEventListener("touchstart", function () { el.classList.add("tocada"); }, { passive: true });
      el.addEventListener("touchend", function () {
        setTimeout(function () { el.classList.remove("tocada"); }, 400);
      }, { passive: true });
    });
  }

  function init() {
    progreso();
    marquee();
    palabras();
    cortinas();
    estado();
    ctaFlotante();
    tarjetas();
    window.extras = {
      recargar: function () {
        palabras();
        cortinas();
        estado();
        tarjetas();
      }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
