/**
 * Arshad Rafi - Shared Interactive Engine
 * Modeled after Anthracite Studio Interactive Architecture
 * Strict Cyber-Tactical Brand Identity (#080807, #E8E8E3, #8E8E88, Space Grotesk & JetBrains Mono)
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function isMobileViewport() {
        return window.innerWidth <= 991;
    }

    // Register GSAP plugins if available
    if (window.gsap) {
        if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        if (window.CustomEase) {
            gsap.registerPlugin(CustomEase);
            try {
                CustomEase.create('osmo', 'M0,0 C0.625,0.05 0,1 1,1');
            } catch (e) {}
        }
    }

    // ========================================================
    // 1. LENIS SMOOTH SCROLL ENGINE
    // ========================================================
    let lenis = window.__lenis || null;
    function initLenis() {
        if (window.__lenis) {
            lenis = window.__lenis;
            return;
        }
        if (lenis || prefersReducedMotion || typeof Lenis === 'undefined') return;

        try {
            lenis = new Lenis({
                lerp: 0.165,
                wheelMultiplier: 1.25,
                touchMultiplier: 1,
                smoothWheel: true,
                autoRaf: false,
                respectReducedMotion: true
            });

            if (window.ScrollTrigger) {
                lenis.on('scroll', ScrollTrigger.update);
            }

            if (window.gsap) {
                gsap.ticker.add((time) => {
                    window.__lenis?.raf(time * 1000);
                });
                gsap.ticker.lagSmoothing(0);
            }

            window.__lenis = lenis;
        } catch (err) {
            console.warn('Lenis init failed, using native smooth scroll:', err);
        }
    }

    // ========================================================
    // 2. RETICLE CURSOR FOLLOWER & PRECISION CROSSHAIR
    // ========================================================
    let reticleEl = null;
    let cursorLabelEl = null;
    let mouseX = -9999;
    let mouseY = -9999;
    let vX = window.innerWidth / 2;
    let vY = window.innerHeight / 2;
    let hasPointerMoved = false;

    function stripBodyCursorAttr() {
        if (document.body && document.body.hasAttribute('data-cursor')) {
            document.body.removeAttribute('data-cursor');
        }
        if (document.documentElement && document.documentElement.hasAttribute('data-cursor')) {
            document.documentElement.removeAttribute('data-cursor');
        }
    }

    function initReticleCursor() {
        stripBodyCursorAttr();
        document.body.classList.remove('hover-active');

        reticleEl = document.getElementById('cursor-reticle');
        cursorLabelEl = document.getElementById('cursor-label');
        if (!reticleEl || isMobileViewport() || prefersReducedMotion) {
            if (reticleEl) reticleEl.style.opacity = '0';
            if (cursorLabelEl) cursorLabelEl.style.opacity = '0';
            return;
        }

        if (!hasPointerMoved) {
            reticleEl.style.opacity = '0';
            if (cursorLabelEl) cursorLabelEl.style.opacity = '0';
        }

        if (window.__cursorActive) return;
        window.__cursorActive = true;

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!hasPointerMoved) {
                hasPointerMoved = true;
                vX = mouseX;
                vY = mouseY;
                if (reticleEl) reticleEl.style.opacity = '1';
                if (cursorLabelEl) cursorLabelEl.style.opacity = '';
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            if (reticleEl) reticleEl.style.opacity = '0';
            document.body.classList.remove('hover-active');
        });

        document.addEventListener('mouseenter', () => {
            if (hasPointerMoved && reticleEl) reticleEl.style.opacity = '1';
        });

        if (window.gsap) {
            gsap.ticker.add(() => {
                if (!hasPointerMoved || !reticleEl) return;
                vX += (mouseX - vX) * 0.22;
                vY += (mouseY - vY) * 0.22;
                gsap.set(reticleEl, { x: vX, y: vY });
                if (cursorLabelEl) gsap.set(cursorLabelEl, { x: vX + 24, y: vY + 24 });
            });
        }

        document.addEventListener('mouseover', (e) => {
            const cursorTarget = e.target.closest?.('[data-cursor]:not(body):not(html)');
            if (cursorTarget && hasPointerMoved) {
                document.body.classList.add('hover-active');
                if (cursorLabelEl) {
                    cursorLabelEl.textContent = cursorTarget.getAttribute('data-cursor') || 'VIEW';
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const cursorTarget = e.target.closest?.('[data-cursor]:not(body):not(html)');
            if (cursorTarget) {
                const to = e.relatedTarget ? e.relatedTarget.closest?.('[data-cursor]:not(body):not(html)') : null;
                if (!to) {
                    document.body.classList.remove('hover-active');
                } else if (cursorLabelEl) {
                    cursorLabelEl.textContent = to.getAttribute('data-cursor') || 'VIEW';
                }
            }
        });
    }

    // ========================================================
    // 3. DUAL-SCRAMBLE ENGINE (ZERO JITTER + MONOSPACE SAFE)
    // ========================================================
    const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
    const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const easeQuadInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const getRandomChar = (char) => {
        const set = char === char.toLowerCase() ? LOWERCASE_CHARS : UPPERCASE_CHARS;
        return set[(Math.random() * set.length) | 0];
    };

    const canvasCtx = document.createElement('canvas').getContext('2d');
    const glyphWidthCache = new Map();
    const scrambleCharWidthCache = new Map();
    let lastPointerMoveTime = 0;
    let lastScrollTime = 0;

    function measureScrambleChar(font, isUpper, ch) {
        if (!canvasCtx) return 0;
        const glyph = isUpper ? ch.toUpperCase() : ch;
        const key = `${font}|${glyph}`;
        if (scrambleCharWidthCache.has(key)) return scrambleCharWidthCache.get(key);
        canvasCtx.font = font;
        const w = canvasCtx.measureText(glyph).width;
        scrambleCharWidthCache.set(key, w);
        return w;
    }

    function getGlyphWidthLookup(font, chars, uppercase = false) {
        const key = `${font}|${chars}|${uppercase}`;
        if (glyphWidthCache.has(key)) return glyphWidthCache.get(key);

        const measure = (t) => {
            canvasCtx.font = font;
            return canvasCtx.measureText(uppercase ? t.toUpperCase() : t).width;
        };

        const activeChars = uppercase ? UPPERCASE_CHARS : chars;
        const charMap = [...activeChars].map(c => ({ c, w: measure(c) }));
        const cache = new Map();

        const lookup = (ch) => {
            const cacheKey = uppercase ? ch.toUpperCase() : ch;
            if (cache.has(cacheKey)) return cache.get(cacheKey);
            const w = measure(cacheKey);
            // Match all glyphs within tolerance (prevents monospace from only picking A/B/C)
            const tol = Math.max(2.2, w * 0.25);
            let pool = charMap.filter(e => Math.abs(e.w - w) <= tol && e.c !== cacheKey).map(e => e.c);
            if (!pool.length) {
                pool = [...charMap]
                    .sort((a, b) => Math.abs(a.w - w) - Math.abs(b.w - w))
                    .slice(0, 6)
                    .map(e => e.c)
                    .filter(c => c !== cacheKey);
            }
            const res = pool.length ? pool : [cacheKey];
            cache.set(cacheKey, res);
            return res;
        };

        glyphWidthCache.set(key, lookup);
        return lookup;
    }

    const isWordChar = (c) => /[\p{L}\p{N}]/u.test(c);

    function buildScrambleSpans(el, text, font, isUpper) {
        const container = document.createElement('span');
        container.style.pointerEvents = 'none';
        const spanItems = [];

        for (const chunk of text.split(/(\s+)/)) {
            if (!chunk) continue;
            if (/^\s+$/.test(chunk)) {
                container.appendChild(document.createTextNode(chunk));
                continue;
            }
            const wordSpan = document.createElement('span');
            wordSpan.style.whiteSpace = 'nowrap';
            for (const ch of chunk) {
                const s = document.createElement('span');
                s.textContent = ch;
                s.style.display = 'inline-block';
                s.style.textAlign = 'center';
                const measuredWidth = font ? measureScrambleChar(font, isUpper, ch) : 0;
                if (measuredWidth > 2) {
                    s.style.width = `${measuredWidth.toFixed(2)}px`;
                }
                wordSpan.appendChild(s);
                spanItems.push({
                    el: s,
                    ch,
                    scramblable: isWordChar(ch),
                    shown: ch,
                    cls: ''
                });
            }
            container.appendChild(wordSpan);
        }
        el.textContent = '';
        el.appendChild(container);
        return spanItems;
    }

    function scrambleText(target, duration = 0.42) {
        if (!target) return;

        // Capture clean original text only if not mid-scramble
        if (!target.dataset.originalText && !target.querySelector('.dual-scramble-color-1, .dual-scramble-color-2')) {
            target.dataset.originalText = target.textContent.trim();
        }
        const original = target.dataset.originalText || target.textContent.trim();
        if (!original) return;

        // Bump generation token to invalidate any in-flight RAF or timer immediately
        const gen = (target.__scrambleGen = (target.__scrambleGen || 0) + 1);
        if (target.__scrambleRaf) cancelAnimationFrame(target.__scrambleRaf);
        if (target.__scrambleFallback) clearTimeout(target.__scrambleFallback);

        if (prefersReducedMotion || target.offsetParent === null) {
            target.textContent = original;
            return;
        }

        const cs = window.getComputedStyle(target);
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const isUpper = cs.textTransform === 'uppercase';
        const lookup = getGlyphWidthLookup(font, LOWERCASE_CHARS + UPPERCASE_CHARS, isUpper);
        const spans = buildScrambleSpans(target, original, font, isUpper);
        const scramblableCount = spans.filter(s => s.scramblable).length;
        const charDelay = scramblableCount > 0 ? Math.min(0.18, duration / Math.max(1, scramblableCount) * 2) : 0;
        const totalTime = charDelay + duration;
        let lastTime = -Infinity;
        const startTime = performance.now();

        const tick = (now) => {
            if (target.__scrambleGen !== gen) return;

            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(1, Math.max(0, (elapsed - charDelay) / duration));
            const resolvedIdx = Math.floor(progress * spans.length);
            const shouldUpdate = now - lastTime >= 36;
            if (shouldUpdate) lastTime = now;

            spans.forEach((item, idx) => {
                const isResolved = idx < resolvedIdx || !item.scramblable;
                const cls = isResolved ? 'dual-scramble-color-2' : 'dual-scramble-color-1';
                if (item.cls !== cls) {
                    item.el.className = cls;
                    item.cls = cls;
                }
                let glyph = item.ch;
                if (!isResolved) {
                    if (!shouldUpdate) return;
                    const choices = lookup(item.ch);
                    glyph = choices[(Math.random() * choices.length) | 0];
                }
                if (item.shown !== glyph) {
                    item.el.textContent = glyph;
                    item.shown = glyph;
                }
            });

            if (elapsed < totalTime) {
                target.__scrambleRaf = requestAnimationFrame(tick);
            } else if (target.__scrambleGen === gen) {
                target.__scrambleRaf = null;
                clearTimeout(target.__scrambleFallback);
                target.textContent = target.dataset.originalText || original;
            }
        };

        target.__scrambleRaf = requestAnimationFrame(tick);
        // Deterministic safety net so a title NEVER stays frozen on scrambled glyphs
        target.__scrambleFallback = setTimeout(() => {
            if (target.__scrambleGen === gen) {
                if (target.__scrambleRaf) cancelAnimationFrame(target.__scrambleRaf);
                target.__scrambleRaf = null;
                target.textContent = target.dataset.originalText || original;
            }
        }, Math.ceil((totalTime + 0.08) * 1000));
    }
    window.scrambleText = scrambleText;

    function findScrambleTarget(parent) {
        const target = parent.querySelector('[data-scramble-target]');
        if (target) return target;
        if (!parent.children.length) return parent.textContent.trim() ? parent : null;
        const leaves = [...parent.querySelectorAll('*')].filter(el => !el.children.length && el.textContent.trim() && !el.closest('svg'));
        return leaves.length === 1 ? leaves[0] : null;
    }

    function handleScrambleTrigger(e) {
        if (e.type === 'mouseenter') {
            if (window.__isTransitionCovering) return;
            const now = performance.now();
            // Skip hover scrambles caused by content scrolling beneath a stationary cursor
            if (now - lastScrollTime < 220 && now - lastPointerMoveTime > 120) return;
            if (e.relatedTarget === null && now - lastPointerMoveTime > 150) return;
        }
        const btn = e.target.closest?.('a, button, [data-scramble], .menu-btn, .awards__item, .logo-wall__logo, .site-footer__tag, .hs__btn, .home-hero__btn-email, .home-hero__link-projects, .bottom-nav__link, .faq-row__link, .cta-pill');
        if (!btn || btn.closest('[data-no-scramble]')) return;
        if (e.type === 'mouseenter' && e.relatedTarget && btn.contains(e.relatedTarget)) return;
        const target = findScrambleTarget(btn);
        if (target) {
            scrambleText(target, 0.38);
        }
    }

    if (!window.__scrambleListenersBound) {
        window.__scrambleListenersBound = true;
        window.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch') lastPointerMoveTime = performance.now();
        }, { passive: true });
        const markScrollActivity = () => {
            lastScrollTime = performance.now();
        };
        window.addEventListener('scroll', markScrollActivity, { passive: true });
        window.addEventListener('wheel', markScrollActivity, { passive: true });
        window.addEventListener('touchmove', markScrollActivity, { passive: true });
        document.addEventListener('mouseenter', handleScrambleTrigger, true);
        document.addEventListener('focusin', (e) => {
            if (e.target.matches?.(':focus-visible')) handleScrambleTrigger(e);
        }, true);
        document.addEventListener('touchstart', handleScrambleTrigger, { passive: true });
        document.addEventListener('pointerdown', handleScrambleTrigger, { passive: true });
    }

    // ========================================================
    // 4. PRELOADER & PAGE TRANSITION SWEEP ENGINE
    // ========================================================
    const TRANSITION_CONFIG = {
        fadeOut: 0.40,
        overlap: 0.12,
        cadence: 0.40,
        write: 0.36,
        erase: 0.26,
        fadeIn: 0.45
    };

    const INITIAL_LOAD_CONFIG = {
        speed: 1.15,
        fadeIn: 0.65,
        maxWait: 1400
    };

    let sweepLineInstances = [];
    let pendingSweepTimers = [];

    function setCharPhase(item, phase) {
        if (item.phase !== phase) {
            item.phase = phase;
            item.el.className = `sweep-char ${phase}`;
        }
    }

    function runSweepAnimation(durationSec, onUpdate, easeFn = (t) => t) {
        let rafId;
        let stopped = false;
        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
            const startTime = performance.now();
            const loop = (now) => {
                if (stopped) return resolve();
                const progress = Math.min(1, (now - startTime) / (durationSec * 1000));
                onUpdate(easeFn(progress));
                if (progress < 1) {
                    rafId = requestAnimationFrame(loop);
                } else {
                    resolve();
                }
            };
            rafId = requestAnimationFrame(loop);
        });
        return {
            promise,
            stop: () => {
                stopped = true;
                cancelAnimationFrame(rafId);
                resolvePromise?.();
            }
        };
    }

    function initSweepText(el, { band = 70, glyphEvery = 40 } = {}) {
        const text = el.dataset.sweepText ?? el.textContent.trim();
        el.dataset.sweepText = text;
        el.textContent = '';
        const chars = [...text].map((ch) => {
            const span = document.createElement('span');
            span.textContent = ch;
            el.appendChild(span);
            return { el: span, text: ch, space: /\s/.test(ch), phase: '' };
        });
        const parentLeft = el.getBoundingClientRect().left;
        chars.forEach((c) => {
            const rect = c.el.getBoundingClientRect();
            c.w = rect.width > 1 ? rect.width : 10;
            c.x = rect.left - parentLeft;
        });
        chars.forEach((c) => {
            c.el.style.display = 'inline-block';
            c.el.style.width = `${c.w}px`;
            c.el.style.textAlign = 'center';
            c.el.style.whiteSpace = 'pre';
        });
        const state = {
            el,
            chars,
            width: Math.max(1, ...chars.map((c) => c.x + c.w)),
            band,
            glyphEvery,
            anim: null
        };
        resetSweepToHidden(state);
        return state;
    }

    function resetSweepToHidden(state) {
        state.anim?.stop();
        state.chars.forEach((c) => {
            setCharPhase(c, 'is-hidden');
            c.el.textContent = c.text;
        });
    }

    function animateSweepWrite(state, { duration = 0.38 } = {}) {
        state.anim?.stop();
        let lastGlyphStep = -1;
        state.anim = runSweepAnimation(duration, (t) => {
            const currentGlyphStep = Math.floor(performance.now() / state.glyphEvery);
            const bandLeadX = t * (state.width + state.band);
            for (const char of state.chars) {
                if (char.space) {
                    setCharPhase(char, 'is-final');
                    continue;
                }
                if (char.x + char.w <= bandLeadX - state.band) {
                    setCharPhase(char, 'is-final');
                    if (char.el.textContent !== char.text) char.el.textContent = char.text;
                } else if (bandLeadX > 0 && char.x < bandLeadX) {
                    setCharPhase(char, 'is-band');
                    if (currentGlyphStep !== lastGlyphStep) {
                        char.el.textContent = getRandomChar(char.text);
                    }
                } else {
                    setCharPhase(char, 'is-hidden');
                }
            }
            lastGlyphStep = currentGlyphStep;
            if (t === 1) {
                state.chars.forEach((c) => {
                    setCharPhase(c, 'is-final');
                    c.el.textContent = c.text;
                });
            }
        }, easeQuadInOut);
        return state.anim.promise;
    }

    function animateSweepErase(state, { duration = 0.28 } = {}) {
        state.anim?.stop();
        const total = Math.max(1, state.chars.length - 1);
        state.chars.forEach((char, idx) => {
            char.start = ((total - idx) / total) * 0.55 + Math.random() * 0.25;
            char.end = Math.min(1, char.start + 0.15 + Math.random() * 0.15);
        });
        let lastGlyphStep = -1;
        state.anim = runSweepAnimation(duration, (t) => {
            const currentGlyphStep = Math.floor(performance.now() / state.glyphEvery);
            for (const char of state.chars) {
                if (t >= char.end) {
                    setCharPhase(char, 'is-hidden');
                } else if (t >= char.start && !char.space) {
                    setCharPhase(char, 'is-band');
                    if (currentGlyphStep !== lastGlyphStep) {
                        char.el.textContent = getRandomChar(char.text);
                    }
                }
            }
            lastGlyphStep = currentGlyphStep;
            if (t === 1) resetSweepToHidden(state);
        });
        return state.anim.promise;
    }

    function prepareSweepLines() {
        const overlay = document.querySelector('[data-page-transition]');
        if (overlay && !sweepLineInstances.length) {
            sweepLineInstances = [...overlay.querySelectorAll('[data-page-transition-line]')].map(el => initSweepText(el));
        }
    }
    window.prepareSweepLines = prepareSweepLines;

    function resetSweepOverlay() {
        clearPendingSweepTimers();
        sweepLineInstances.forEach(line => {
            resetSweepToHidden(line);
            line.el.style.opacity = '';
        });
        revealVisibleNow();
    }
    window.resetSweepOverlay = resetSweepOverlay;

    function resetHeroToRestState() {
        const heroInnerEl = document.querySelector('.home-hero__inner');
        if (heroInnerEl) {
            heroInnerEl.style.opacity = '1';
            heroInnerEl.style.transform = 'translateY(0px)';
            heroInnerEl.style.visibility = 'visible';
        }
        if (window.__handsField) {
            window.__handsField.open = 0;
            window.__handsField.rise = 0;
            window.__handsField.contact = 0;
            window.__handsField.wave = 0;
            if (window.__isTransitionCovering) {
                if (typeof window.__handsField.resetIntro === 'function') {
                    window.__handsField.resetIntro();
                } else {
                    window.__handsField.t0 = null;
                    window.__handsField.draw?.(0, true);
                }
            } else if (typeof window.__handsField.startIntro === 'function') {
                window.__handsField.startIntro();
            }
        }
    }
    window.resetHeroToRestState = resetHeroToRestState;

    let lastForceScrollZeroAt = 0;
    function forceScrollTopZero() {
        const now = performance.now();
        if (now - lastForceScrollZeroAt < 16 && (window.scrollY || 0) === 0 && (document.documentElement.scrollTop || 0) === 0) {
            return;
        }
        lastForceScrollZeroAt = now;
        const htmlEl = document.documentElement;
        const prevBehavior = htmlEl.style.scrollBehavior;
        htmlEl.style.scrollBehavior = 'auto';

        if (window.ScrollTrigger && typeof ScrollTrigger.clearScrollMemory === 'function') {
            try {
                ScrollTrigger.clearScrollMemory('manual');
            } catch (e) {}
        }

        if (window.__lenis) {
            try {
                window.__lenis.stop();
                window.__lenis.scrollTo(0, { immediate: true, force: true });
            } catch (e) {}
        }

        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch (e) {
            window.scrollTo(0, 0);
        }
        htmlEl.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;

        if (window.__lenis) {
            try {
                if (typeof window.__lenis.resize === 'function') window.__lenis.resize();
                window.__lenis.start();
                window.__lenis.scrollTo(0, { immediate: true, force: true });
            } catch (e) {}
        }

        resetHeroToRestState();

        if (window.ScrollTrigger && typeof ScrollTrigger.update === 'function') {
            try {
                ScrollTrigger.update();
            } catch (e) {}
        }

        htmlEl.style.scrollBehavior = prevBehavior;
    }
    window.forceScrollTopZero = forceScrollTopZero;

    function clearPendingSweepTimers() {
        pendingSweepTimers.forEach(t => t?.kill?.());
        pendingSweepTimers = [];
    }

    function playSweepSequence(speedFactor = 1) {
        prepareSweepLines();
        clearPendingSweepTimers();
        if (!window.gsap) return 0.4;
        const cadence = TRANSITION_CONFIG.cadence * speedFactor;
        const writeTime = TRANSITION_CONFIG.write * speedFactor;
        const eraseTime = TRANSITION_CONFIG.erase * speedFactor;

        sweepLineInstances.forEach((line, idx) => {
            pendingSweepTimers.push(
                gsap.delayedCall(idx * cadence, () => {
                    line.el.style.opacity = '1';
                    animateSweepWrite(line, { duration: writeTime });
                })
            );
            pendingSweepTimers.push(
                gsap.delayedCall((idx + 2) * cadence, () => {
                    animateSweepErase(line, { duration: eraseTime });
                })
            );
        });
        return (sweepLineInstances.length + 1) * cadence + eraseTime;
    }
    window.playSweepSequence = playSweepSequence;

    async function runInitialHomeLoader() {
        if (window.__homeLoaderRan) return;
        window.__homeLoaderRan = true;

        const overlay = document.querySelector('[data-page-transition]');
        if (!overlay || prefersReducedMotion || !window.gsap) {
            document.documentElement.classList.remove('is-loading');
            return;
        }
        if (window.__lenis) window.__lenis.stop();
        window.__isTransitionCovering = true;
        document.documentElement.classList.add('is-page-transition');
        overlay.classList.add('is-on');
        gsap.set(overlay, { opacity: 1 });
        document.documentElement.classList.remove('is-loading');

        try {
            await document.fonts.ready;
        } catch (e) {}

        prepareSweepLines();
        const totalSweepSec = playSweepSequence(INITIAL_LOAD_CONFIG.speed);

        const loadPromise = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise(r => window.addEventListener('load', r, { once: true }));

        await Promise.all([
            new Promise(r => setTimeout(r, totalSweepSec * 1000)),
            Promise.race([loadPromise, new Promise(r => setTimeout(r, INITIAL_LOAD_CONFIG.maxWait))])
        ]);

        if (window.__lenis) window.__lenis.start();
        gsap.to(overlay, {
            opacity: 0,
            duration: INITIAL_LOAD_CONFIG.fadeIn,
            ease: 'power2.out',
            onStart: () => {
                window.__isTransitionCovering = false;
                if (typeof window.resetRevealsForHome === 'function') {
                    window.resetRevealsForHome();
                }
                if (window.__handsField && typeof window.__handsField.startIntro === 'function') {
                    window.__handsField.startIntro();
                }
            },
            onComplete: () => {
                window.__isTransitionCovering = false;
                overlay.classList.remove('is-on');
                clearPendingSweepTimers();
                sweepLineInstances.forEach(line => {
                    resetSweepToHidden(line);
                    line.el.style.opacity = '';
                });
                document.documentElement.classList.remove('is-page-transition');
                revealVisibleNow();
            }
        });
    }

    async function triggerPageTransition(targetElementOrFn, onMidpointCallback) {
        if (window.isNavigating) return;
        const overlay = document.querySelector('[data-page-transition]');
        const isHeroOrTopTarget = (el) => (
            el === 0 ||
            el === document.getElementById('hero') ||
            el === document.getElementById('main') ||
            (el && (el.id === 'hero' || el.id === 'main' || Boolean(el.closest?.('#hero'))))
        );

        if (!overlay || prefersReducedMotion || !window.gsap) {
            if (typeof targetElementOrFn === 'function') targetElementOrFn();
            else if (targetElementOrFn !== undefined && targetElementOrFn !== null) {
                if (isHeroOrTopTarget(targetElementOrFn)) {
                    forceScrollTopZero();
                    if (typeof onMidpointCallback === 'function') onMidpointCallback();
                    resetRevealsForHome();
                } else {
                    armSectionReveal(targetElementOrFn);
                    if (typeof onMidpointCallback === 'function') onMidpointCallback();
                    if (window.__lenis) window.__lenis.scrollTo(targetElementOrFn, { offset: -80 });
                    else targetElementOrFn.scrollIntoView({ behavior: 'smooth' });
                }
            }
            return;
        }

        window.isNavigating = true;
        if (isHeroOrTopTarget(targetElementOrFn) && window.__lenis) {
            try { window.__lenis.stop(); } catch (e) {}
        }
        if (typeof window.closeBottomNav === 'function') {
            window.closeBottomNav();
        } else {
            const nav = document.querySelector('[data-bottom-nav-init]');
            if (nav?.getAttribute('data-bottom-nav-open') === 'true') {
                nav.querySelector('[data-bottom-nav-toggle]')?.click();
            }
        }

        prepareSweepLines();
        document.documentElement.classList.add('is-page-transition');
        overlay.classList.add('is-on');
        gsap.killTweensOf(overlay);

        await gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.in' });
        window.__isTransitionCovering = true;
        const durationSec = playSweepSequence(1.0);

        if (typeof targetElementOrFn === 'function') {
            targetElementOrFn();
            if (typeof onMidpointCallback === 'function') onMidpointCallback();
        } else if (targetElementOrFn !== undefined && targetElementOrFn !== null) {
            if (isHeroOrTopTarget(targetElementOrFn)) {
                forceScrollTopZero();
                if (typeof onMidpointCallback === 'function') onMidpointCallback();
            } else {
                if (window.__lenis) {
                    window.__lenis.scrollTo(targetElementOrFn, { immediate: true, force: true, offset: -80 });
                } else {
                    targetElementOrFn.scrollIntoView({ behavior: 'instant' });
                }
                if (typeof onMidpointCallback === 'function') onMidpointCallback();
            }
        } else if (typeof onMidpointCallback === 'function') {
            onMidpointCallback();
        }

        await new Promise(r => setTimeout(r, Math.max(0, durationSec - TRANSITION_CONFIG.erase) * 1000));

        gsap.to(overlay, {
            opacity: 0,
            duration: TRANSITION_CONFIG.fadeIn,
            ease: 'power2.out',
            onStart: () => {
                window.__isTransitionCovering = false;
                if (isHeroOrTopTarget(targetElementOrFn)) {
                    forceScrollTopZero();
                    if (typeof onMidpointCallback === 'function') onMidpointCallback();
                    resetRevealsForHome();
                    if (window.__handsField && typeof window.__handsField.startIntro === 'function') {
                        window.__handsField.startIntro();
                    }
                } else if (targetElementOrFn && targetElementOrFn.nodeType === Node.ELEMENT_NODE) {
                    armSectionReveal(targetElementOrFn);
                }
            },
            onComplete: () => {
                window.__isTransitionCovering = false;
                if (isHeroOrTopTarget(targetElementOrFn)) {
                    forceScrollTopZero();
                }
                overlay.classList.remove('is-on');
                resetSweepOverlay();
                document.documentElement.classList.remove('is-page-transition');
                window.isNavigating = false;
            }
        });
    }
    window.triggerPageTransition = triggerPageTransition;

    // ========================================================
    // 5. TITLE WIPE BAR REVEAL & REPLAY SYSTEM
    // ========================================================
    function computeRevealBars(root = document) {
        if (!root) return;
        const targets = [];
        if (root.classList && root.classList.contains('reveal__text')) {
            targets.push(root);
        } else if (root.querySelectorAll) {
            targets.push(...root.querySelectorAll('.reveal__text'));
        }
        if (!targets.length) return;

        // Pass 1: batch all layout and computed-style reads before any style writes
        const measurements = targets.map(e => {
            const t = e.getBoundingClientRect();
            const mark = t.height > 0 ? e.querySelector('mark') : null;
            if (!mark) return { e, t, mark: null, m: null, cs: null };
            return {
                e,
                t,
                mark,
                m: mark.getBoundingClientRect(),
                cs: window.getComputedStyle(mark)
            };
        });

        const parseEmOrPx = (val, fallbackEm, fs) => {
            const raw = (val || '').trim();
            if (!raw) return fallbackEm * fs;
            if (raw.endsWith('em')) return parseFloat(raw) * fs;
            if (raw.endsWith('px')) return parseFloat(raw);
            const num = parseFloat(raw);
            return Number.isFinite(num) ? num * fs : fallbackEm * fs;
        };

        // Pass 2: apply CSS custom property writes without interleaved DOM reads
        measurements.forEach(({ e, t, mark, m, cs }) => {
            if (t.height <= 0) {
                e.style.setProperty('--bar-top', '0px');
                e.style.setProperty('--bar-bottom', '0px');
                return;
            }
            if (mark && m && cs) {
                const fs = parseFloat(cs.fontSize) || t.height;
                const topOffset = parseEmOrPx(cs.getPropertyValue('--mark-top'), 0.12, fs);
                const barHeight = parseEmOrPx(cs.getPropertyValue('--mark-height'), 0.96, fs);
                const markBgTop = m.top + topOffset;
                const markBgBottom = markBgTop + barHeight;
                e.style.setProperty('--bar-top', `${(markBgTop - t.top).toFixed(2)}px`);
                e.style.setProperty('--bar-bottom', `${(t.bottom - markBgBottom).toFixed(2)}px`);
                return;
            }
            e.style.setProperty('--bar-top', '0px');
            e.style.setProperty('--bar-bottom', '0px');
        });
    }
    window.computeRevealBars = computeRevealBars;

    function scheduleRevealDone(el) {
        if (el.__revealTimer) clearTimeout(el.__revealTimer);
        const style = getComputedStyle(el);
        const delay = parseFloat(style.getPropertyValue('--reveal-delay')) || 0;
        const duration = parseFloat(style.getPropertyValue('--reveal-duration')) || 1.2;
        const lineCount = el.querySelectorAll('.reveal__line').length || 1;
        const totalSec = delay + duration + 0.08 * (lineCount - 1);
        el.__revealTimer = setTimeout(() => {
            el.classList.add('reveal--done');
        }, totalSec * 1000 + 80);

        if (!el.__hasAnimEnd) {
            el.__hasAnimEnd = true;
            el.addEventListener('animationend', (e) => {
                if (e.animationName === 'reveal-bar') {
                    el.classList.add('reveal--done');
                }
            }, { passive: true });
        }
    }

    function triggerRevealElement(el) {
        if (!el || el.classList.contains('is-revealed')) return;
        computeRevealBars(el);
        el.classList.add('is-revealed');
        scheduleRevealDone(el);
    }

    function resetSingleReveal(el, skipReflow = false) {
        if (!el) return;
        if (el.__revealTimer) {
            clearTimeout(el.__revealTimer);
            el.__revealTimer = null;
        }
        el.classList.remove('is-revealed', 'reveal--done');
        if (!skipReflow) {
            computeRevealBars(el);
            void el.offsetWidth;
        }
    }

    let revealObserver = null;
    function getRevealObserver() {
        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (document.documentElement.classList.contains('is-loading') || window.__isTransitionCovering) return;
                        triggerRevealElement(entry.target);
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.01, rootMargin: '0px 0px -10px 0px' });
        }
        return revealObserver;
    }

    function revealVisibleNow() {
        if (document.documentElement.classList.contains('is-loading') || window.__isTransitionCovering) return;
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const obs = getRevealObserver();
        const candidates = Array.from(document.querySelectorAll('.reveal:not(.is-revealed)'));
        const toReveal = candidates.filter(el => {
            const rect = el.getBoundingClientRect();
            const inHero = Boolean(el.closest('.page-hero, .home-hero-pin, .contact__hero'));
            return inHero || (rect.top < vh * 0.96 && rect.bottom > -20);
        });
        toReveal.forEach(el => {
            triggerRevealElement(el);
            obs.unobserve(el);
        });
    }

    window.computeRevealBars = computeRevealBars;
    window.revealVisibleNow = revealVisibleNow;

    let extraObservers = [];
    function cleanupExtraObservers() {
        extraObservers.forEach(o => o.disconnect());
        extraObservers = [];
    }

    function initScrollReveals() {
        const obs = getRevealObserver();
        obs.disconnect();
        cleanupExtraObservers();

        const reveals = Array.from(document.querySelectorAll('.reveal'));
        reveals.forEach(el => {
            if (!el.classList.contains('reveal--done')) {
                resetSingleReveal(el, true);
            }
        });
        computeRevealBars();
        reveals.forEach(el => {
            if (!el.classList.contains('reveal--done')) {
                obs.observe(el);
            }
        });

        requestAnimationFrame(revealVisibleNow);

        const hsGridEl = document.querySelector('[data-hs-grid]');
        if (hsGridEl) {
            const checkHs = () => {
                const r = hsGridEl.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
                    hsGridEl.classList.add('is-in');
                }
            };
            const hsObs = new IntersectionObserver(([entry]) => {
                if (entry && entry.isIntersecting) {
                    hsGridEl.classList.add('is-in');
                    hsObs.unobserve(hsGridEl);
                }
            }, { threshold: 0.08 });
            hsObs.observe(hsGridEl);
            extraObservers.push(hsObs);
            requestAnimationFrame(checkHs);
        }

        const awardsGroupEl = document.querySelector('[data-awards-list]');
        if (awardsGroupEl) {
            const checkAwards = () => {
                const r = awardsGroupEl.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
                    awardsGroupEl.classList.add('is-in');
                }
            };
            const awardsObs = new IntersectionObserver(([entry]) => {
                if (entry && entry.isIntersecting) {
                    awardsGroupEl.classList.add('is-in');
                    awardsObs.unobserve(awardsGroupEl);
                }
            }, { threshold: 0.08 });
            awardsObs.observe(awardsGroupEl);
            extraObservers.push(awardsObs);
            requestAnimationFrame(checkAwards);
        }
    }
    window.initScrollReveals = initScrollReveals;

    function resetRevealsForHome() {
        document.querySelectorAll('.reveal').forEach(el => resetSingleReveal(el, true));
        const hsGridEl = document.querySelector('[data-hs-grid]');
        if (hsGridEl) hsGridEl.classList.remove('is-in');
        const awardsGroupEl = document.querySelector('[data-awards-list]');
        if (awardsGroupEl) awardsGroupEl.classList.remove('is-in');
        initScrollReveals();
    }
    window.resetRevealsForHome = resetRevealsForHome;

    function armSectionReveal(target) {
        if (!target) return;
        const section = target.nodeType === Node.ELEMENT_NODE ? (target.closest('section') || target) : null;
        if (!section) return;
        const obs = getRevealObserver();
        const reveals = section.querySelectorAll ? Array.from(section.querySelectorAll('.reveal')) : [];
        if (section.classList?.contains('reveal')) reveals.push(section);
        reveals.forEach(el => {
            resetSingleReveal(el, true);
            obs.observe(el);
        });
        computeRevealBars(section);
        setTimeout(revealVisibleNow, 80);
    }
    window.armSectionReveal = armSectionReveal;

    if (!window.__revealScrollBound) {
        window.__revealScrollBound = true;
        window.addEventListener('resize', () => computeRevealBars(), { passive: true });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                computeRevealBars();
                revealVisibleNow();
            });
        }
    }

    // ========================================================
    // 6. MORPHING BOTTOM NAVBAR & SECTION SCROLL CONTROLLER
    // ========================================================
    let navInitialized = false;
    let centerObserver = null;
    let closeNavFn = null;

    function initAnthraciteNav(routePath) {
        const nav = document.getElementById('bottom-nav');
        if (!nav) return;

        const inner = nav.querySelector('[data-bottom-nav-inner]');
        const bar = nav.querySelector('[data-bottom-nav-bar]');
        const panel = nav.querySelector('[data-bottom-nav-panel]');
        const toggle = nav.querySelector('[data-bottom-nav-toggle]');
        const title = document.getElementById('nav-section-title');
        if (!inner || !bar || !panel || !toggle) return;

        const revealItems = panel.querySelectorAll('[data-bottom-nav-reveal]');
        const barTop = toggle.querySelector('.bottom-nav__toggle-bar.is--top');
        const barBtm = toggle.querySelector('.bottom-nav__toggle-bar.is--btm');
        const divider = nav.querySelector('[data-bottom-nav-divider]');
        const navEase = window.CustomEase ? 'osmo' : 'power3.inOut';

        let isOpen = nav.getAttribute('data-bottom-nav-open') === 'true';

        function setOpenState(state) {
            isOpen = state;
            nav.setAttribute('data-bottom-nav-open', String(state));
            toggle.setAttribute('aria-expanded', String(state));
            toggle.setAttribute('aria-label', state ? (toggle.dataset.labelClose || 'Close menu') : (toggle.dataset.labelOpen || 'Open menu'));
            panel.setAttribute('aria-hidden', String(!state));
            if (!state) inner.scrollTop = 0;
        }

        function openNav() {
            setOpenState(true);
            panel.style.visibility = 'hidden';
            panel.style.display = 'flex';
            panel.style.opacity = '1';
            const openH = (bar.offsetHeight || 50) + panel.scrollHeight;
            panel.style.visibility = '';
            panel.style.display = '';
            panel.style.opacity = '';

            if (window.gsap) {
                gsap.killTweensOf([inner, barTop, barBtm, revealItems, divider, panel]);
                const tl = gsap.timeline({ defaults: { ease: navEase } });
                tl.to(inner, { height: openH, duration: 0.65, ease: navEase }, 0)
                  .to(barTop, { y: 3.5, rotation: 45, duration: 0.4, ease: 'back.out(2)' }, 0.05)
                  .to(barBtm, { y: -3.5, rotation: -45, duration: 0.4, ease: 'back.out(2)' }, 0.05)
                  .set(panel, { autoAlpha: 1 }, 0.08)
                  .fromTo(revealItems, { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: 0.55, stagger: 0.03, ease: 'power3.out' }, 0.1);

                if (divider) {
                    tl.fromTo(divider, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.7, ease: navEase }, 0.06);
                }
            } else {
                inner.style.height = openH + 'px';
                panel.style.opacity = '1';
                panel.style.visibility = 'visible';
            }
        }

        function closeNav() {
            if (nav.getAttribute('data-bottom-nav-open') !== 'true' && !isOpen) return;
            setOpenState(false);
            if (window.gsap) {
                gsap.killTweensOf([inner, barTop, barBtm, revealItems, divider, panel]);
                const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
                tl.to(revealItems, { opacity: 0, yPercent: 15, duration: 0.2, stagger: { each: 0.015, from: 'end' }, ease: 'power2.in' }, 0)
                  .to(inner, { height: bar.offsetHeight || 50, duration: 0.45, ease: 'power3.inOut' }, 0.06)
                  .to([barTop, barBtm], { y: 0, rotation: 0, duration: 0.3, ease: 'power3.in' }, 0.06)
                  .set(panel, { autoAlpha: 0 });
            } else {
                inner.style.height = (bar.offsetHeight || 50) + 'px';
                panel.style.opacity = '0';
                panel.style.visibility = 'hidden';
            }
        }

        if (!navInitialized) {
            navInitialized = true;
            closeNavFn = closeNav;
            window.closeBottomNav = closeNav;
            if (window.gsap) {
                gsap.set(inner, { height: bar.offsetHeight || 50 });
                gsap.set(panel, { autoAlpha: 0 });
            }

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                isOpen ? closeNav() : openNav();
            });

            nav.querySelectorAll('.bottom-nav__link, .menu-btn, .bottom-nav__logo').forEach(link => {
                link.addEventListener('click', () => {
                    closeNav();
                });
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isOpen) {
                    closeNav();
                    toggle.focus();
                }
            });

            document.addEventListener('pointerdown', (e) => {
                if (isOpen && !nav.contains(e.target)) {
                    closeNav();
                }
            });

            let navResizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(navResizeTimer);
                navResizeTimer = setTimeout(() => {
                    if (isOpen) {
                        panel.style.visibility = 'hidden';
                        panel.style.display = 'flex';
                        panel.style.opacity = '1';
                        const openH = (bar.offsetHeight || 50) + panel.scrollHeight;
                        panel.style.visibility = '';
                        panel.style.display = '';
                        panel.style.opacity = '';
                        if (window.gsap) gsap.set(inner, { height: openH });
                    } else if (window.gsap) {
                        gsap.set(inner, { height: bar.offsetHeight || 50 });
                    }
                }, 150);
            });
        }

        // Route default header label inference
        if (title) {
            const rawPath = (typeof routePath === 'string' && routePath) ? routePath : window.location.pathname;
            const cleanPath = rawPath.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
            const routeTitles = {
                '/': 'ARSHAD RAFI',
                '/services': 'SERVICES',
                '/about': 'ABOUT',
                '/projects': 'PROJECTS',
                '/contact': 'CONTACT',
                '/faq': 'FAQ',
                '/news': 'RESEARCH',
                '/projects/mnemosyne': 'MNEMOSYNE',
                '/projects/kage-agent': 'KAGE AGENT',
                '/projects/neuromesh': 'NEUROMESH',
                '/projects/gesture-gaming': 'GESTURE GAMING'
            };
            const defaultRouteTitle = routeTitles[cleanPath] || title.dataset.defaultText || 'ARSHAD RAFI';
            title.dataset.defaultText = defaultRouteTitle;
            title.dataset.current = defaultRouteTitle;
            title.dataset.originalText = defaultRouteTitle;
            title.textContent = defaultRouteTitle;

            if (centerObserver) centerObserver.disconnect();
            const sections = document.querySelectorAll('[data-txt]');
            if (sections.length) {
                const intersectingSections = new Set();
                const navLinks = nav.querySelectorAll('.bottom-nav__link');

                const updateCurrentSection = (sec) => {
                    const txt = (sec ? sec.getAttribute('data-txt') : defaultRouteTitle) || defaultRouteTitle;
                    const upperTxt = txt.toUpperCase();
                    if (title.dataset.current !== upperTxt) {
                        title.dataset.current = upperTxt;
                        title.dataset.originalText = upperTxt;
                        scrambleText(title, 0.34);
                    }
                    if (sec && cleanPath === '/') {
                        const secId = '#' + sec.id;
                        navLinks.forEach(nl => {
                            if (nl.getAttribute('href') === secId) {
                                nl.setAttribute('aria-current', 'page');
                            } else if (nl.getAttribute('href')?.startsWith('#')) {
                                nl.removeAttribute('aria-current');
                            }
                        });
                    }
                };

                centerObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            intersectingSections.add(entry.target);
                        } else {
                            intersectingSections.delete(entry.target);
                        }
                    });
                    const currentSec = [...intersectingSections].pop();
                    updateCurrentSection(currentSec);
                }, {
                    rootMargin: '-50% 0px -50% 0px',
                    threshold: 0
                });

                sections.forEach(s => centerObserver.observe(s));
            }
        }
    }
    window.initAnthraciteNav = initAnthraciteNav;

    // ========================================================
    // 7. PIXEL-FRAME IMAGE REVEAL ENGINE
    // ========================================================
    const INITIAL_PIXEL_SIZE = 48;
    const PIXEL_DURATION_MS = 1400;
    const pixelEaseOutCubic = t => 1 - Math.pow(1 - t, 3);

    class PixelReveal {
        constructor(root) {
            if (root.__pixelReveal) {
                root.__pixelReveal.destroy();
            }
            root.__pixelReveal = this;

            this.root = root;
            this.canvas = root.querySelector('canvas');
            this.el = root.querySelector('img');
            this.ctx = this.canvas?.getContext('2d');
            this.small = document.createElement('canvas');
            this.sctx = this.small.getContext('2d');

            if (!this.canvas || prefersReducedMotion) {
                root.classList.add('is-sharp');
                return;
            }

            root.classList.remove('is-sharp');
            this.img = new Image();
            this.img.src = this.canvas.dataset.src || this.el?.src || '';

            const onImgReady = () => {
                root.classList.add('is-init');
                this.draw(INITIAL_PIXEL_SIZE);
            };

            this.ready = this.img.decode
                ? this.img.decode().then(onImgReady).catch(() => {
                    if (this.img.complete && this.img.naturalWidth) onImgReady();
                    else root.classList.add('is-sharp');
                })
                : new Promise(res => {
                    this.img.onload = () => { onImgReady(); res(); };
                    this.img.onerror = () => { root.classList.add('is-sharp'); res(); };
                });

            this.io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
                        this.io.disconnect();
                        this.ready.then(() => this.play());
                    }
                });
            }, { threshold: [0, 0.12, 0.35], rootMargin: '0px 0px -20px 0px' });

            this.io.observe(root);
            this.ro = new ResizeObserver(() => {
                if (!this.playing) this.ready.then(() => this.draw(INITIAL_PIXEL_SIZE));
            });
            this.ro.observe(root);

            setTimeout(() => {
                const r = root.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0 && !this.playing) {
                    this.io.disconnect();
                    this.ready.then(() => this.play());
                }
            }, 350);
        }

        draw(pixelSize) {
            const { img } = this;
            const rect = this.root.getBoundingClientRect();
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const width = rect.width || this.root.clientWidth || 460;
            let height = rect.height || this.root.clientHeight;
            if (!height || height > 2000) {
                height = Math.round(width * 1.25);
            }
            if (!width || !height || !img.naturalWidth) return;

            this.canvas.width = Math.round(width * dpr);
            this.canvas.height = Math.round(height * dpr);

            const sw = Math.max(1, Math.ceil(width / pixelSize));
            const sh = Math.max(1, Math.ceil(height / pixelSize));
            this.small.width = sw;
            this.small.height = sh;

            const imgAspect = img.naturalWidth / img.naturalHeight;
            const frameAspect = width / height;
            let sx = 0, sy = 0, swidth = img.naturalWidth, sheight = img.naturalHeight;
            const [posX, posY] = (this.el && getComputedStyle(this.el).objectPosition || '50% 35%')
                .split(' ')
                .map(v => v.endsWith('%') ? parseFloat(v) / 100 : 0.5);

            if (imgAspect > frameAspect) {
                swidth = sheight * frameAspect;
                sx = (img.naturalWidth - swidth) * posX;
            } else {
                sheight = swidth / frameAspect;
                sy = (img.naturalHeight - sheight) * posY;
            }

            this.sctx.imageSmoothingEnabled = true;
            this.sctx.drawImage(img, sx, sy, swidth, sheight, 0, 0, sw, sh);

            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(this.small, 0, 0, sw, sh, 0, 0, this.canvas.width, this.canvas.height);
        }

        play() {
            if (this.playing) return;
            this.playing = true;
            const startTime = performance.now();
            let lastSize = -1;

            const frame = now => {
                const progress = Math.min(1, (now - startTime) / PIXEL_DURATION_MS);
                const pixelSize = Math.max(1, Math.round(Math.exp(Math.log(INITIAL_PIXEL_SIZE) * (1 - pixelEaseOutCubic(progress)))));

                if (pixelSize !== lastSize) {
                    lastSize = pixelSize;
                    if (pixelSize > 1) this.draw(pixelSize);
                }

                if (progress < 1 && pixelSize > 1) {
                    this.raf = requestAnimationFrame(frame);
                } else {
                    this.root.classList.add('is-sharp');
                }
            };
            this.raf = requestAnimationFrame(frame);
        }

        destroy() {
            if (this.raf) cancelAnimationFrame(this.raf);
            this.io?.disconnect();
            this.ro?.disconnect();
        }
    }

    function initPixelReveals() {
        document.querySelectorAll('[data-pixel-reveal]').forEach(el => new PixelReveal(el));
    }

    // ========================================================
    // 8. MANIFESTO & ETHOS WORD-BY-WORD SCROLL SCRUBBERS
    // ========================================================
    class ManifestoScroller {
        constructor(root) {
            if (root.__manifesto) root.__manifesto.destroy();
            root.__manifesto = this;
            this.root = root;
            this.text = root.querySelector('.manifesto__text') || root;
            this.words = [...root.querySelectorAll('.manifesto__word')];
            this.last = -1;
            this.raf = null;
            this.onScroll = () => this.scheduleUpdate();

            if (prefersReducedMotion) {
                this.words.forEach(word => word.classList.add('is-on'));
                return;
            }

            this.io = new IntersectionObserver(([entry]) => {
                entry.isIntersecting ? this.start() : this.stop();
            });
            this.io.observe(root);
            this.update();
        }

        scheduleUpdate() {
            if (this.raf || !this.running) return;
            this.raf = requestAnimationFrame(() => {
                this.raf = null;
                if (this.running) this.update();
            });
        }

        start() {
            if (this.running) return;
            this.running = true;
            window.addEventListener('scroll', this.onScroll, { passive: true });
            window.addEventListener('resize', this.onScroll, { passive: true });
            this.scheduleUpdate();
        }

        stop() {
            this.running = false;
            window.removeEventListener('scroll', this.onScroll);
            window.removeEventListener('resize', this.onScroll);
            if (this.raf) {
                cancelAnimationFrame(this.raf);
                this.raf = null;
            }
        }

        update() {
            const rect = this.text.getBoundingClientRect();
            const vh = window.innerHeight;
            const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.35)));
            const activeCount = Math.round(progress * this.words.length);

            if (activeCount !== this.last) {
                if (this.last < 0) {
                    this.words.forEach((word, idx) => word.classList.toggle('is-on', idx < activeCount));
                } else {
                    const start = Math.min(this.last, activeCount);
                    const end = Math.max(this.last, activeCount);
                    for (let idx = start; idx < end; idx++) {
                        this.words[idx]?.classList.toggle('is-on', idx < activeCount);
                    }
                }
                this.last = activeCount;
            }
        }

        destroy() {
            this.stop();
            this.io?.disconnect();
        }
    }

    class EthosEngine {
        constructor(root) {
            if (root.__ethosEngine) root.__ethosEngine.destroy();
            root.__ethosEngine = this;
            this.root = root;
            this.text = root.querySelector('.ethos__text');
            this.mark = root.querySelector('.ethos__mark');
            this.words = [...root.querySelectorAll('.ethos__word')];
            this.highlightWord = root.querySelector('.ethos__word.is--highlight');
            this.decodeBtn = root.querySelector('[data-decode-btn]');
            this.lastIndex = -1;
            this.isDecoding = false;
            this.cipherChars = '0123456789ABCDEF!<>-_\\/[]{}—=+*^?#_$%&';
            this.raf = null;
            this.onScroll = () => this.scheduleUpdate();

            this.initScrollScrubber();
            this.initInteractions();
        }

        initScrollScrubber() {
            if (prefersReducedMotion) {
                this.words.forEach(w => w.classList.add('is-on'));
                if (this.mark) this.mark.classList.add('is-revealed');
                return;
            }

            this.io = new IntersectionObserver(([entry]) => {
                entry.isIntersecting ? this.start() : this.stop();
            }, { threshold: [0, 0.2, 0.5, 0.8] });

            this.io.observe(this.root);
            this.update();
        }

        scheduleUpdate() {
            if (this.raf || !this.running) return;
            this.raf = requestAnimationFrame(() => {
                this.raf = null;
                if (this.running) this.update();
            });
        }

        start() {
            if (this.running) return;
            this.running = true;
            window.addEventListener('scroll', this.onScroll, { passive: true });
            window.addEventListener('resize', this.onScroll, { passive: true });
            this.scheduleUpdate();
        }

        stop() {
            this.running = false;
            window.removeEventListener('scroll', this.onScroll);
            window.removeEventListener('resize', this.onScroll);
            if (this.raf) {
                cancelAnimationFrame(this.raf);
                this.raf = null;
            }
        }

        update() {
            if (!this.text) return;
            const rect = this.text.getBoundingClientRect();
            const vh = window.innerHeight;
            const progress = Math.min(1, Math.max(0, (vh * 0.82 - rect.top) / (rect.height + vh * 0.3)));
            const activeCount = Math.round(progress * this.words.length);

            if (activeCount !== this.lastIndex) {
                if (this.lastIndex < 0) {
                    this.words.forEach((word, idx) => {
                        word.classList.toggle('is-on', idx < activeCount);
                    });
                } else {
                    const start = Math.min(this.lastIndex, activeCount);
                    const end = Math.max(this.lastIndex, activeCount);
                    for (let idx = start; idx < end; idx++) {
                        this.words[idx]?.classList.toggle('is-on', idx < activeCount);
                    }
                }
                this.lastIndex = activeCount;

                if (this.mark && this.highlightWord) {
                    const highlightIdx = this.words.indexOf(this.highlightWord);
                    const isRevealed = highlightIdx >= 0 && activeCount > highlightIdx;
                    this.mark.classList.toggle('is-revealed', isRevealed);
                }
            }
        }

        initInteractions() {
            if (this.decodeBtn) {
                this.onDecodeClick = (e) => {
                    e.preventDefault();
                    this.triggerDecodeWave();
                };
                this.decodeBtn.addEventListener('click', this.onDecodeClick);
            }

            if (this.text) {
                this.onTextClick = () => this.triggerDecodeWave();
                this.text.addEventListener('click', this.onTextClick);
            }

            if (this.mark) {
                this.onMarkHover = () => {
                    if (!this.isDecoding && this.highlightWord) {
                        this.scrambleWord(this.highlightWord, 'reverse-engineer', 450);
                    }
                };
                this.mark.addEventListener('mouseenter', this.onMarkHover);
                this.mark.addEventListener('touchstart', this.onMarkHover, { passive: true });
            }
        }

        scrambleWord(wordEl, targetText, durationMs = 500) {
            if (wordEl._scrambleTimer) clearInterval(wordEl._scrambleTimer);
            wordEl.classList.add('is-decoding');
            const startTime = performance.now();
            const len = targetText.length;

            wordEl._scrambleTimer = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(1, elapsed / durationMs);
                const lockedChars = Math.floor(progress * len);

                let display = '';
                for (let i = 0; i < len; i++) {
                    if (targetText[i] === '-' || targetText[i] === ' ') {
                        display += targetText[i];
                    } else if (i < lockedChars) {
                        display += targetText[i];
                    } else {
                        display += this.cipherChars[Math.floor(Math.random() * this.cipherChars.length)];
                    }
                }
                wordEl.textContent = display;

                if (progress >= 1) {
                    clearInterval(wordEl._scrambleTimer);
                    wordEl._scrambleTimer = null;
                    wordEl.textContent = targetText;
                    wordEl.classList.remove('is-decoding');
                }
            }, 32);
        }

        triggerDecodeWave() {
            if (this.isDecoding) return;
            this.isDecoding = true;

            this.words.forEach((wordEl, idx) => {
                const original = wordEl.dataset.originalText || wordEl.textContent.trim();
                wordEl.dataset.originalText = original;

                setTimeout(() => {
                    this.scrambleWord(wordEl, original, 380);
                }, idx * 60);
            });

            if (this.mark && window.gsap) {
                gsap.fromTo(this.mark,
                    { boxShadow: '0 0 30px rgba(232, 232, 227, 0.7)' },
                    { boxShadow: '0 0 0px rgba(232, 232, 227, 0)', duration: 0.9, ease: 'power2.out' }
                );
            }

            setTimeout(() => {
                this.isDecoding = false;
            }, this.words.length * 60 + 450);
        }

        destroy() {
            this.stop();
            this.io?.disconnect();
            if (this.decodeBtn && this.onDecodeClick) this.decodeBtn.removeEventListener('click', this.onDecodeClick);
            if (this.text && this.onTextClick) this.text.removeEventListener('click', this.onTextClick);
            if (this.mark && this.onMarkHover) {
                this.mark.removeEventListener('mouseenter', this.onMarkHover);
                this.mark.removeEventListener('touchstart', this.onMarkHover);
            }
        }
    }

    function initManifestoScrollers() {
        document.querySelectorAll('.manifesto').forEach(el => new ManifestoScroller(el));
    }

    function initEthosEngines() {
        document.querySelectorAll('.ethos').forEach(el => new EthosEngine(el));
    }

    // ========================================================
    // 9. ASYMMETRIC CARD LOOP, PARALLAX MOTION & VIEW SWITCHER
    // ========================================================
    const dampLerp = (current, target, factor, dt) => current + (target - current) * (1 - Math.exp(-factor * 60 * dt));
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const isPointInside = (pt, r) => pt && pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom;

    class CardsMotion {
        constructor(root) {
            if (root.__cardsMotion) root.__cardsMotion.destroy();
            root.__cardsMotion = this;
            this.root = root;
            this.cursor = root.querySelector('[data-fp-cursor]');
            this.reduced = prefersReducedMotion;
            this.cards = [...root.querySelectorAll('.fp__card, [data-fp-card]')].map(card => ({
                card,
                link: card.querySelector('.fp__link') || card,
                fig: card.querySelector('.fp__fig, [data-fp-fig]'),
                title: card.querySelector('[data-scramble-target]'),
                y: 0,
                revealed: false,
                hover: false,
                timer: 0
            }));

            if (this.reduced) {
                this.cards.forEach(c => this.reveal(c));
                return;
            }

            this.pointer = null;
            this.cx = 0;
            this.cy = 0;
            this.cursorOn = false;
            this.amp = { desktop: 0.22, mobile: 0.10 };
            this.cardLerp = 0.1;
            this.cursorLerp = 0.18;
            this.running = false;
            this.last = performance.now();

            this.onPointerMove = (e) => {
                if (e.pointerType !== 'touch') {
                    this.pointer = { x: e.clientX, y: e.clientY };
                }
            };
            this.onMouseLeave = () => {
                this.pointer = null;
            };
            window.addEventListener('pointermove', this.onPointerMove, { passive: true });
            document.documentElement.addEventListener('mouseleave', this.onMouseLeave);

            this.io = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    this.start();
                } else {
                    this.stop();
                }
            }, { rootMargin: '30% 0px' });
            this.io.observe(root);

            // Immediate visibility pass so visible cards never remain unrevealed
            requestAnimationFrame(() => this.checkVisible());
            setTimeout(() => this.checkVisible(), 220);
        }

        isCardVisible(c) {
            return !c.card.hidden && c.card.style.display !== 'none';
        }

        checkVisible() {
            const vh = window.innerHeight;
            for (const c of this.cards) {
                if (!this.isCardVisible(c) || !c.fig) continue;
                const linkRect = c.link.getBoundingClientRect();
                const figH = c.fig.offsetHeight || linkRect.width || 300;
                if (!c.revealed && (linkRect.top + 0.12 * figH < vh || linkRect.top < 0)) {
                    this.reveal(c);
                }
            }
        }

        setHover(c, hover) {
            if (c.hover !== hover) {
                c.hover = hover;
                if (hover) {
                    clearTimeout(c.timer);
                    c.card.classList.remove('is-reset');
                    c.card.classList.add('is-hover');
                    if (c.title && window.scrambleText) {
                        window.scrambleText(c.title, 0.35);
                    }
                } else {
                    c.card.classList.remove('is-hover');
                    c.timer = setTimeout(() => c.card.classList.add('is-reset'), 200);
                }
            }
        }

        setCursor(on) {
            if (this.cursorOn !== on) {
                this.cursorOn = on;
                if (this.cursor) {
                    this.cursor.classList.toggle('is-on', on);
                }
                if (on && this.pointer) {
                    this.cx = this.pointer.x;
                    this.cy = this.pointer.y;
                }
            }
        }

        reveal(c) {
            c.revealed = true;
            if (c.fig) {
                c.fig.classList.add('is-in');
                clearTimeout(c.fig.__doneTimer);
                c.fig.__doneTimer = setTimeout(() => {
                    c.fig?.classList.add('is-done');
                }, 1150);
            }
        }

        start() {
            if (!this.running) {
                this.running = true;
                this.last = performance.now();
                this.raf = requestAnimationFrame((t) => this.frame(t));
            }
        }

        stop() {
            this.running = false;
            cancelAnimationFrame(this.raf);
            this.setCursor(false);
        }

        destroy() {
            this.stop();
            this.io?.disconnect();
            window.removeEventListener('pointermove', this.onPointerMove);
            document.documentElement.removeEventListener('mouseleave', this.onMouseLeave);
        }

        frame(time) {
            if (!this.running) return;
            const dt = Math.min(0.1, (time - this.last) / 1000);
            this.last = time;

            const vh = window.innerHeight;
            const isDesktop = window.innerWidth >= 810;
            const amp = isDesktop ? this.amp.desktop : this.amp.mobile;
            let cursorHit = false;

            // 1. Batch DOM geometry reads before style writes to avoid forced synchronous reflows
            const measurements = [];
            for (const c of this.cards) {
                if (!this.isCardVisible(c)) continue;
                const cardRect = c.card.getBoundingClientRect();
                const linkRect = c.link.getBoundingClientRect();
                const figRect = c.fig ? c.fig.getBoundingClientRect() : null;
                measurements.push({ c, cardRect, linkRect, figRect });
            }

            // 2. Apply transforms and custom properties in a clean write pass
            for (const { c, cardRect, linkRect, figRect } of measurements) {
                const linkH = linkRect.height || 1;
                const targetY = (clamp01((vh - cardRect.top) / (vh + cardRect.height)) - 0.5) * linkH * amp;
                c.y = dampLerp(c.y, targetY, this.cardLerp, dt);
                if (Math.abs(targetY - c.y) < 0.05) c.y = targetY;

                c.link.style.transform = `translate3d(0, ${c.y.toFixed(2)}px, 0)`;

                if (c.fig && figRect) {
                    const figH = figRect.height || linkRect.width || 1;
                    const p = clamp01((vh - linkRect.top) / (vh + figH));
                    c.fig.style.setProperty('--p', p.toFixed(4));

                    if (!c.revealed && (linkRect.top + 0.15 * figH < vh || linkRect.top < 0)) {
                        this.reveal(c);
                    }
                }

                const insideCard = isPointInside(this.pointer, linkRect);
                this.setHover(c, insideCard);

                if (insideCard && figRect && isPointInside(this.pointer, figRect)) {
                    cursorHit = true;
                }
            }

            if (this.cursor) {
                this.setCursor(cursorHit);
                if (this.cursorOn && this.pointer) {
                    this.cx = dampLerp(this.cx, this.pointer.x, this.cursorLerp, dt);
                    this.cy = dampLerp(this.cy, this.pointer.y, this.cursorLerp, dt);
                    this.cursor.style.transform = `translate3d(${this.cx.toFixed(1)}px, ${this.cy.toFixed(1)}px, 0)`;
                }
            }

            this.raf = requestAnimationFrame((t) => this.frame(t));
        }
    }

    class FeaturedProjects {
        constructor(root) {
            if (root.__featuredProjects) return;
            root.__featuredProjects = this;
            this.root = root;
            this.views = root.querySelector('[data-fp-views]');
            this.grid = root.querySelector('.fp__grid');
            this.list = root.querySelector('[data-fp-list]');
            this.toggle = document.querySelector('[data-fp-view]');
            if (!this.views || !this.grid || !this.list || !this.toggle) return;

            this.buttons = [...this.toggle.querySelectorAll('[data-view]')];
            this.rows = [...this.list.querySelectorAll('[data-fp-row]')];
            this.previews = [...this.list.querySelectorAll('[data-fp-preview]')];
            this.reduced = prefersReducedMotion;
            this.view = 'grid';
            this.busy = false;

            const saved = localStorage.getItem('fp-view');
            if (saved === 'list') {
                this.apply('list');
            }

            this.buttons.forEach(btn => {
                btn.onclick = () => this.set(btn.dataset.view);
            });

            this.rows.forEach((row, idx) => {
                row.addEventListener('pointerenter', (e) => {
                    if (e.pointerType !== 'touch') this.hover(idx);
                });
                row.addEventListener('focus', () => this.hover(idx));
                row.addEventListener('blur', () => this.hover(-1));
            });

            this.list.addEventListener('pointerleave', () => this.hover(-1));
        }

        hover(idx) {
            this.list.classList.toggle('is-hovering', idx >= 0);
            this.rows.forEach((r, i) => {
                const active = i === idx;
                r.classList.toggle('is-active', active);
                if (active) {
                    const title = r.querySelector('[data-scramble-target]');
                    if (title && window.scrambleText) window.scrambleText(title, 0.35);
                }
            });
            this.previews.forEach((p, i) => {
                p.classList.toggle('is-on', i === idx);
            });
        }

        apply(view) {
            this.view = view;
            const isList = view === 'list';
            this.grid.hidden = isList;
            this.list.hidden = !isList;
            this.root.classList.toggle('fp--list', isList);
            this.toggle.dataset.current = view;
            this.buttons.forEach(b => {
                b.setAttribute('aria-pressed', String(b.dataset.view === view));
            });
            this.hover(-1);
        }

        set(view) {
            if (view === this.view || this.busy) return;
            try { localStorage.setItem('fp-view', view); } catch (e) {}

            if (this.reduced) {
                this.apply(view);
                return;
            }

            this.busy = true;
            this.toggle.dataset.current = view;
            this.views.classList.add('is-switching');

            setTimeout(() => {
                this.apply(view);
                if (view === 'list') {
                    this.list.classList.remove('is-in');
                    void this.list.offsetWidth;
                    this.list.classList.add('is-in');
                } else {
                    window.refreshCardsMotion?.();
                }
                this.views.classList.remove('is-switching');
                this.busy = false;
                window.dispatchEvent(new Event('resize'));
            }, 280);
        }
    }

    function initCardsMotion() {
        document.querySelectorAll('[data-featured-projects], .projets__loop').forEach(el => {
            new CardsMotion(el);
        });
        const fpEl = document.querySelector('[data-featured-projects]');
        if (fpEl) {
            new FeaturedProjects(fpEl);
        }
    }

    window.refreshCardsMotion = function () {
        document.querySelectorAll('[data-featured-projects], .projets__loop').forEach(el => {
            if (el.__cardsMotion) {
                el.__cardsMotion.checkVisible();
                if (!el.__cardsMotion.running) el.__cardsMotion.start();
            } else {
                new CardsMotion(el);
            }
        });
    };

    // ========================================================
    // 10. INTERACTIVE PAGE HERO STAGES & CONTACT MATRIX CANVAS
    // ========================================================
    let pageStageCleanups = [];

    function cleanupPageHeroStages() {
        pageStageCleanups.forEach(fn => {
            try { fn(); } catch (e) {}
        });
        pageStageCleanups = [];
    }

    function detectStageMode(pathname) {
        const clean = (pathname || window.location.pathname).replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
        if (clean.startsWith('/services')) return 'services';
        if (clean.startsWith('/about')) return 'about';
        if (clean.startsWith('/projects/')) return 'case';
        if (clean.startsWith('/projects')) return 'projects';
        if (clean.startsWith('/faq')) return 'faq';
        if (clean.startsWith('/news')) return 'news';
        return 'default';
    }

    function mountPageHeroStage(stageEl, mode) {
        stageEl.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.className = 'page-hero__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        stageEl.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 0, h = 0, dpr = 1;
        let stageLeft = 0, stageDocTop = 0;
        let rafId = null;
        let isVisible = true;
        let tabVisible = !document.hidden;
        let hasDrawnInitial = false;
        let lastDrawAt = 0;
        let lastPointerAt = 0;
        let lastScrollY = window.scrollY || 0;
        let targetPtr = { x: 0.55, y: 0.45, active: 0 };
        let curPtr = { x: 0.55, y: 0.45, active: 0 };
        const startTime = performance.now();

        function resize() {
            const rect = stageEl.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            stageLeft = rect.left;
            stageDocTop = rect.top + (window.scrollY || 0);
            w = Math.max(300, Math.round(rect.width || window.innerWidth));
            h = Math.max(300, Math.round(rect.height || window.innerHeight * 0.85));
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();

        const onResize = () => resize();
        const onMove = (e) => {
            if (!isVisible) return;
            lastPointerAt = performance.now();
            targetPtr.x = clamp01((e.clientX - stageLeft) / (w || 1));
            targetPtr.y = clamp01((e.clientY + (window.scrollY || 0) - stageDocTop) / (h || 1));
            targetPtr.active = 1;
        };
        const onVisibility = () => {
            tabVisible = !document.hidden;
            if (tabVisible && isVisible && !rafId) rafId = requestAnimationFrame(loop);
        };

        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);

        const io = new IntersectionObserver(([entry]) => {
            isVisible = entry ? entry.isIntersecting : true;
            if (isVisible && tabVisible && !rafId) {
                rafId = requestAnimationFrame(loop);
            }
        }, { threshold: 0.01 });
        io.observe(stageEl);

        const glyphSet = ['+', '·', ':', '0', '1', '/', '#', '-', '='];

        function project3D(px, py, pz, cx, cy, fov = 560) {
            const scale = fov / Math.max(120, fov + pz);
            return { x: cx + px * scale, y: cy + py * scale, scale };
        }

        function drawCornerMarks() {
            ctx.strokeStyle = 'rgba(232, 232, 227, 0.25)';
            ctx.lineWidth = 1;
            const pad = 32;
            const len = 10;
            const pts = [
                [pad, pad], [w - pad, pad],
                [pad, h - pad], [w - pad, h - pad]
            ];
            pts.forEach(([x, y]) => {
                ctx.beginPath();
                ctx.moveTo(x - len, y);
                ctx.lineTo(x + len, y);
                ctx.moveTo(x, y - len);
                ctx.lineTo(x, y + len);
                ctx.stroke();
            });
        }

        function drawServicesStage(t, scrollP) {
            const cx = w * 0.68 + (curPtr.x - 0.5) * 30;
            const cy = h * 0.44 - scrollP * 70 + (curPtr.y - 0.5) * 20;
            const rotY = -0.45 + (curPtr.x - 0.5) * 0.35 + Math.sin(t * 0.35) * 0.08;
            const rotX = 0.55 + (curPtr.y - 0.5) * 0.25 + scrollP * 0.22;

            const layers = 4;

            for (let l = 0; l < layers; l++) {
                const zOffset = (l - 1.5) * (68 + scrollP * 40);
                const pw = Math.min(w * 0.34, 420);
                const ph = pw * 0.62;
                const corners = [
                    [-pw / 2, -ph / 2, zOffset],
                    [pw / 2, -ph / 2, zOffset],
                    [pw / 2, ph / 2, zOffset],
                    [-pw / 2, ph / 2, zOffset]
                ];

                const proj = corners.map(([x, y, z]) => {
                    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
                    const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
                    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
                    return project3D(x1, y2, z2 + 120, cx, cy, 620);
                });

                // Translucent plate fill
                ctx.beginPath();
                ctx.moveTo(proj[0].x, proj[0].y);
                proj.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.fillStyle = l === 3 ? 'rgba(232, 232, 227, 0.045)' : 'rgba(16, 16, 18, 0.38)';
                ctx.fill();
                ctx.strokeStyle = `rgba(232, 232, 227, ${(0.12 + l * 0.07).toFixed(2)})`;
                ctx.lineWidth = l === 3 ? 1.2 : 0.8;
                ctx.stroke();

                // Scanning bus line inside plane
                const scanU = ((t * 0.28 + l * 0.25) % 1);
                const sx1 = proj[0].x + (proj[3].x - proj[0].x) * scanU;
                const sy1 = proj[0].y + (proj[3].y - proj[0].y) * scanU;
                const sx2 = proj[1].x + (proj[2].x - proj[1].x) * scanU;
                const sy2 = proj[1].y + (proj[2].y - proj[1].y) * scanU;
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
                ctx.strokeStyle = 'rgba(232, 232, 227, 0.22)';
                ctx.stroke();
            }
        }

        function drawProjectsStage(t, scrollP, isCase) {
            const cx = w * 0.62;
            const cy = h * 0.46 - scrollP * 55;
            const cols = 16;
            const rows = 10;
            const spacingX = Math.min(46, w * 0.036);
            const spacingZ = 38;
            const tiltX = 0.68 + (curPtr.y - 0.5) * 0.25;
            const tiltY = (curPtr.x - 0.5) * 0.35 + Math.sin(t * 0.22) * 0.12;

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const gridPts = [];
            for (let r = 0; r < rows; r++) {
                const rowArr = [];
                for (let c = 0; c < cols; c++) {
                    const nx = (c - cols / 2) * spacingX;
                    const nz = (r - rows / 2) * spacingZ;
                    const waveH = Math.sin(c * 0.45 + t * 1.1) * Math.cos(r * 0.55 + t * 0.8) * (isCase ? 36 : 44);
                    const ptrDist = Math.hypot(nx - (curPtr.x - 0.62) * 420, nz);
                    const ptrLift = Math.max(0, 1 - ptrDist / 220) * -28;
                    const ny = waveH + ptrLift + 40;

                    // Rotate Y then X
                    const x1 = nx * Math.cos(tiltY) - nz * Math.sin(tiltY);
                    const z1 = nx * Math.sin(tiltY) + nz * Math.cos(tiltY);
                    const y2 = ny * Math.cos(tiltX) - z1 * Math.sin(tiltX);
                    const z2 = ny * Math.sin(tiltX) + z1 * Math.cos(tiltX);
                    const p = project3D(x1, y2, z2 + 180, cx, cy, 580);
                    rowArr.push(p);
                }
                gridPts.push(rowArr);
            }

            // Wireframe mesh lines
            ctx.strokeStyle = 'rgba(232, 232, 227, 0.14)';
            ctx.lineWidth = 0.8;
            for (let r = 0; r < rows; r++) {
                ctx.beginPath();
                for (let c = 0; c < cols; c++) {
                    const p = gridPts[r][c];
                    if (c === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            }
            for (let c = 0; c < cols; c++) {
                ctx.beginPath();
                for (let r = 0; r < rows; r++) {
                    const p = gridPts[r][c];
                    if (r === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            }

            // Highlight vertex nodes
            for (let r = 0; r < rows; r += 2) {
                for (let c = 0; c < cols; c += 2) {
                    const p = gridPts[r][c];
                    ctx.fillStyle = 'rgba(232, 232, 227, 0.42)';
                    ctx.fillText((r + c) % 4 === 0 ? '+' : '·', p.x, p.y);
                }
            }
        }

        function drawAboutStage(t, scrollP) {
            const cx = w * 0.72 + (curPtr.x - 0.5) * 28;
            const cy = h * 0.45 - scrollP * 50 + (curPtr.y - 0.5) * 20;
            const baseR = Math.min(w, h) * 0.30;

            for (let ring = 1; ring <= 4; ring++) {
                const r = baseR * (ring * 0.28);
                ctx.beginPath();
                ctx.setLineDash(ring % 2 === 0 ? [4, 6] : []);
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(232, 232, 227, ${(0.08 + ring * 0.03).toFixed(2)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);

                // Orbiting node
                const angle = t * (0.25 / ring) * (ring % 2 === 0 ? -1 : 1) + ring;
                const nx = cx + Math.cos(angle) * r;
                const ny = cy + Math.sin(angle) * r;
                ctx.fillStyle = 'rgba(232, 232, 227, 0.75)';
                ctx.fillRect(nx - 2.5, ny - 2.5, 5, 5);
            }

            // Crosshair target axes
            ctx.strokeStyle = 'rgba(142, 142, 136, 0.16)';
            ctx.beginPath();
            ctx.moveTo(cx - baseR * 1.2, cy);
            ctx.lineTo(cx + baseR * 1.2, cy);
            ctx.moveTo(cx, cy - baseR * 1.2);
            ctx.lineTo(cx, cy + baseR * 1.2);
            ctx.stroke();
        }

        function drawAsciiWaveStage(t, scrollP) {
            const step = isMobileViewport() ? 42 : 34;
            const px = curPtr.x * w;
            const py = curPtr.y * h;
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let y = step / 2; y < h; y += step) {
                for (let x = step / 2; x < w; x += step) {
                    const wave = Math.sin(x * 0.015 + t * 1.4) * Math.cos(y * 0.018 - t * 0.9 + scrollP * 3);
                    const dist = Math.hypot(x - px, y - py);
                    const boost = curPtr.active ? Math.max(0, 1 - dist / 220) : 0;
                    const energy = clamp01((wave + 1) * 0.5 * 0.35 + boost * 0.75);
                    if (energy < 0.18) continue;

                    const charIdx = Math.min(glyphSet.length - 1, Math.floor(energy * glyphSet.length));
                    ctx.fillStyle = boost > 0.3
                        ? `rgba(232, 232, 227, ${(0.25 + boost * 0.65).toFixed(2)})`
                        : `rgba(142, 142, 136, ${(energy * 0.35).toFixed(2)})`;
                    ctx.fillText(glyphSet[charIdx], x, y);
                }
            }
        }

        function loop(now = performance.now()) {
            if (!isVisible || !tabVisible || !document.body.contains(canvas)) {
                rafId = null;
                return;
            }
            if (window.__isTransitionCovering && hasDrawnInitial) {
                rafId = requestAnimationFrame(loop);
                return;
            }

            const scrollY = window.scrollY || 0;
            const isInteracting = (now - lastPointerAt < 450) || Math.abs(scrollY - lastScrollY) > 0.5;
            if (!hasDrawnInitial || isInteracting || (now - lastDrawAt >= 32)) {
                hasDrawnInitial = true;
                lastDrawAt = now;
                lastScrollY = scrollY;

                const t = (now - startTime) / 1000;
                curPtr.x += (targetPtr.x - curPtr.x) * 0.08;
                curPtr.y += (targetPtr.y - curPtr.y) * 0.08;
                curPtr.active += (targetPtr.active - curPtr.active) * 0.08;

                const scrollP = clamp01(scrollY / Math.max(1, h));

                ctx.clearRect(0, 0, w, h);

                if (mode === 'services') drawServicesStage(t, scrollP);
                else if (mode === 'projects' || mode === 'case') drawProjectsStage(t, scrollP, mode === 'case');
                else if (mode === 'about') drawAboutStage(t, scrollP);
                else drawAsciiWaveStage(t, scrollP);

                drawCornerMarks();
            }

            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);

        pageStageCleanups.push(() => {
            if (rafId) cancelAnimationFrame(rafId);
            io.disconnect();
            window.removeEventListener('resize', onResize);
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('visibilitychange', onVisibility);
        });
    }

    function initContactCanvas() {
        const canvas = document.getElementById('contact-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let cw = 0, ch = 0, dpr = 1;
        let cLeft = 0, cDocTop = 0;
        let ptrX = -9999, ptrY = -9999;
        let rafId = null;
        let isVisible = true;
        let tabVisible = !document.hidden;
        const chars = ['+', '·', ':', '0', '1', 'x', '-', '~', '*'];

        const img = new Image();
        img.src = '/assets/hero-hands-chalk.webp';

        function resize() {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            cLeft = r.left;
            cDocTop = r.top + (window.scrollY || 0);
            cw = canvas.clientWidth || r.width || window.innerWidth;
            ch = canvas.clientHeight || r.height || window.innerHeight;
            canvas.width = Math.round(cw * dpr);
            canvas.height = Math.round(ch * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();

        const onMove = (e) => {
            if (!isVisible) return;
            ptrX = e.clientX - cLeft;
            ptrY = e.clientY + (window.scrollY || 0) - cDocTop;
        };
        const onVis = () => {
            tabVisible = !document.hidden;
            if (tabVisible && isVisible && !rafId) rafId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize, { passive: true });
        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('visibilitychange', onVis);

        const contactIo = new IntersectionObserver(([entry]) => {
            isVisible = entry ? entry.isIntersecting : true;
            if (isVisible && tabVisible && !rafId) {
                rafId = requestAnimationFrame(draw);
            }
        }, { threshold: 0.01 });
        contactIo.observe(canvas);

        function draw(now) {
            if (!isVisible || !tabVisible || !document.body.contains(canvas)) {
                rafId = null;
                return;
            }
            const t = now * 0.001;
            ctx.clearRect(0, 0, cw, ch);

            if (img.complete && img.naturalWidth) {
                ctx.save();
                ctx.globalAlpha = 0.22;
                const aspect = img.naturalWidth / img.naturalHeight;
                const targetH = ch * 0.85;
                const targetW = targetH * aspect;
                const targetX = cw - targetW * 0.72;
                const targetY = ch - targetH * 0.82;
                ctx.drawImage(img, targetX, targetY, targetW, targetH);
                ctx.restore();
            }

            const step = 44;
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let x = 22; x < cw; x += step) {
                for (let y = 22; y < ch; y += step) {
                    const dx = ptrX - x;
                    const dy = ptrY - y;
                    const dist = Math.hypot(dx, dy);
                    const proximity = Math.max(0, 1 - dist / 240);
                    const shimmer = 0.04 * Math.sin(t * 2 + x * 0.03 + y * 0.03);
                    const char = chars[Math.abs(Math.floor((x * 13 + y * 17 + Math.floor(t * 4 * proximity)) % chars.length))];
                    const alpha = clamp01(0.08 + shimmer + proximity * 0.55);

                    ctx.fillStyle = proximity > 0.35
                        ? `rgba(232, 232, 227, ${alpha.toFixed(3)})`
                        : `rgba(142, 142, 136, ${alpha.toFixed(3)})`;
                    ctx.fillText(char, x, y);
                }
            }
            rafId = requestAnimationFrame(draw);
        }

        rafId = requestAnimationFrame(draw);

        pageStageCleanups.push(() => {
            if (rafId) cancelAnimationFrame(rafId);
            contactIo.disconnect();
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
            document.removeEventListener('visibilitychange', onVis);
        });
    }

    function initPageHeroStages(cleanPath) {
        cleanupPageHeroStages();
        const mode = detectStageMode(cleanPath);
        document.querySelectorAll('.page-hero__stage').forEach(el => {
            mountPageHeroStage(el, mode);
        });
        initContactCanvas();
    }

    // ========================================================
    // 11. SUBPAGE SCROLL PARALLAX & STAGGERED ENTRANCE MOTION
    // ========================================================
    let subpageTriggers = [];

    function cleanupSubpageScrollAnimations() {
        subpageTriggers.forEach(st => {
            try { st.kill(); } catch (e) {}
        });
        subpageTriggers = [];
    }

    function initSubpageScrollAnimations() {
        cleanupSubpageScrollAnimations();
        if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;

        // 1. Portrait & Case Study Media Parallax
        document.querySelectorAll('.about__fig').forEach(fig => {
            const tween = gsap.fromTo(fig,
                { y: 28, force3D: true },
                {
                    y: -28,
                    ease: 'none',
                    force3D: true,
                    scrollTrigger: {
                        trigger: fig.closest('.about') || fig,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true
                    }
                }
            );
            if (tween.scrollTrigger) subpageTriggers.push(tween.scrollTrigger);
        });

        document.querySelectorAll('.pr-media--wide img, .pr-pair img').forEach(img => {
            const tween = gsap.fromTo(img,
                { scale: 1.08, yPercent: -4, force3D: true },
                {
                    scale: 1.08,
                    yPercent: 4,
                    ease: 'none',
                    force3D: true,
                    scrollTrigger: {
                        trigger: img.parentElement,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true
                    }
                }
            );
            if (tween.scrollTrigger) subpageTriggers.push(tween.scrollTrigger);
        });

        // 2. Staggered Scroll Entrances for Subpage Blocks
        const batchSelectors = [
            '.faq-row',
            '.ap-career__item',
            '.ap-prose__body > p',
            '.pr-split__col',
            '.pr-results__item',
            '.pr-lh__card',
            '.faq-acc__item',
            '.news-card'
        ];

        // Pass 1: batch all layout reads across all selectors before any GSAP writes
        const vh = window.innerHeight || 900;
        const batches = batchSelectors.map(sel => {
            const nodes = Array.from(document.querySelectorAll(sel));
            if (!nodes.length) return null;
            const immediate = [];
            const deferred = [];

            nodes.forEach(n => {
                const r = n.getBoundingClientRect();
                if (r.top < vh * 0.92) immediate.push(n);
                else deferred.push(n);
            });

            return { immediate, deferred };
        }).filter(Boolean);

        // Pass 2: apply all GSAP initial states and ScrollTrigger batches
        batches.forEach(({ immediate, deferred }) => {
            if (immediate.length) {
                gsap.fromTo(immediate,
                    { opacity: 0, y: 18, force3D: true },
                    { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out', force3D: true, clearProps: 'transform,opacity' }
                );
            }

            if (deferred.length) {
                gsap.set(deferred, { opacity: 0, y: 24, force3D: true });
                const triggers = ScrollTrigger.batch(deferred, {
                    onEnter: (batch) => {
                        gsap.to(batch, {
                            opacity: 1,
                            y: 0,
                            duration: 0.65,
                            stagger: 0.07,
                            ease: 'power3.out',
                            overwrite: 'auto',
                            force3D: true,
                            clearProps: 'transform,opacity'
                        });
                    },
                    start: 'top 90%',
                    once: true
                });
                subpageTriggers.push(...triggers);
            }
        });
    }

    // ========================================================
    // 12. FAQ ACCORDION INTERACTION & SCRAMBLE
    // ========================================================
    function initFaqAccordions() {
        const detailsList = document.querySelectorAll('.faq-acc__d');
        detailsList.forEach(det => {
            const summary = det.querySelector('.faq-acc__q');
            if (!summary) return;

            summary.onclick = () => {
                const title = summary.querySelector('.faq-acc__q-title') || summary.querySelector('[data-scramble-target]');
                if (title && window.scrambleText) {
                    window.scrambleText(title, 0.35);
                }
            };
        });
    }

    // ========================================================
    // 13. BINARY REVEAL FOOTER ENGINE
    // ========================================================
    const binaryCropCache = new Map();

    class BinaryReveal {
        constructor(root, options = {}) {
            if (root.__binaryReveal) {
                root.__binaryReveal.destroy();
            }
            root.__binaryReveal = this;

            this.root = root;
            this.canvas = root.querySelector('.binary-reveal__stage canvas') || root.querySelector('canvas');
            this.o = Object.assign({
                src: '/images/footer-sample.webp',
                cellPx: 5,
                contrast: 1.3,
                cutoff: 250,
                tracking: 1.25,
                lineHeight: 1.3,
                duration: 4600,
                charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                primary: '#E8E8E3',
                bg: '#080807',
                font: "'JetBrains Mono', 'Space Grotesk', ui-monospace, monospace",
                logoDelay: 500,
                trim: true,
                padY: 0.08
            }, options);

            this.progress = 0;
            this.armed = true;
            this.built = false;
            this.drawnAtZero = false;
            this.lastTickDraw = 0;

            const img = new Image();
            const imgLoaded = new Promise(res => { img.onload = res; img.onerror = res; });
            img.src = this.o.src;

            const fontLoaded = document.fonts ? document.fonts.load('700 16px ' + this.o.font).catch(() => {}) : Promise.resolve();

            Promise.all([imgLoaded, fontLoaded]).then(() => {
                if (this.destroyed) return;
                this.img = img;
                const cropKey = this.o.trim
                    ? `${this.o.src}|${this.o.contrast}|${this.o.cutoff}|${this.o.padY}`
                    : `raw|${this.o.src}`;
                if (binaryCropCache.has(cropKey)) {
                    this.crop = binaryCropCache.get(cropKey);
                } else {
                    this.crop = this.o.trim ? this.computeCrop(img) : { sx: 0, sy: 0, sw: img.width || 1200, sh: img.height || 600 };
                    binaryCropCache.set(cropKey, this.crop);
                }

                // Observe visibility immediately so fast scrolling never misses footer reveal
                this.observe();

                // Defer heavy canvas cell grid construction until footer is within 600px of viewport
                if ('IntersectionObserver' in window) {
                    const preTarget = this.root.querySelector('.binary-reveal__stage') || this.root;
                    this.prebuildIo = new IntersectionObserver((entries) => {
                        if (entries.some(e => e.isIntersecting)) {
                            this.prebuildIo?.disconnect();
                            this.prebuildIo = null;
                            this.ensureBuilt();
                            if (!this.drawnAtZero) {
                                this.draw();
                            }
                        }
                    }, { rootMargin: '600px 0px' });
                    this.prebuildIo.observe(preTarget);
                } else {
                    this.ensureBuilt();
                    this.draw();
                }
            });

            let resizeTimer;
            this.onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (this.destroyed || !this.img) return;
                    if (this.built) {
                        this.built = false;
                        this.drawnAtZero = false;
                        if (!this.armed) {
                            this.ensureBuilt();
                            this.draw();
                        }
                    }
                }, 150);
            };
            window.addEventListener('resize', this.onResize, { passive: true });
        }

        ensureBuilt() {
            if (this.built || !this.img || !this.crop) return;
            this.build();
            this.built = true;
        }

        destroy() {
            this.destroyed = true;
            cancelAnimationFrame(this.raf);
            this.stopTwinkle();
            clearTimeout(this.fT);
            clearTimeout(this.initCheckTimer);
            this.prebuildIo?.disconnect();
            this.io?.disconnect();
            window.removeEventListener('resize', this.onResize);
            if (this.visHandler) document.removeEventListener('visibilitychange', this.visHandler);
        }

        hexToRgb(hex) {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const n = parseInt(c, 16);
            return [n >> 16 & 255, n >> 8 & 255, n & 255];
        }

        mix(a, b, t) {
            return Math.round(a + (b - a) * t);
        }

        rampAt(ramp, val) {
            if (val <= ramp[0][0]) return [ramp[0][1], ramp[0][2], ramp[0][3]];
            for (let i = 1; i < ramp.length; i++) {
                const r = ramp[i];
                if (val <= r[0]) {
                    const prev = ramp[i - 1];
                    const t = (val - prev[0]) / (r[0] - prev[0]);
                    return [
                        Math.round(prev[1] + (r[1] - prev[1]) * t),
                        Math.round(prev[2] + (r[2] - prev[2]) * t),
                        Math.round(prev[3] + (r[3] - prev[3]) * t)
                    ];
                }
            }
            const last = ramp[ramp.length - 1];
            return [last[1], last[2], last[3]];
        }

        observe() {
            const target = this.root.querySelector('.binary-reveal__stage') || this.root;
            this.io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const ratio = entry.intersectionRatio;
                    if (!entry.isIntersecting || ratio <= 0.15) {
                        if (!this.armed) {
                            this.armed = true;
                            cancelAnimationFrame(this.raf);
                            this.stopTwinkle();
                            this.progress = 0;
                            this.drawnAtZero = false;
                            if (this.built) this.draw();
                            this.resetFooter();
                        }
                        return;
                    }
                    if (this.armed && ratio >= 0.45) {
                        this.ensureBuilt();
                        this.armed = false;
                        this.stopTwinkle();
                        this.lastTickDraw = 0;
                        this.drawnAtZero = false;
                        this.start = performance.now();
                        this.tick();
                        this.revealFooter();
                    } else if (this.armed) {
                        this.ensureBuilt();
                        this.progress = 0;
                        if (!this.drawnAtZero) {
                            this.draw();
                        }
                    }
                });
            }, { threshold: [0, 0.15, 0.3, 0.45, 0.7] });

            this.io.observe(target);

            this.initCheckTimer = setTimeout(() => {
                if (this.destroyed) return;
                const r = target.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0 && this.armed) {
                    this.ensureBuilt();
                    this.armed = false;
                    this.stopTwinkle();
                    this.lastTickDraw = 0;
                    this.drawnAtZero = false;
                    this.start = performance.now();
                    this.tick();
                    this.revealFooter();
                }
            }, 400);

            this.visHandler = () => {
                if (document.hidden) {
                    this.stopTwinkle();
                } else if (!this.armed && this.progress >= 1) {
                    this.startTwinkle();
                }
            };
            document.addEventListener('visibilitychange', this.visHandler);
        }

        tick(now = performance.now()) {
            if (this.destroyed) return;
            const elapsed = now - this.start;
            const t = Math.min(1, elapsed / this.o.duration);
            if (t >= 1) {
                this.progress = 1;
                this.drawnAtZero = false;
                this.draw();
                this.startTwinkle();
                return;
            }
            if (this.lastTickDraw === 0 || now - this.lastTickDraw >= 30) {
                this.lastTickDraw = now;
                this.progress = 1 - Math.pow(1 - t, 3);
                this.drawnAtZero = false;
                this.draw();
            }
            this.raf = requestAnimationFrame((ts) => this.tick(ts));
        }

        startTwinkle() {
            if (this.tw) return;
            let last = 0;
            const loop = (now) => {
                if (now - last > 66) {
                    last = now;
                    this.draw();
                }
                this.tw = requestAnimationFrame(loop);
            };
            this.tw = requestAnimationFrame(loop);
        }

        stopTwinkle() {
            if (this.tw) {
                cancelAnimationFrame(this.tw);
                this.tw = null;
            }
        }

        resetFooter() {
            clearTimeout(this.fT);
            this.root.classList.remove('is-revealed');
        }

        revealFooter() {
            this.resetFooter();
            this.fT = setTimeout(() => {
                this.root.classList.add('is-revealed');
            }, this.o.logoDelay);
        }

        computeCrop(img) {
            if (!img.width || !img.height) return { sx: 0, sy: 0, sw: 1200, sh: 600 };
            const n = Math.min(400, img.width);
            const r = Math.max(1, Math.round(img.height * n / img.width));
            const canvas = document.createElement('canvas');
            canvas.width = n;
            canvas.height = r;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, n, r);
            const data = ctx.getImageData(0, 0, n, r).data;
            let top = r, bottom = -1;
            for (let y = 0; y < r; y++) {
                for (let x = 0; x < n; x++) {
                    const idx = (y * n + x) * 4;
                    if (data[idx + 3] < 16) continue;
                    let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    lum = Math.max(0, Math.min(255, (lum - 128) * this.o.contrast + 128));
                    if (lum <= this.o.cutoff) {
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                    }
                }
            }
            if (bottom < 0) return { sx: 0, sy: 0, sw: img.width, sh: img.height };
            const scale = img.height / r;
            const pad = (bottom - top + 1) * this.o.padY;
            const sy = Math.max(0, (top - pad) * scale);
            const sh = Math.min(img.height, (bottom + 1 + pad) * scale) - sy;
            return { sx: 0, sy, sw: img.width, sh };
        }

        build() {
            const canvas = this.canvas;
            if (!canvas || !this.img) return;
            const crop = this.crop;
            const width = canvas.clientWidth || this.root.clientWidth || 1200;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cols = Math.max(40, Math.min(300, Math.round(width / this.o.cellPx)));
            const aspect = crop.sh / (crop.sw || 1);
            const cellW = (width * dpr) / cols;
            const spacingX = cellW * this.o.tracking;
            const fontSize = cellW / 0.6;
            const lineHeight = fontSize * this.o.lineHeight;
            const rows = Math.max(1, Math.round(aspect * cols * 0.6 * this.o.tracking / this.o.lineHeight));

            canvas.width = Math.round(cols * spacingX);
            canvas.height = Math.round(rows * lineHeight);
            canvas.style.height = (width * canvas.height / canvas.width) + 'px';

            const offCanvas = document.createElement('canvas');
            offCanvas.width = cols;
            offCanvas.height = rows;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(this.img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cols, rows);
            const imgData = offCtx.getImageData(0, 0, cols, rows).data;

            const primaryRgb = this.hexToRgb(this.o.primary);
            const bgRgb = this.hexToRgb(this.o.bg);
            const dimRgb = [this.mix(0, primaryRgb[0], 0.35), this.mix(0, primaryRgb[1], 0.35), this.mix(0, primaryRgb[2], 0.35)];
            const flashRgb = [this.mix(primaryRgb[0], 255, 0.45), this.mix(primaryRgb[1], 255, 0.45), this.mix(primaryRgb[2], 255, 0.45)];
            const ramp = [
                [0, bgRgb[0], bgRgb[1], bgRgb[2]],
                [0.3, dimRgb[0], dimRgb[1], dimRgb[2]],
                [0.58, primaryRgb[0], primaryRgb[1], primaryRgb[2]],
                [1, flashRgb[0], flashRgb[1], flashRgb[2]]
            ];
            this.fl = flashRgb;
            const mid = this.rampAt(ramp, 0.62);
            this.midCol = `rgb(${mid.join(',')})`;

            const charset = this.o.charset.length ? this.o.charset : '01';
            const cells = [];
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = (y * cols + x) * 4;
                    if (imgData[idx + 3] < 16) continue;
                    let lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
                    lum = Math.max(0, Math.min(255, (lum - 128) * this.o.contrast + 128));
                    if (lum <= this.o.cutoff) {
                        cells.push({ x, y, lum });
                    }
                }
            }

            const sorted = cells.map(c => c.lum).sort((a, b) => a - b);
            const low = sorted.length ? sorted[Math.floor(sorted.length * 0.04)] : 0;
            const high = sorted.length ? sorted[Math.floor(sorted.length * 0.96)] : 255;
            const range = Math.max(1, high - low);

            this.cells = cells.map(c => {
                const norm = Math.max(0, Math.min(1, (c.lum - low) / range));
                const rgb = this.rampAt(ramp, norm);
                const centerDist = Math.abs(c.x / cols - 0.5) * 2;
                return {
                    cx: c.x * spacingX + spacingX / 2,
                    cy: c.y * lineHeight + lineHeight / 2,
                    cr: rgb[0],
                    cg: rgb[1],
                    cb: rgb[2],
                    col: `rgb(${rgb.join(',')})`,
                    ch: charset[Math.floor(Math.random() * charset.length)],
                    thr: 0.16 * Math.random() + 0.84 * centerDist,
                    seed: Math.floor(Math.random() * 1000),
                    live: Math.random() < 0.08,
                    tw: 170 + Math.random() * 340
                };
            });

            this.fontSize = fontSize;
            this.cw = width;
            this.charset = charset;
            this.root.style.background = this.o.bg;
        }

        draw() {
            const canvas = this.canvas;
            if (!canvas || !this.img) return;
            this.ensureBuilt();
            if (!this.cells) return;
            if (canvas.clientWidth && Math.abs(canvas.clientWidth - this.cw) > 4) {
                this.build();
                this.built = true;
                this.drawnAtZero = false;
            }
            if (this.progress === 0 && this.drawnAtZero) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 ' + this.fontSize.toFixed(2) + 'px ' + this.o.font;

            const chars = this.charset;
            const now = performance.now();
            const prog = Math.min(1.35, this.progress * 1.32);
            const animIndex = Math.floor(now / 42);
            const span = 0.16;

            for (const cell of this.cells) {
                const diff = prog - cell.thr;
                if (diff < -span) continue;
                if (diff < span) {
                    const alpha = (diff + span) / (2 * span);
                    ctx.globalAlpha = 0.4 + 0.6 * alpha;
                    ctx.fillStyle = alpha > 0.72 ? cell.col : this.midCol;
                    ctx.fillText(chars[(cell.seed + animIndex + (cell.cx | 0) * 2) % chars.length], cell.cx, cell.cy);
                    continue;
                }
                ctx.globalAlpha = 1;
                const flashDiff = diff - span;
                if (flashDiff < 0.13) {
                    const factor = (1 - flashDiff / 0.13) * 0.5;
                    const fl = this.fl;
                    ctx.fillStyle = `rgb(${this.mix(cell.cr, fl[0], factor)},${this.mix(cell.cg, fl[1], factor)},${this.mix(cell.cb, fl[2], factor)})`;
                } else {
                    ctx.fillStyle = cell.col;
                }
                ctx.fillText(cell.live ? chars[(cell.seed + Math.floor(now / cell.tw)) % chars.length] : cell.ch, cell.cx, cell.cy);
            }
            ctx.globalAlpha = 1;
            this.drawnAtZero = (this.progress === 0);
        }
    }
    window.BinaryReveal = BinaryReveal;

    function initBinaryReveals() {
        document.querySelectorAll('[data-binary-reveal]').forEach(el => {
            const expectedSrc = el.dataset.src || '/images/footer-sample.webp';
            if (el.__binaryReveal && !el.__binaryReveal.destroyed && el.__binaryReveal.o.src === expectedSrc) {
                return;
            }
            new BinaryReveal(el, {
                src: expectedSrc,
                primary: '#E8E8E3',
                bg: '#080807'
            });
        });
    }

    function initFooterControls() {
        const btn = document.getElementById('footer-back-to-top');
        if (btn && !btn.__bound) {
            btn.__bound = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const heroTarget = document.getElementById('hero') || document.getElementById('main') || 0;
                if (typeof window.triggerPageTransition === 'function') {
                    window.triggerPageTransition(heroTarget);
                } else if (window.__lenis) {
                    window.__lenis.scrollTo(0, { duration: 1.2 });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }

    // ========================================================
    // 14. LIVE UTC & IST TELEMETRY CLOCK
    // ========================================================
    function updateFooterClock() {
        const now = new Date();
        const clock = document.getElementById('footer-live-clock');
        if (clock) {
            clock.textContent = now.toUTCString().replace('GMT', 'UTC');
        }
        const istEls = document.querySelectorAll('[data-footer-clock]');
        if (istEls.length) {
            const istMs = now.getTime() + (5.5 * 3600 * 1000);
            const istDate = new Date(istMs);
            const hh = String(istDate.getUTCHours()).padStart(2, '0');
            const mm = String(istDate.getUTCMinutes()).padStart(2, '0');
            const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
            const istStr = `${hh}:${mm}:${ss} IST`;
            istEls.forEach(el => { el.textContent = istStr; });
        }
    }

    // ========================================================
    // 14B. HOMEPAGE-SPECIFIC ENGINES (TECH WALL & HANDS FIELD)
    // ========================================================
    function initClientsWall() {
        const staggerAmount = 0.35;
        if (prefersReducedMotion || !window.gsap) return;

        document.querySelectorAll('[data-logo-wall-cycle-init]').forEach(wallEl => {
            if (wallEl.__wallInit) return;
            wallEl.__wallInit = true;

            const listEl = wallEl.querySelector('[data-logo-wall-list]');
            if (!listEl) return;
            const items = Array.from(listEl.querySelectorAll('[data-logo-wall-item]'));
            const shouldShuffle = wallEl.getAttribute('data-logo-wall-shuffle') !== 'false';
            const targets = items.map(el => el.querySelector('[data-logo-wall-target]')).filter(Boolean);

            let visibleItems = [];
            let visibleCount = 0;
            let waitingQueue = [];
            let shuffledIndices = [];
            let currentIndex = 0;
            let masterTl = null;
            let st = null;

            const isVisible = (el) => window.getComputedStyle(el).display !== 'none';

            const shuffle = (arr) => {
                const copy = arr.slice();
                for (let i = copy.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [copy[i], copy[j]] = [copy[j], copy[i]];
                }
                return copy;
            };

            function restoreCleanTargetText(root) {
                root.querySelectorAll('[data-scramble-target]').forEach(s => {
                    if (s.dataset.originalText) s.textContent = s.dataset.originalText;
                });
            }

            function resetWall() {
                if (masterTl) masterTl.kill();
                visibleItems = items.filter(isVisible);
                visibleCount = visibleItems.length;
                if (visibleCount === 0) return;
                shuffledIndices = shuffle(Array.from({ length: visibleCount }, (_, idx) => idx));
                currentIndex = 0;

                // Ensure original target nodes are unscrambled before cloning
                targets.forEach(restoreCleanTargetText);

                // Clear existing mounted targets
                items.forEach(el => {
                    el.querySelectorAll('[data-logo-wall-target]').forEach(t => t.remove());
                });

                const targetClones = targets.map(t => {
                    const clone = t.cloneNode(true);
                    restoreCleanTargetText(clone);
                    return clone;
                });
                let initialTargets, queuedTargets;
                if (shouldShuffle) {
                    const shuf = shuffle(targetClones);
                    initialTargets = shuf.slice(0, visibleCount);
                    queuedTargets = shuffle(shuf.slice(visibleCount));
                } else {
                    initialTargets = targetClones.slice(0, visibleCount);
                    queuedTargets = targetClones.slice(visibleCount);
                }
                waitingQueue = initialTargets.concat(queuedTargets);

                for (let i = 0; i < visibleCount; i++) {
                    const parent = visibleItems[i].querySelector('[data-logo-wall-target-parent]') || visibleItems[i];
                    if (waitingQueue.length > 0) {
                        parent.appendChild(waitingQueue.shift());
                    }
                }

                masterTl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
                masterTl.call(cycleSlot);
                masterTl.play();
            }

            function getOrCreatePixels(parent) {
                const target = parent.querySelector('[data-logo-wall-target]');
                const w = target?.offsetWidth || parent.offsetWidth || 150;
                const h = target?.offsetHeight || parent.offsetHeight || 50;
                const cols = Math.max(1, Math.round(w / 8));
                const rows = Math.max(1, Math.round(h / 8));
                let existingPixels = parent.querySelector('.logo-wall__pixels');
                if (!existingPixels || existingPixels.dataset.size !== `${cols}x${rows}`) {
                    existingPixels?.remove();
                    existingPixels = document.createElement('div');
                    existingPixels.className = 'logo-wall__pixels';
                    existingPixels.setAttribute('aria-hidden', 'true');
                    existingPixels.dataset.size = `${cols}x${rows}`;
                    existingPixels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
                    existingPixels.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
                    existingPixels.innerHTML = Array.from({ length: cols * rows }, () =>
                        Math.random() < 0.12 ? '<i class="is-accent"></i>' : '<i></i>'
                    ).join('');
                    parent.appendChild(existingPixels);
                }
                return { el: existingPixels, cells: existingPixels.children };
            }

            function cycleSlot() {
                if (!document.body.contains(wallEl)) {
                    masterTl?.kill();
                    st?.kill();
                    return;
                }
                if (items.filter(isVisible).length !== visibleCount) {
                    resetWall();
                    return;
                }
                if (!waitingQueue.length) return;

                const slotIdx = shuffledIndices[currentIndex % visibleCount];
                currentIndex++;
                const slotItem = visibleItems[slotIdx];
                const parent = slotItem.querySelector('[data-logo-wall-target-parent]') || slotItem;
                if (parent.querySelectorAll('[data-logo-wall-target]').length > 1) return;

                const currentTarget = parent.querySelector('[data-logo-wall-target]');
                const nextTarget = waitingQueue.shift();
                restoreCleanTargetText(nextTarget);
                const pixelData = getOrCreatePixels(parent);

                gsap.set(nextTarget, { autoAlpha: 0 });
                parent.insertBefore(nextTarget, pixelData.el);

                gsap.timeline()
                    .to(pixelData.cells, {
                        autoAlpha: 1,
                        duration: 0.01,
                        stagger: { amount: staggerAmount, from: 'random' }
                    })
                    .call(() => {
                        if (currentTarget) {
                            currentTarget.remove();
                            restoreCleanTargetText(currentTarget);
                            waitingQueue.push(currentTarget);
                        }
                        gsap.set(nextTarget, { autoAlpha: 1 });
                    })
                    .to(pixelData.cells, {
                        autoAlpha: 0,
                        duration: 0.01,
                        stagger: { amount: staggerAmount, from: 'random' }
                    }, '+=0.08');
            }

            resetWall();

            let isTriggerActive = true;
            let isHovered = false;
            let isFocused = false;
            const pauseBtn = wallEl.querySelector('[data-logo-wall-pause]');

            function updatePlayState() {
                if (!document.body.contains(wallEl)) {
                    masterTl?.kill();
                    st?.kill();
                    document.removeEventListener('visibilitychange', updatePlayState);
                    window.removeEventListener('resize', onWallResize);
                    return;
                }
                const isUserPaused = pauseBtn?.getAttribute('aria-pressed') === 'true';
                if (isTriggerActive && !document.hidden && !isHovered && !isFocused && !isUserPaused) {
                    masterTl?.play();
                } else {
                    masterTl?.pause();
                }
            }

            if (window.ScrollTrigger) {
                st = ScrollTrigger.create({
                    trigger: wallEl,
                    start: 'top bottom',
                    end: 'bottom top',
                    onToggle: self => {
                        isTriggerActive = self.isActive;
                        updatePlayState();
                    }
                });
                isTriggerActive = st.isActive;
            }
            updatePlayState();

            wallEl.addEventListener('mouseenter', () => { isHovered = true; updatePlayState(); });
            wallEl.addEventListener('mouseleave', () => { isHovered = false; updatePlayState(); });
            wallEl.addEventListener('focusin', () => { isFocused = true; updatePlayState(); });
            wallEl.addEventListener('focusout', (e) => {
                if (!wallEl.contains(e.relatedTarget)) {
                    isFocused = false;
                    updatePlayState();
                }
            });

            if (pauseBtn) {
                pauseBtn.addEventListener('click', () => {
                    const nextState = pauseBtn.getAttribute('aria-pressed') !== 'true';
                    pauseBtn.setAttribute('aria-pressed', String(nextState));
                    pauseBtn.textContent = nextState ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause;
                    updatePlayState();
                });
                pauseBtn.removeAttribute('hidden');
            }

            document.addEventListener('visibilitychange', updatePlayState);

            let resizeTimer;
            function onWallResize() {
                if (!document.body.contains(wallEl)) {
                    window.removeEventListener('resize', onWallResize);
                    return;
                }
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (items.filter(isVisible).length !== visibleCount) {
                        resetWall();
                    }
                }, 100);
            }
            window.addEventListener('resize', onWallResize);
        });
    }

    const HERO_FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
    const HERO_MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const heroRemap = (v, min, max) => clamp01((v - min) / (max - min));
    const heroEaseOutCubic = (v) => 1 - Math.pow(1 - v, 3);
    const heroLerpInt = (a, b, t) => Math.round(a + (b - a) * t);

    function createHeroPRNG(seed) {
        return () => {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const DEFAULT_EMBLEM_SVG = {
        d: 'M210.842 239.173H140.342V478.346H210.841V398.621H280.682V558.07H210.842V637.794H70.501V159.449H210.842V239.173ZM491.523 478.346H562.023V637.794H421.683V239.173H491.523V478.346ZM70.5 558.07H0V318.897H70.5V558.07ZM421.682 398.621H351.183V478.346H280.683V318.897H351.182V159.449H421.682V398.621ZM280.682 159.448H140.342V0H280.682V159.448ZM421.682 159.448H280.683V0H421.682V159.448Z',
        vw: 600,
        vh: 680
    };

    class HandsField {
        constructor(canvas, image, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.img = image;
            this.bg = '#080807';
            this.gap = options.gap !== undefined ? options.gap : 0.22;
            this.handsYRatio = options.handsY !== undefined ? options.handsY : 0.80;

            this.open = 0;
            this.rise = 0;
            this.contact = 0;
            this.wave = 0;
            this.pointer = { x: 0.5, y: 0.5, on: 0 };
            this.last = -1;
            this.drawnPose = '';
            this.t0 = null;
            this.heroClearanceY = 0;

            this.emblemSrc = options.emblemSrc || DEFAULT_EMBLEM_SVG;
            this.crop = this.computeCrop();
            this.resize();
        }

        resetIntro() {
            this.t0 = null;
            this.last = -1;
            this.drawnPose = '';
            this.draw(0, true);
        }

        startIntro(nowMs = performance.now()) {
            this.t0 = nowMs;
            this.last = -1;
            this.drawnPose = '';
        }

        computeCrop() {
            const img = this.img;
            if (!img.width || !img.height) return { sy: 0, sh: 100 };
            const targetH = Math.round(img.height * 400 / img.width);
            const offCanvas = document.createElement('canvas');
            offCanvas.width = 400;
            offCanvas.height = targetH;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(img, 0, 0, 400, targetH);
            const data = offCtx.getImageData(0, 0, 400, targetH).data;

            let minY = targetH, maxY = -1;
            for (let y = 0; y < targetH; y++) {
                for (let x = 0; x < 400; x++) {
                    const idx = (y * 400 + x) * 4;
                    if (data[idx + 3] > 20) {
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            const scale = img.height / targetH;
            const pad = (maxY - minY + 1) * 0.08;
            const sy = Math.max(0, (minY - pad) * scale);
            const sh = Math.min(img.height, (maxY + 1 + pad) * scale) - sy;
            return { sy, sh };
        }

        lum(data, idx) {
            return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }

        resize() {
            const parent = this.canvas.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.round(rect.width);
            const h = Math.round(rect.height);
            if (w === 0 || h === 0) return;

            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
            this.width = w;
            this.height = h;
            this.portrait = h > w;

            const heroContent = document.querySelector('.home-hero__content');
            const subtitleEl = document.querySelector('.home-hero__subtitle');
            const actionsEl = document.querySelector('.home-hero__actions');
            let clearY = h * 0.52;
            if (heroContent) {
                const cRect = heroContent.getBoundingClientRect();
                const sBottom = subtitleEl ? subtitleEl.getBoundingClientRect().bottom : 0;
                const aBottom = actionsEl ? actionsEl.getBoundingClientRect().bottom : 0;
                clearY = Math.max(cRect.bottom, sBottom, aBottom) - rect.top;
            }
            this.heroClearanceY = clearY;

            this.buildHands();
            this.buildField();
            this.buildEmblem();
            this.last = -1;
        }

        buildHands() {
            const { img, crop, width, portrait } = this;
            if (!img.width || !img.height) {
                this.hands = { font: 10, lt: [255, 255, 255], midCol: 'rgb(140, 140, 136)', w: width, h: 100, stepX: 5, tipL: { cx: width * 0.45, cy: 50 }, tipR: { cx: width * 0.55, cy: 50 }, cells: [] };
                return;
            }
            const rng = createHeroPRNG(7);
            const targetW = portrait ? width * 1.7 : width * 1.25;
            const cols = portrait ? 260 : 270;
            const stepX = targetW / cols;
            const fontSize = stepX / 1.25 / 0.6;
            const stepY = fontSize * 1.3;
            const rows = Math.max(1, Math.round(crop.sh / img.width * cols * 0.6 * 1.25 / 1.3));

            const offCanvas = document.createElement('canvas');
            offCanvas.width = cols;
            offCanvas.height = rows;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(img, 0, crop.sy, img.width, crop.sh, 0, 0, cols, rows);
            const data = offCtx.getImageData(0, 0, cols, rows).data;

            const cells = [];
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = (y * cols + x) * 4;
                    if (data[idx + 3] < 20) continue;
                    const lum = this.lum(data, idx);
                    cells.push({ x, y, lum });
                }
            }

            const sortedLums = cells.map(c => c.lum).sort((a, b) => a - b);
            const lumMin = sortedLums[Math.floor(sortedLums.length * 0.04)] ?? 10;
            const lumMax = sortedLums[Math.floor(sortedLums.length * 0.96)] ?? 220;
            const lumRange = Math.max(1, lumMax - lumMin);

            let tipL = null, tipR = null;
            for (const c of cells) {
                if (c.x < cols / 2) {
                    if (!tipL || c.x > tipL.x) tipL = c;
                } else {
                    if (!tipR || c.x < tipR.x) tipR = c;
                }
            }

            const getCoord = (pt) => pt ? { cx: pt.x * stepX + stepX / 2, cy: pt.y * stepY + stepY / 2 } : { cx: targetW / 2, cy: rows * stepY / 2 };

            const sampleColor = (norm) => {
                const stops = [
                    [0.0, 8, 8, 7],
                    [0.22, 45, 45, 48],
                    [0.48, 120, 120, 116],
                    [0.75, 195, 195, 190],
                    [1.0, 245, 245, 240]
                ];
                for (let i = 1; i < stops.length; i++) {
                    if (norm <= stops[i][0]) {
                        const prev = stops[i - 1], curr = stops[i];
                        const t = (norm - prev[0]) / (curr[0] - prev[0]);
                        return [
                            heroLerpInt(prev[1], curr[1], t),
                            heroLerpInt(prev[2], curr[2], t),
                            heroLerpInt(prev[3], curr[3], t)
                        ];
                    }
                }
                return [245, 245, 240];
            };

            this.hands = {
                font: fontSize,
                lt: [255, 255, 255],
                midCol: 'rgb(140, 140, 136)',
                w: targetW,
                h: rows * stepY,
                stepX: stepX,
                tipL: getCoord(tipL),
                tipR: getCoord(tipR),
                cells: cells.map(c => {
                    const norm = clamp01((c.lum - lumMin) / lumRange);
                    const rgb = sampleColor(norm);
                    return {
                        cx: c.x * stepX + stepX / 2,
                        cy: c.y * stepY + stepY / 2,
                        c: rgb,
                        col: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
                        ch: HERO_MATRIX_CHARS[Math.floor(rng() * 36)],
                        thr: 0.16 * rng() + 0.84 * Math.abs(c.x / cols - 0.5) * 2,
                        seed: Math.floor(rng() * 1000),
                        live: rng() < 0.09,
                        tw: 170 + rng() * 340
                    };
                })
            };
        }

        buildField() {
            const { width, height, portrait } = this;
            const rng = createHeroPRNG(11);
            const step = portrait ? width / 32 : width / 64;
            const cols = Math.ceil(width / step);
            const rows = Math.ceil(height / (step * 1.4));
            const cells = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (rng() > 0.55) continue;
                    cells.push({
                        x: c * step + step / 2,
                        y: r * step * 1.4 + step * 0.7,
                        seed: Math.floor(rng() * 1000),
                        a: 0.04 + rng() * 0.08,
                        rate: 1 + Math.floor(rng() * 3),
                        ph: rng()
                    });
                }
            }
            this.field = { cells, font: Math.round(step * 0.42) };
        }

        setEmblem(d, vw, vh) {
            this.emblemSrc = { d, vw, vh };
            if (this.width && this.height) {
                this.buildEmblem();
            }
            this.last = -1;
        }

        buildEmblem() {
            const src = this.emblemSrc;
            if (!src) {
                this.emblem = null;
                return;
            }
            const { width, height, portrait } = this;
            const rng = createHeroPRNG(23);
            const emblemH = Math.min(height * 0.46, width * (portrait ? 0.6 : 0.4) * src.vh / src.vw);
            const emblemW = emblemH * src.vw / src.vh;
            const cols = portrait ? 30 : 44;
            const stepX = emblemW / cols;
            const fontSize = stepX / 0.75;
            const stepY = fontSize * 1.3;
            const rows = Math.max(1, Math.round(emblemH / stepY));

            const offCanvas = document.createElement('canvas');
            offCanvas.width = cols;
            offCanvas.height = rows;
            const offCtx = offCanvas.getContext('2d');
            offCtx.fillStyle = '#FFFFFF';
            offCtx.scale(cols / src.vw, rows / src.vh);
            offCtx.fill(new Path2D(src.d));

            const data = offCtx.getImageData(0, 0, cols, rows).data;
            const primary = [140, 140, 136];
            const lightChalk = [heroLerpInt(primary[0], 255, 0.55), heroLerpInt(primary[1], 255, 0.55), heroLerpInt(primary[2], 255, 0.55)];
            const cells = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (data[(r * cols + c) * 4 + 3] < 128) continue;
                    const rndVal = rng();
                    const colArr = [
                        heroLerpInt(primary[0], lightChalk[0], rndVal),
                        heroLerpInt(primary[1], lightChalk[1], rndVal),
                        heroLerpInt(primary[2], lightChalk[2], rndVal)
                    ];
                    cells.push({
                        dx: (c + 0.5) * stepX - emblemW / 2,
                        dy: (r + 0.5) * (emblemH / rows) - emblemH / 2,
                        col: `rgb(${colArr.join(',')})`,
                        ch: HERO_MATRIX_CHARS[Math.floor(rng() * 36)],
                        seed: Math.floor(rng() * 1000),
                        live: rng() < 0.12,
                        tw: 170 + Math.floor(rng() * 340),
                        jitter: rng() * 0.03
                    });
                }
            }
            this.emblem = { cells, font: fontSize, lt: lightChalk };
        }

        get handsY() {
            const baseRatio = this.handsYRatio ?? (this.portrait ? 0.82 : 0.80);
            const handsH = this.hands ? this.hands.h : 0;
            // Anchor hands strictly below hero copy/actions across all viewports
            const minClearY = (this.heroClearanceY || 0) + handsH * 0.50 + 12;
            const restY = Math.max(this.height * baseRatio, minClearY);
            return restY + (this.height * 0.48 - restY) * this.rise;
        }

        get gapPx() {
            return this.portrait ? 0 : this.width * this.gap;
        }

        get halfPx() {
            const baseGap = this.gapPx * (1 - this.contact);
            return (baseGap + this.open * this.width) / 2;
        }

        get touch() {
            const { width, height, hands } = this;
            const offsetX = (width - hands.w) / 2;
            const offsetY = this.handsY - hands.h / 2;
            return {
                x: (offsetX + (hands.tipL.cx + hands.tipR.cx) / 2) / width,
                y: (offsetY + (hands.tipL.cy + hands.tipR.cy) / 2) / height
            };
        }

        get exitWave() {
            return this.hands.w / 2 / this.width + 0.05;
        }

        draw(time, force = false) {
            this.drawCount = (this.drawCount || 0) + 1;
            const cycle = time % 12;
            const quantTime = prefersReducedMotion ? 1 : (time <= 4.0 ? Math.floor(time * 120) : Math.floor(time * 15));
            const p = this.pointer;
            const poseKey = [this.open, this.rise, this.contact, this.wave, p.on.toFixed(3), p.x.toFixed(3), p.y.toFixed(3)].join();

            if (!force && quantTime === this.last && poseKey === this.drawnPose) return false;
            this.last = quantTime;
            this.drawnPose = poseKey;

            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;
            if (!w || !h) return false;

            ctx.fillStyle = this.bg;
            ctx.fillRect(0, 0, w, h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const touch = this.touch;
            const touchX = touch.x * w;
            const touchY = touch.y * h;
            const waveRadius = this.wave * w;
            const waveThickness = w * (this.portrait ? 0.06 : 0.035);
            const waveIntensity = (x, y) => this.wave > 0 ? 1 - Math.abs(Math.hypot(x - touchX, y - touchY) - waveRadius) / waveThickness : 0;
            const waveAttenuation = 1 - 0.5 * clamp01(this.wave);

            const pointerX = p.x * w;
            const pointerY = p.y * h;
            const lensRadius = w * (this.portrait ? 0.16 : 0.095);
            const lensIntensity = (x, y) => p.on > 0 ? p.on * clamp01(1 - Math.hypot(x - pointerX, y - pointerY) / lensRadius) : 0;

            ctx.font = `700 ${this.field.font}px ${HERO_FONT_MONO}`;
            const fieldCycle = Math.floor(time * 24);
            for (const cell of this.field.cells) {
                const cellRate = Math.floor(cycle * cell.rate);
                const wInt = waveIntensity(cell.x, cell.y);
                if (wInt > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${(wInt * 0.9 * waveAttenuation).toFixed(3)})`;
                    ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fieldCycle) % 36], cell.x, cell.y);
                    continue;
                }
                const lInt = lensIntensity(cell.x, cell.y);
                if (lInt > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${(0.15 + 0.65 * lInt).toFixed(3)})`;
                    ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fieldCycle) % 36], cell.x, cell.y);
                    continue;
                }
                const pulse = cell.a * (0.55 + 0.45 * Math.sin((cycle / 12 + cell.ph) * Math.PI * 2));
                ctx.fillStyle = `rgba(232, 232, 227, ${(pulse * 0.15).toFixed(3)})`;
                ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + cellRate * 7) % 36], cell.x, cell.y);
            }

            const hands = this.hands;
            const introRaw = prefersReducedMotion ? 1 : heroRemap(time, 0.12, 3.45);
            const introEase = heroEaseOutCubic(introRaw);
            const introProgress = prefersReducedMotion ? 1.35 : (-0.18 + introEase * 1.40);
            const introSlide = prefersReducedMotion ? 0 : (1 - heroEaseOutCubic(heroRemap(time, 0.08, 2.60))) * (w * 0.035);
            const originX = (w - hands.w) / 2;
            const originY = this.handsY - hands.h / 2;
            const halfSeparation = this.halfPx;
            const F_BAND = 0.16;
            const timeMs = time * 1000;
            const fastTick = Math.floor(timeMs / 42);

            ctx.font = `700 ${hands.font.toFixed(2)}px ${HERO_FONT_MONO}`;

            for (const cell of hands.cells) {
                const relThr = introProgress - cell.thr;
                if (relThr < -0.16) continue;

                const isLeftSide = cell.cx < hands.w / 2;
                const posX = originX + cell.cx + (isLeftSide ? -(halfSeparation + introSlide) : (halfSeparation + introSlide));
                const posY = originY + cell.cy;
                if (posX < -20 || posX > w + 20) continue;

                if (relThr < F_BAND) {
                    const norm = (relThr + F_BAND) / (2 * F_BAND);
                    ctx.globalAlpha = 0.15 + 0.85 * heroEaseOutCubic(norm);
                    ctx.fillStyle = norm > 0.72 ? cell.col : hands.midCol;
                    ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fastTick + (cell.cx | 0) * 2) % 36], posX, posY);
                    continue;
                }

                ctx.globalAlpha = 1;
                const liveDiff = relThr - F_BAND;

                if ((this.wave > 0 && waveIntensity(posX, posY) > 0) || lensIntensity(posX, posY) > 0.25) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fastTick) % 36], posX, posY);
                    continue;
                }

                if (liveDiff < 0.13) {
                    const boost = (1 - liveDiff / 0.13) * 0.5;
                    ctx.fillStyle = `rgb(${heroLerpInt(cell.c[0], 255, boost)},${heroLerpInt(cell.c[1], 255, boost)},${heroLerpInt(cell.c[2], 255, boost)})`;
                } else {
                    ctx.fillStyle = cell.col;
                }
                ctx.fillText(cell.live ? HERO_MATRIX_CHARS[(cell.seed + Math.floor(timeMs / cell.tw)) % 36] : cell.ch, posX, posY);
            }

            ctx.globalAlpha = 1;

            if (this.emblem && this.wave > 0) {
                const emblem = this.emblem;
                ctx.font = `700 ${emblem.font.toFixed(2)}px ${HERO_FONT_MONO}`;
                for (const cell of emblem.cells) {
                    const diff = this.wave - (Math.hypot(cell.dx, cell.dy) / w + cell.jitter);
                    if (diff < 0) continue;

                    let posX = touchX + cell.dx;
                    let posY = touchY + cell.dy;

                    if (diff < 0.04) {
                        ctx.fillStyle = diff < 0.015 ? '#FFFFFF' : `rgb(${emblem.lt.join(',')})`;
                        ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fastTick) % 36], posX, posY);
                        continue;
                    }

                    const lInt = lensIntensity(posX, posY);
                    if (lInt > 0) {
                        const dist = Math.hypot(posX - pointerX, posY - pointerY) || 1;
                        const shift = lInt * emblem.font * 0.38;
                        posX += (posX - pointerX) / dist * shift;
                        posY += (posY - pointerY) / dist * shift;
                        ctx.fillStyle = lInt > 0.55 ? '#FFFFFF' : `rgb(${emblem.lt.join(',')})`;
                        ctx.fillText(HERO_MATRIX_CHARS[(cell.seed + fastTick) % 36], posX, posY);
                        continue;
                    }

                    ctx.fillStyle = cell.col;
                    ctx.fillText(cell.live ? HERO_MATRIX_CHARS[(cell.seed + Math.floor(timeMs / cell.tw)) % 36] : cell.ch, posX, posY);
                }
            }

            const contactFlash = heroRemap(this.contact, 0.9, 1.0) * (1 - heroRemap(this.wave, 0, 0.3));
            if (contactFlash > 0) {
                const flashRadius = w * (0.05 + this.wave * 0.6);
                const grad = ctx.createRadialGradient(touchX, touchY, 0, touchX, touchY, flashRadius);
                grad.addColorStop(0, `rgba(255, 255, 255, ${(0.95 * contactFlash).toFixed(3)})`);
                grad.addColorStop(0.25, `rgba(232, 232, 227, ${(0.65 * contactFlash).toFixed(3)})`);
                grad.addColorStop(1, 'rgba(232, 232, 227, 0)');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = grad;
                ctx.fillRect(touchX - flashRadius, touchY - flashRadius, flashRadius * 2, flashRadius * 2);
                ctx.globalCompositeOperation = 'source-over';
            }

            return true;
        }
    }

    function initHomeHandsField() {
        const handsCanvas = document.getElementById('hands-canvas');
        const heroStage = document.getElementById('hero-stage');
        if (!handsCanvas || !heroStage || handsCanvas.__handsInit) return;
        handsCanvas.__handsInit = true;

        let handsField = null;
        let handsRafId = null;
        let handsObserver = null;
        let heroSt = null;
        const heroHandsImg = new Image();

        const initHands = () => {
            if (handsField || !document.body.contains(handsCanvas)) return;
            handsField = new HandsField(handsCanvas, heroHandsImg, { gap: 0.22, handsY: 0.80 });
            window.__handsField = handsField;

            const onHandsResize = () => {
                if (!document.body.contains(handsCanvas)) {
                    window.removeEventListener('resize', onHandsResize);
                    return;
                }
                handsField.resize();
            };
            window.addEventListener('resize', onHandsResize, { passive: true });

            const navLogoSvg = document.querySelector('.bottom-nav__logo svg');
            if (navLogoSvg) {
                const vb = navLogoSvg.getAttribute('viewBox');
                if (vb) {
                    const [, , vw, vh] = vb.split(/\s+/).map(Number);
                    const d = [...navLogoSvg.querySelectorAll('path')].map(p => p.getAttribute('d')).join(' ');
                    if (d && vw && vh) {
                        handsField.setEmblem(d, vw, vh);
                    }
                }
            }

            let targetPointerX = 0.5, targetPointerY = 0.5;
            let targetPointerOn = 0;
            let curPointerX = 0.5, curPointerY = 0.5;
            let curPointerOn = 0;

            heroStage.addEventListener('pointerenter', () => { targetPointerOn = 1; }, { passive: true });
            heroStage.addEventListener('pointerleave', () => { targetPointerOn = 0; }, { passive: true });
            heroStage.addEventListener('pointermove', (e) => {
                const w = handsField.width || window.innerWidth;
                const h = handsField.height || window.innerHeight;
                if (!w || !h) return;
                targetPointerX = e.clientX / w;
                targetPointerY = e.clientY / h;
            }, { passive: true });

            const heroTrackEl = document.getElementById('hero-track');
            const heroInnerEl = document.querySelector('.home-hero__inner');

            if (heroTrackEl && window.ScrollTrigger) {
                if (window.__homeHeroSt) {
                    try { window.__homeHeroSt.kill(); } catch (e) {}
                    window.__homeHeroSt = null;
                }
                heroSt = ScrollTrigger.create({
                    trigger: heroTrackEl,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                    onUpdate: (self) => {
                        const p = self.progress;
                        const easeInOutCubic = v => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

                        const pText = clamp01(p / 0.20);
                        if (heroInnerEl) {
                            heroInnerEl.style.opacity = String(1 - pText);
                            heroInnerEl.style.transform = `translateY(${-60 * pText}px)`;
                            heroInnerEl.style.visibility = pText >= 1 ? 'hidden' : 'visible';
                        }
                        const riseP = clamp01((p - 0.05) / 0.35);
                        handsField.rise = easeInOutCubic(riseP);

                        const contactP = clamp01((p - 0.28) / 0.22);
                        handsField.contact = easeInOutCubic(contactP);

                        const touch = handsField.touch || { x: 0.5, y: 0.48 };
                        const w = handsField.width || window.innerWidth;
                        const h = handsField.height || window.innerHeight;
                        const u = h / (w || 1);
                        const d = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => Math.hypot(x - touch.x, (y - touch.y) * u)));
                        const f = Math.max(d, handsField.exitWave || 1) + 0.05;
                        const waveP = clamp01((p - 0.52) / 0.45);
                        handsField.wave = f * Math.pow(waveP, 1.25);

                        handsField.open = 2 * handsField.wave;
                    }
                });
                window.__homeHeroSt = heroSt;
            }

            let handsIsVisible = true;
            let handsTabActive = !document.hidden;

            function pauseHands() {
                if (handsRafId) {
                    cancelAnimationFrame(handsRafId);
                    handsRafId = null;
                }
            }

            function tickHands() {
                if (!document.body.contains(handsCanvas)) {
                    pauseHands();
                    handsObserver?.disconnect();
                    heroSt?.kill();
                    document.removeEventListener('visibilitychange', onHandsVisChange);
                    window.removeEventListener('resize', onHandsResize);
                    return;
                }
                if (!handsIsVisible || !handsTabActive) {
                    handsRafId = null;
                    return;
                }

                const isCovering = document.documentElement.classList.contains('is-loading') || Boolean(window.__isTransitionCovering);
                if (isCovering) {
                    if (handsField.t0 !== null) {
                        handsField.resetIntro();
                    }
                    handsRafId = requestAnimationFrame(tickHands);
                    return;
                }

                if (handsField.t0 === null || handsField.t0 === undefined) {
                    handsField.t0 = performance.now();
                    handsField.last = -1;
                }

                const now = (performance.now() - handsField.t0) / 1000;

                curPointerOn += (targetPointerOn - curPointerOn) * 0.10;
                curPointerX += (targetPointerX - curPointerX) * 0.12;
                curPointerY += (targetPointerY - curPointerY) * 0.12;

                handsField.pointer.on = curPointerOn;
                handsField.pointer.x = curPointerX;
                handsField.pointer.y = curPointerY;

                handsField.draw(now);
                handsRafId = requestAnimationFrame(tickHands);
            }

            function resumeHands() {
                if (!handsRafId && handsIsVisible && handsTabActive && document.body.contains(handsCanvas)) {
                    handsRafId = requestAnimationFrame(tickHands);
                }
            }

            function onHandsVisChange() {
                if (!document.body.contains(handsCanvas)) {
                    document.removeEventListener('visibilitychange', onHandsVisChange);
                    pauseHands();
                    return;
                }
                handsTabActive = !document.hidden;
                if (handsTabActive && handsIsVisible) {
                    resumeHands();
                } else {
                    pauseHands();
                }
            }

            if ('IntersectionObserver' in window && heroTrackEl) {
                handsObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        handsIsVisible = entry.isIntersecting;
                        if (handsIsVisible) {
                            resumeHands();
                        } else {
                            pauseHands();
                        }
                    });
                }, { threshold: 0.01 });
                handsObserver.observe(heroTrackEl);
            }

            document.addEventListener('visibilitychange', onHandsVisChange);
            resumeHands();
        };

        heroHandsImg.onload = initHands;
        heroHandsImg.src = '/assets/god-hands.webp';
        if (heroHandsImg.complete) initHands();
        if (heroHandsImg.decode) {
            heroHandsImg.decode().then(initHands).catch(() => {});
        }
    }

    function initHomeWorksSubBarObserver() {
        if (window.__homeWorksSubBarObserver) {
            window.__homeWorksSubBarObserver.disconnect();
            window.__homeWorksSubBarObserver = null;
        }
        const subBar = document.querySelector('[data-sub-bar]');
        const fpSection = document.getElementById('works');
        if (!subBar || !fpSection) return;

        const syncVisibility = (isIntersecting) => {
            subBar.classList.toggle('is-visible', Boolean(isIntersecting));
        };

        if ('IntersectionObserver' in window) {
            const subBarObserver = new IntersectionObserver(([entry]) => {
                syncVisibility(entry.isIntersecting);
            }, { threshold: 0.08 });
            subBarObserver.observe(fpSection);
            window.__homeWorksSubBarObserver = subBarObserver;
        }

        const rect = fpSection.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
        syncVisibility(ratio >= 0.08);
    }
    window.initHomeWorksSubBarObserver = initHomeWorksSubBarObserver;

    window.initHomeSpecificEngines = function initHomeSpecificEngines() {
        initClientsWall();
        initHomeHandsField();
        initHomeWorksSubBarObserver();
    };

    // ========================================================
    // 15. UNIVERSAL LIFECYCLE RE-INITIALIZATION HOOK
    // ========================================================
    function reinitializeAllPageEngines(cleanPath = window.location.pathname) {
        if (!document.getElementById('hero-track') && window.__homeHeroSt) {
            try { window.__homeHeroSt.kill(); } catch (e) {}
            window.__homeHeroSt = null;
        }
        initLenis();
        initReticleCursor();
        initScrollReveals();
        initAnthraciteNav(cleanPath);
        initPixelReveals();
        initManifestoScrollers();
        initEthosEngines();
        initCardsMotion();
        initPageHeroStages(cleanPath);
        initSubpageScrollAnimations();
        initFaqAccordions();
        initBinaryReveals();
        initFooterControls();
        updateFooterClock();

        if (typeof window.initHomeSpecificEngines === 'function') {
            window.initHomeSpecificEngines();
        }

        if (window.ScrollTrigger) {
            ScrollTrigger.refresh();
        }
    }
    window.reinitializeAllPageEngines = reinitializeAllPageEngines;

    // --- Startup ---
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                if (document.documentElement.classList.contains('is-loading')) {
                    runInitialHomeLoader();
                }
            }
            reinitializeAllPageEngines();
        });
    } else {
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            if (document.documentElement.classList.contains('is-loading')) {
                runInitialHomeLoader();
            }
        }
        reinitializeAllPageEngines();
    }

    setInterval(updateFooterClock, 1000);
})();
