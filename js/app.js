'use strict';

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════
const FRAME_COUNT  = 192;
const FRAME_SPEED  = 2.0;
const IMAGE_SCALE  = 0.33;
const FRAME_PATH   = 'frames/frame_';
const FRAME_PAD    = 4;
const SCROLL_HEIGHT = 900; // vh

// ═══════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════
const scrollContainer = document.getElementById('scroll-container');
const canvasWrap      = document.getElementById('canvas-wrap');
const canvas          = document.getElementById('canvas');
const ctx             = canvas.getContext('2d');
const heroSection     = document.getElementById('hero');
const loader          = document.getElementById('loader');
const loaderBar       = document.getElementById('loader-bar');
const loaderPercent   = document.getElementById('loader-percent');
const darkOverlay     = document.getElementById('dark-overlay');
const marqueeWrap     = document.getElementById('marquee');

const frames = new Array(FRAME_COUNT).fill(null);
let currentFrame = 0;
let bgColor = '#000000';

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function framePath(index) {
  const n = String(index + 1).padStart(FRAME_PAD, '0');
  return `${FRAME_PATH}${n}.webp`;
}

// ═══════════════════════════════════════════════
// CANVAS SETUP
// ═══════════════════════════════════════════════
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
}

setupCanvas();
window.addEventListener('resize', () => {
  setupCanvas();
  drawFrame(currentFrame);
});

// ═══════════════════════════════════════════════
// BACKGROUND SAMPLER
// ═══════════════════════════════════════════════
function sampleBgColor(img) {
  try {
    const off = document.createElement('canvas');
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    off.width  = w;
    off.height = h;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const corners = [
      offCtx.getImageData(0,     0,     1, 1).data,
      offCtx.getImageData(w - 1, 0,     1, 1).data,
      offCtx.getImageData(0,     h - 1, 1, 1).data,
      offCtx.getImageData(w - 1, h - 1, 1, 1).data,
    ];

    const avg = corners
      .reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0])
      .map(v => Math.round(v / 4));

    bgColor = `rgb(${avg[0]},${avg[1]},${avg[2]})`;
  } catch (e) {
    bgColor = '#000000';
  }
}

// ═══════════════════════════════════════════════
// CANVAS RENDERER — PADDED COVER MODE
// ═══════════════════════════════════════════════
function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;

  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.width  / dpr;
  const ch = canvas.height / dpr;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ═══════════════════════════════════════════════
// FRAME PRELOADER — TWO-PHASE
// ═══════════════════════════════════════════════
function preloadFrames() {
  return new Promise((resolve) => {
    let loaded = 0;
    const PRIORITY = Math.min(10, FRAME_COUNT);

    function onLoad(img, index) {
      if (index % 20 === 0) sampleBgColor(img);
      frames[index] = img;
      loaded++;

      const pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + '%';
      loaderPercent.textContent = pct + '%';

      if (index === 0) {
        sampleBgColor(img);
        drawFrame(0);
      }

      if (loaded === FRAME_COUNT) resolve();
    }

    // Phase 1: priority frames
    for (let i = 0; i < PRIORITY; i++) {
      const img = new Image();
      const idx = i;
      img.onload  = () => onLoad(img, idx);
      img.onerror = () => { loaded++; if (loaded === FRAME_COUNT) resolve(); };
      img.src = framePath(i);
    }

    // Phase 2: remaining frames (deferred to avoid blocking first paint)
    setTimeout(() => {
      for (let i = PRIORITY; i < FRAME_COUNT; i++) {
        const img = new Image();
        const idx = i;
        img.onload  = () => onLoad(img, idx);
        img.onerror = () => { loaded++; if (loaded === FRAME_COUNT) resolve(); };
        img.src = framePath(i);
      }
    }, 0);
  });
}

// ═══════════════════════════════════════════════
// HERO ENTRANCE
// ═══════════════════════════════════════════════
function animateHeroIn() {
  const tl = gsap.timeline();
  tl.from('.site-header', {
    y: -30, opacity: 0, duration: 0.7, ease: 'power2.out'
  }, 0)
  .from('.hero-standalone .section-label', {
    y: 16, opacity: 0, duration: 0.6, ease: 'power3.out'
  }, 0.2)
  .from('.hero-heading .word', {
    y: '115%', opacity: 0, duration: 1.1, ease: 'power4.out'
  }, 0.35)
  .from('.hero-tagline', {
    y: 18, opacity: 0, duration: 0.8, ease: 'power3.out'
  }, 0.7)
  .from('.scroll-indicator', {
    opacity: 0, duration: 0.6
  }, 0.9);
}

