const qs = (selector, scope) => (scope || document).querySelector(selector)
const qsa = (selector, scope) => Array.from((scope || document).querySelectorAll(selector))

const setupHeader = () => {
  const header = qs(".cabecera")
  if (!header) {
    return
  }
  const onScroll = () => {
    header.classList.toggle("fija", window.scrollY > 8)
  }
  onScroll()
  window.addEventListener("scroll", onScroll, { passive: true })
}

const setupDrawer = () => {
  const toggle = qs(".boton-menu")
  const drawer = qs(".menu-lateral")
  const veil = qs(".velo")
  if (!toggle || !drawer || !veil) {
    return
  }
  const close = () => {
    drawer.classList.remove("abierto")
    veil.classList.remove("abierto")
    document.body.classList.remove("bloqueado")
    toggle.setAttribute("aria-expanded", "false")
  }
  const open = () => {
    drawer.classList.add("abierto")
    veil.classList.add("abierto")
    document.body.classList.add("bloqueado")
    toggle.setAttribute("aria-expanded", "true")
  }
  toggle.addEventListener("click", () => {
    if (drawer.classList.contains("abierto")) {
      close()
      return
    }
    open()
  })
  veil.addEventListener("click", close)
  qsa(".menu-lateral a").forEach((link) => link.addEventListener("click", close))
  window.addEventListener("keydown", (event) => {
    if (Object.is(event.key, "Escape")) {
      close()
    }
  })
}

const setupReveals = () => {
  const items = qsa("[data-reveal]")
  if (!items.length) {
    return
  }
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"))
    return
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }
        const delay = Number(entry.target.dataset.delay || 0) * 90
        window.setTimeout(() => entry.target.classList.add("visible"), delay)
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  )
  items.forEach((item) => observer.observe(item))
}

const setupWords = () => {
  const titles = qsa(".titulo-portada, .titulo-pagina")
  titles.forEach((title) => {
    const words = title.textContent.trim().split(/\s+/)
    title.textContent = ""
    words.forEach((word, index) => {
      const span = document.createElement("span")
      span.className = "palabra"
      span.style.setProperty("--palabra", String(index))
      span.textContent = word
      title.appendChild(span)
      if (index < words.length - 1) {
        title.appendChild(document.createTextNode(" "))
      }
    })
  })
}

const setupCards = () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const cards = qsa(".tarjeta")
  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      card.style.setProperty("--px", x + "px")
      card.style.setProperty("--py", y + "px")
      if (reduced) {
        return
      }
      const ry = ((x / box.width) - 0.5) * 3.6
      const rx = ((y / box.height) - 0.5) * -3.2
      card.style.setProperty("--ry", ry.toFixed(2) + "deg")
      card.style.setProperty("--rx", rx.toFixed(2) + "deg")
    })
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg")
      card.style.setProperty("--ry", "0deg")
    })
  })
}

const setupCounters = () => {
  const values = qsa("[data-count]")
  if (!values.length) {
    return
  }
  const run = (node) => {
    const target = Number(node.dataset.count)
    const decimals = Number(node.dataset.decimals || 0)
    const suffix = node.dataset.suffix || ""
    const started = performance.now()
    const step = (now) => {
      const progress = Math.min((now - started) / 1100, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = (target * eased).toFixed(decimals).replace(".", ",")
      node.textContent = current + suffix
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }
    window.requestAnimationFrame(step)
  }
  if (!("IntersectionObserver" in window)) {
    values.forEach(run)
    return
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }
        run(entry.target)
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.5 }
  )
  values.forEach((value) => observer.observe(value))
}

const setupCompare = () => {
  const frame = qs(".visor-comparador")
  if (!frame) {
    return
  }
  const pane = qs(".panel-comparador", frame)
  const handle = qs(".barra-comparador", frame)
  if (!pane || !handle) {
    return
  }
  let dragging = false
  const apply = (clientX) => {
    const box = frame.getBoundingClientRect()
    const raw = ((clientX - box.left) / box.width) * 100
    const ratio = Math.max(6, Math.min(94, raw))
    pane.style.clipPath = "inset(0 " + (100 - ratio) + "% 0 0)"
    handle.style.left = ratio + "%"
  }
  frame.addEventListener("pointerdown", (event) => {
    dragging = true
    frame.setPointerCapture(event.pointerId)
    apply(event.clientX)
  })
  frame.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return
    }
    apply(event.clientX)
  })
  frame.addEventListener("pointerup", () => {
    dragging = false
  })
  frame.addEventListener("pointercancel", () => {
    dragging = false
  })
}

const setupFaq = () => {
  qsa(".boton-pregunta").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".item-pregunta")
      if (!item) {
        return
      }
      const open = item.classList.contains("abierto")
      qsa(".item-pregunta").forEach((other) => {
        other.classList.remove("abierto")
        const otherButton = qs(".boton-pregunta", other)
        if (otherButton) {
          otherButton.setAttribute("aria-expanded", "false")
        }
      })
      if (!open) {
        item.classList.add("abierto")
        button.setAttribute("aria-expanded", "true")
      }
    })
  })
}

const setupYear = () => {
  qsa("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear())
  })
}

const boot = () => {
  setupHeader()
  setupDrawer()
  setupWords()
  setupReveals()
  setupCards()
  setupCounters()
  setupCompare()
  setupFaq()
  setupYear()
}

if (Object.is(document.readyState, "loading")) {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