// ═══════════════════════════════════════════════
// LENIS
// ═══════════════════════════════════════════════
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

// ═══════════════════════════════════════════════
// CIRCLE-WIPE HERO TRANSITION
// ═══════════════════════════════════════════════
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      // Hero fades out quickly as scroll begins
      heroSection.style.opacity = String(Math.max(0, 1 - p * 20));

      // Canvas expands from circle(0%) to circle(85%) over first 6% of scroll
      const raw = (p - 0.01) / 0.06;
      const wipe = Math.min(1, Math.max(0, raw));
      const radius = wipe * 85;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    }
  });
}

// ═══════════════════════════════════════════════
// FRAME-TO-SCROLL BINDING
// ═══════════════════════════════════════════════
function initFrameScrollBinding() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(
        Math.floor(accelerated * FRAME_COUNT),
        FRAME_COUNT - 1
      );
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    }
  });
}

// ═══════════════════════════════════════════════
// SECTION POSITIONING
// ═══════════════════════════════════════════════
function positionSections() {
  const containerHeight = scrollContainer.offsetHeight;
  document.querySelectorAll('.scroll-section').forEach(section => {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave  = parseFloat(section.dataset.leave)  / 100;
    const mid = (enter + leave) / 2;
    section.style.top = (mid * containerHeight) + 'px';
  });
}

// ═══════════════════════════════════════════════
// SECTION ANIMATION SYSTEM
// ═══════════════════════════════════════════════
function initSectionAnimations() {
  document.querySelectorAll('.scroll-section').forEach(section => {
    const type    = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const enter   = parseFloat(section.dataset.enter) / 100;
    const leave   = parseFloat(section.dataset.leave)  / 100;

    const children = Array.from(section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat'
    ));

    if (children.length === 0) return;

    const tl = gsap.timeline({ paused: true });
    const ease = 'power3.out';

    switch (type) {
      case 'slide-left':
        tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease });
        break;
      case 'slide-right':
        tl.from(children, { x: 80,  opacity: 0, stagger: 0.14, duration: 0.9, ease });
        break;
      case 'fade-up':
        tl.from(children, { y: 50,  opacity: 0, stagger: 0.12, duration: 0.9, ease });
        break;
      case 'scale-up':
        tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
        break;
      case 'stagger-up':
        tl.from(children, { y: 60,  opacity: 0, stagger: 0.15, duration: 0.8, ease });
        break;
      case 'clip-reveal':
        tl.from(children, {
          clipPath: 'inset(100% 0 0 0)',
          opacity: 0,
          stagger: 0.15,
          duration: 1.2,
          ease: 'power4.inOut'
        });
        break;
      default:
        tl.from(children, { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease });
    }

    let isVisible = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const p = self.progress;
        const inRange = p >= enter && p < leave;

        if (inRange && !isVisible) {
          isVisible = true;
          section.classList.add('visible');
          tl.play();
        } else if (!inRange && isVisible && !persist) {
          isVisible = false;
          section.classList.remove('visible');
          tl.reverse();
        }
        // Persisted sections (CTA) never reverse once played
      }
    });
  });
}

// ═══════════════════════════════════════════════
// COUNTER ANIMATIONS
// ═══════════════════════════════════════════════
function initCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target   = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || '0');

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2.2,
      ease: 'power1.out',
      onUpdate: () => {
        el.textContent = obj.val.toFixed(decimals);
      },
      scrollTrigger: {
        trigger: el.closest('.scroll-section'),
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

// ═══════════════════════════════════════════════
// MARQUEE
// ═══════════════════════════════════════════════
function initMarquee() {
  const marqueeEl = marqueeWrap.querySelector('.marquee-text');
  const ENTER = 0.44;
  const LEAVE = 0.72;
  const FADE  = 0.03;

  // Horizontal scroll movement
  gsap.to(marqueeEl, {
    xPercent: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });

  // Fade in/out
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= ENTER - FADE && p <= ENTER) {
        opacity = (p - (ENTER - FADE)) / FADE;
      } else if (p > ENTER && p < LEAVE) {
        opacity = 1;
      } else if (p >= LEAVE && p <= LEAVE + FADE) {
        opacity = 1 - (p - LEAVE) / FADE;
      }

      marqueeWrap.style.opacity = String(opacity);
    }
  });
}

// ═══════════════════════════════════════════════
// DARK OVERLAY
// ═══════════════════════════════════════════════
function initDarkOverlay() {
  const statsSection = document.querySelector('[data-overlay-enter]');
  if (!statsSection) return;

  const ENTER  = parseFloat(statsSection.dataset.overlayEnter) / 100;
  const LEAVE  = parseFloat(statsSection.dataset.overlayLeave) / 100;
  const FADE   = 0.03;
  const MAX_OP = 0.90;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= ENTER - FADE && p <= ENTER) {
        opacity = ((p - (ENTER - FADE)) / FADE) * MAX_OP;
      } else if (p > ENTER && p < LEAVE) {
        opacity = MAX_OP;
      } else if (p >= LEAVE && p <= LEAVE + FADE) {
        opacity = MAX_OP * (1 - (p - LEAVE) / FADE);
      }

      darkOverlay.style.opacity = String(opacity);
    }
  });
}

// ═══════════════════════════════════════════════
// HERO WEBGL SHADER
// ═══════════════════════════════════════════════
function initHeroShader() {
  const shaderCanvas = document.getElementById('hero-shader');
  if (!shaderCanvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas: shaderCanvas, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);

  const uniforms = {
    resolution: { value: [window.innerWidth, window.innerHeight] },
    time:       { value: 0.0 },
    xScale:     { value: 1.0 },
    yScale:     { value: 0.5 },
    distortion: { value: 0.05 },
  };

  const vertexShader = `
    attribute vec3 position;
    void main() { gl_Position = vec4(position, 1.0); }
  `;

  const fragmentShader = `
    precision highp float;
    uniform vec2  resolution;
    uniform float time;
    uniform float xScale;
    uniform float yScale;
    uniform float distortion;
    void main() {
      vec2  p  = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
      float d  = length(p) * distortion;
      float rx = p.x * (1.0 + d);
      float gx = p.x;
      float bx = p.x * (1.0 - d);
      float r  = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
      float g  = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
      float b  = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1,-1,0, 1,-1,0, -1,1,0, 1,-1,0, -1,1,0, 1,1,0]), 3
  ));

  const material = new THREE.RawShaderMaterial({
    vertexShader, fragmentShader, uniforms, side: THREE.DoubleSide
  });
  scene.add(new THREE.Mesh(geometry, material));

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.resolution.value = [w, h];
  }
  resize();
  window.addEventListener('resize', resize);

  let rafId = null;
  let running = true;

  function animate() {
    if (!running) return;
    uniforms.time.value += 0.01;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  animate();

  // Fade shader out as scroll begins so hero returns to black before wipe
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      // Shader fades to 0 over the first 4% of scroll — ahead of the hero fade
      shaderCanvas.style.opacity = String(Math.max(0, 1 - p * 25));

      if (p > 0.08 && running) {
        running = false;
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
      }
    }
  });
}

// ═══════════════════════════════════════════════
// MAIN INIT — SEQUENTIAL PIPELINE
// ═══════════════════════════════════════════════
async function init() {
  gsap.registerPlugin(ScrollTrigger);

  // Position sections before any scroll logic runs
  positionSections();

  // Load all frames
  await preloadFrames();

  // Hide loader
  loader.classList.add('hidden');

  // Wait for loader fade to complete
  await new Promise(r => setTimeout(r, 500));

  // Start Lenis (must be before ScrollTrigger animations)
  initLenis();

  // WebGL shader background in hero section
  initHeroShader();

  // Hero entrance
  animateHeroIn();

  // Scroll-driven systems
  initHeroTransition();
  initFrameScrollBinding();
  initSectionAnimations();
  initCounters();
  initMarquee();
  initDarkOverlay();

  // Final refresh — ensures all positions are correct
  ScrollTrigger.refresh();
}

init();
