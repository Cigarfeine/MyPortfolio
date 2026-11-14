/**
 * Arshad Rafi - Multi-Page ClientRouter Engine
 * Modeled after Anthracite Studio (Astro ClientRouter + GSAP Character-Sweep Transition)
 * Manages parallel fetch, DOM swapping of <main> and <footer>, history pushState/popstate,
 * context-sensitive sub-bar filter panels, and page lifecycle re-initialization.
 */

(function () {
    const isMobile = window.innerWidth <= 991;

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    function normalizeRoutePath(pathname) {
        return (pathname || '/').replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    }

    const SHARED_CSS_HREF = '/styles/shared.css?v=20261115b';
    const pageCache = new Map();
    const prefetchInFlight = new Map();
    const prefetchedAssets = new Set();

    function fetchPageHtml(targetUrl) {
        const urlObj = typeof targetUrl === 'string' ? new URL(targetUrl, window.location.origin) : targetUrl;
        const cacheKey = normalizeRoutePath(urlObj.pathname);
        if (pageCache.has(cacheKey)) {
            return Promise.resolve(pageCache.get(cacheKey));
        }
        if (prefetchInFlight.has(cacheKey)) {
            return prefetchInFlight.get(cacheKey);
        }
        const req = fetch(urlObj.href, { cache: 'default' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                pageCache.set(cacheKey, html);
                prefetchInFlight.delete(cacheKey);
                return html;
            })
            .catch(err => {
                prefetchInFlight.delete(cacheKey);
                throw err;
            });
        prefetchInFlight.set(cacheKey, req);
        return req;
    }

    function warmSharedStylesheet(href = SHARED_CSS_HREF) {
        if (prefetchedAssets.has(href)) return;
        prefetchedAssets.add(href);
        if (document.querySelector('link[rel="stylesheet"][href*="/styles/shared.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        link.setAttribute('data-shared-css-preload', '');
        document.head.appendChild(link);
    }

    function getHomeInlineStyle() {
        const cached = document.querySelector('head > style[data-home-style]');
        if (cached) return cached;
        const styles = document.querySelectorAll('head > style');
        for (const s of styles) {
            if (s.textContent && s.textContent.length > 10000) {
                s.setAttribute('data-home-style', 'true');
                return s;
            }
        }
        return null;
    }

    function syncStylesheetsBeforeSwap(newDoc, targetCleanPath) {
        const isHomeTarget = targetCleanPath === '' || targetCleanPath === '/';
        const homeStyle = getHomeInlineStyle();
        const sharedCssLink = document.querySelector('link[rel="stylesheet"][href*="/styles/shared.css"]');

        if (isHomeTarget) {
            if (homeStyle) {
                homeStyle.disabled = false;
                if (sharedCssLink) sharedCssLink.disabled = true;
            } else if (sharedCssLink) {
                sharedCssLink.disabled = false;
            }
            return Promise.resolve();
        }

        const newSharedCss = newDoc.querySelector('link[rel="stylesheet"][href*="/styles/shared.css"]');
        const sharedHref = (newSharedCss && newSharedCss.getAttribute('href')) || SHARED_CSS_HREF;
        if (sharedCssLink) {
            sharedCssLink.disabled = false;
            if (homeStyle) homeStyle.disabled = true;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sharedHref;
            link.setAttribute('data-shared-css', '');
            const finish = () => {
                if (homeStyle) homeStyle.disabled = true;
                resolve();
            };
            link.onload = finish;
            link.onerror = finish;
            setTimeout(finish, 1500);
            document.head.appendChild(link);
        });
    }

    function scheduleIdlePrefetch() {
        const runPrefetch = () => {
            const currentPath = normalizeRoutePath(window.location.pathname);
            if (currentPath === '/') {
                warmSharedStylesheet(SHARED_CSS_HREF);
            }
            ['/about/', '/services/', '/projects/'].forEach((route, idx) => {
                if (normalizeRoutePath(route) === currentPath) return;
                setTimeout(() => {
                    fetchPageHtml(route).catch(() => {});
                }, idx * 180);
            });
        };
        if ('requestIdleCallback' in window) {
            requestIdleCallback(runPrefetch, { timeout: 2200 });
        } else {
            setTimeout(runPrefetch, 900);
        }
    }

    function topScrollImmediate() {
        if (typeof window.forceScrollTopZero === 'function') {
            window.forceScrollTopZero();
            return;
        }
        document.documentElement.style.scrollBehavior = 'auto';
        if (window.__lenis) {
            try {
                window.__lenis.scrollTo(0, { immediate: true, force: true });
            } catch (e) {}
        }
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
    }

    // --- Sub-Bar Context Panels Registry ---
    function updateSubBarForRoute(pathname) {
        const subBar = document.querySelector('[data-sub-bar]');
        if (!subBar) return;

        const cleanPath = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
        const panels = subBar.querySelectorAll('[data-bar-panel]');
        panels.forEach(p => p.classList.remove('is-active'));

        let activePanelId = null;
        if (cleanPath === '' || cleanPath === '/') {
            activePanelId = 'projects-view';
        } else if (cleanPath === '/projects') {
            activePanelId = 'projects-filter';
        } else if (cleanPath === '/news') {
            activePanelId = 'news-filter';
        } else if (cleanPath === '/faq') {
            activePanelId = 'faq-filter';
        }

        if (cleanPath !== '' && cleanPath !== '/' && window.__homeWorksSubBarObserver) {
            window.__homeWorksSubBarObserver.disconnect();
            window.__homeWorksSubBarObserver = null;
        }

        if (activePanelId) {
            const matching = subBar.querySelector(`[data-bar-panel="${activePanelId}"]`);
            if (matching) {
                matching.classList.add('is-active');
                subBar.style.display = '';
                if (cleanPath !== '/' && cleanPath !== '') {
                    subBar.classList.add('is-visible');
                } else if (typeof window.initHomeWorksSubBarObserver === 'function') {
                    window.initHomeWorksSubBarObserver();
                } else {
                    const fpSection = document.getElementById('works');
                    if (fpSection) {
                        const rect = fpSection.getBoundingClientRect();
                        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
                        const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
                        subBar.classList.toggle('is-visible', ratio >= 0.08);
                    } else {
                        subBar.classList.remove('is-visible');
                    }
                }
            } else {
                subBar.style.display = 'none';
                subBar.classList.remove('is-visible');
            }
        } else {
            subBar.style.display = 'none';
            subBar.classList.remove('is-visible');
        }

        initFooterSubBarObserver();
    }

    // --- Auto-hide .sub-bar when .site-footer enters viewport ---
    function initFooterSubBarObserver() {
        if (window.__footerSubBarObserver) {
            window.__footerSubBarObserver.disconnect();
            window.__footerSubBarObserver = null;
        }
        if (window.__footerSubBarScrollHandler) {
            window.removeEventListener('scroll', window.__footerSubBarScrollHandler, { passive: true });
            window.__footerSubBarScrollHandler = null;
        }

        const subBar = document.querySelector('[data-sub-bar]');
        if (!subBar) return;

        subBar.classList.remove('sub-bar--hidden');

        const footer = document.querySelector('.site-footer');
        if (!footer || subBar.style.display === 'none') return;

        const syncFooterOverlap = (isIntersecting) => {
            if (!subBar || subBar.style.display === 'none') {
                subBar.classList.remove('sub-bar--hidden');
                return;
            }
            subBar.classList.toggle('sub-bar--hidden', Boolean(isIntersecting));
        };

        if ('IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    syncFooterOverlap(entry.isIntersecting);
                });
            }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });
            obs.observe(footer);
            window.__footerSubBarObserver = obs;
        } else {
            const checkFooterRect = () => {
                const rect = footer.getBoundingClientRect();
                syncFooterOverlap(rect.top < window.innerHeight + 60 && rect.bottom > 0);
            };
            window.__footerSubBarScrollHandler = checkFooterRect;
            window.addEventListener('scroll', checkFooterRect, { passive: true });
            checkFooterRect();
        }
    }

    // --- Update Navbar & Footer active states ---
    function updateActiveNavigation(url) {
        const cleanPath = new URL(url, window.location.origin).pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
        
        // Bottom Nav links
        document.querySelectorAll('.bottom-nav__link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkPath = new URL(href, window.location.origin).pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
            if (linkPath === cleanPath) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        // Site Footer links
        document.querySelectorAll('.site-footer__link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkPath = new URL(href, window.location.origin).pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
            if (linkPath === cleanPath) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    // --- Page Lifecycle Hooks ---
    function reinitializePageEngines(cleanPath, targetHash = '') {
        const hash = targetHash || '';
        const isTopTarget = !hash || hash === '#hero' || hash === '#main';

        // 1. Sub-Bar (also refreshes footer overlap observer)
        updateSubBarForRoute(cleanPath);

        // 2. Shared Engines Lifecycle (Lenis, Reticle, Reveals, Navbar, ScrollTriggers, BinaryReveal)
        if (typeof window.reinitializeAllPageEngines === 'function') {
            window.reinitializeAllPageEngines(cleanPath);
        } else if (typeof window.initScrollReveals === 'function') {
            window.initScrollReveals();
        }

        // 3. Ensure home reveals arm cleanly if any stale reveal--done state remained
        const normalizedCleanPath = normalizeRoutePath(cleanPath);
        if (normalizedCleanPath === '/' && document.querySelector('.reveal--done') && typeof window.resetRevealsForHome === 'function') {
            window.resetRevealsForHome();
        }

        // 4. Subpage Specific Initializations
        initProjectsFilter();
        initNewsFilter();
        initNewsInteractions();
        initFaqFilter();
        initNextProjectPortals();
        initLighthouseCounters();

        // 5. Enforce exact scroll position after layout & ScrollTrigger refresh
        if (!isTopTarget) {
            const target = document.querySelector(hash);
            if (target) {
                setTimeout(() => {
                    if (window.__lenis) {
                        window.__lenis.scrollTo(target, { offset: -80 });
                    } else {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
                return;
            }
        }

        if ((window.scrollY || 0) > 0 || (document.documentElement.scrollTop || 0) > 0) {
            topScrollImmediate();
        }
    }

    // --- Interactive Engineering Dispatch Drawer on /news/ ---
    function initNewsInteractions() {
        const existingDrawer = document.querySelector('[data-dispatch-drawer]');
        if (existingDrawer) {
            existingDrawer.classList.remove('is-open');
            existingDrawer.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('has-drawer-open');
            if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
        }

        const cards = document.querySelectorAll('.news-card');
        if (!cards.length) return;

        let lastTriggerEl = null;

        const ensureDrawer = () => {
            let drawer = document.querySelector('[data-dispatch-drawer]');
            if (drawer) return drawer;

            drawer = document.createElement('div');
            drawer.className = 'dispatch-drawer';
            drawer.setAttribute('data-dispatch-drawer', '');
            drawer.setAttribute('role', 'dialog');
            drawer.setAttribute('aria-modal', 'true');
            drawer.setAttribute('aria-hidden', 'true');
            drawer.setAttribute('aria-labelledby', 'dispatch-drawer-title');
            drawer.innerHTML = `
                <div class="dispatch-drawer__backdrop" data-dispatch-close></div>
                <article class="dispatch-drawer__panel">
                    <header class="dispatch-drawer__head">
                        <span class="dispatch-drawer__kicker" data-dispatch-kicker>Engineering Note</span>
                        <button type="button" class="dispatch-drawer__close" data-dispatch-close aria-label="Close dispatch panel">
                            Close <span aria-hidden="true">&times;</span>
                        </button>
                    </header>
                    <div class="dispatch-drawer__scroll" data-lenis-prevent>
                        <figure class="dispatch-drawer__media" data-dispatch-media-wrap style="display:none;">
                            <img src="" alt="" data-dispatch-img />
                        </figure>
                        <div class="dispatch-drawer__meta" data-dispatch-meta></div>
                        <h2 id="dispatch-drawer-title" class="dispatch-drawer__title" data-dispatch-title></h2>
                        <div class="dispatch-drawer__body" data-dispatch-body></div>
                        <footer class="dispatch-drawer__foot" data-dispatch-foot></footer>
                    </div>
                </article>
            `;
            document.body.appendChild(drawer);

            drawer.querySelectorAll('[data-dispatch-close]').forEach((el) => {
                el.addEventListener('click', () => closeDrawer());
            });

            if (!window.__dispatchEscBound) {
                window.__dispatchEscBound = true;
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        const activeDrawer = document.querySelector('[data-dispatch-drawer].is-open');
                        if (activeDrawer) closeDrawer();
                    }
                });
            }

            return drawer;
        };

        const closeDrawer = () => {
            const drawer = document.querySelector('[data-dispatch-drawer]');
            if (!drawer || !drawer.classList.contains('is-open')) return;
            drawer.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('has-drawer-open');
            if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
            if (lastTriggerEl && typeof lastTriggerEl.focus === 'function') {
                lastTriggerEl.focus({ preventScroll: true });
                lastTriggerEl = null;
            }
        };

        const openDrawerFromCard = (card) => {
            const drawer = ensureDrawer();
            lastTriggerEl = card;

            const titleEl = card.querySelector('.news-card__title, h2, h3');
            const titleText = (titleEl ? titleEl.textContent : 'Engineering Dispatch').trim();

            const tagEls = card.querySelectorAll('.news-card__date, time');
            const tags = Array.from(tagEls)
                .map((el) => el.textContent.trim())
                .filter(Boolean);
            const rawCat = (card.getAttribute('data-cat') || card.getAttribute('data-category') || '').trim();
            const cat = rawCat ? rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase() : '';
            if (cat && !tags.some((t) => t.toLowerCase() === cat.toLowerCase())) {
                tags.unshift(cat);
            }

            const descEls = card.querySelectorAll('.news-card__desc, p');
            const paragraphs = Array.from(descEls)
                .map((el) => el.textContent.trim())
                .filter(Boolean);

            const customDetail = card.getAttribute('data-detail') || card.querySelector('[data-dispatch-detail]')?.innerHTML || '';
            const cardImg = card.querySelector('img');
            const href = card.getAttribute('href') || card.querySelector('a[href]')?.getAttribute('href') || '';

            const kickerEl = drawer.querySelector('[data-dispatch-kicker]');
            const metaEl = drawer.querySelector('[data-dispatch-meta]');
            const drawerTitle = drawer.querySelector('[data-dispatch-title]');
            const bodyEl = drawer.querySelector('[data-dispatch-body]');
            const footEl = drawer.querySelector('[data-dispatch-foot]');
            const mediaWrap = drawer.querySelector('[data-dispatch-media-wrap]');
            const drawerImg = drawer.querySelector('[data-dispatch-img]');

            if (kickerEl) {
                kickerEl.textContent = cat || 'Engineering Note';
            }

            if (metaEl) {
                metaEl.innerHTML = '';
                const uniqueTags = Array.from(new Set(tags));
                uniqueTags.forEach((tag) => {
                    const chip = document.createElement('span');
                    chip.className = 'dispatch-drawer__chip';
                    chip.textContent = tag;
                    metaEl.appendChild(chip);
                });
            }

            if (drawerTitle) drawerTitle.textContent = titleText;

            if (mediaWrap && drawerImg) {
                if (cardImg && cardImg.getAttribute('src')) {
                    drawerImg.src = cardImg.getAttribute('src');
                    drawerImg.alt = cardImg.getAttribute('alt') || titleText;
                    mediaWrap.style.display = '';
                } else {
                    drawerImg.removeAttribute('src');
                    mediaWrap.style.display = 'none';
                }
            }

            if (bodyEl) {
                bodyEl.innerHTML = '';
                if (paragraphs.length) {
                    paragraphs.forEach((txt) => {
                        const p = document.createElement('p');
                        p.className = 'dispatch-drawer__p';
                        p.textContent = txt;
                        bodyEl.appendChild(p);
                    });
                }
                if (customDetail) {
                    const extra = document.createElement('div');
                    extra.className = 'dispatch-drawer__extra';
                    extra.innerHTML = customDetail;
                    bodyEl.appendChild(extra);
                }
            }

            if (footEl) {
                footEl.innerHTML = '';
                if (href && href !== '#' && !href.startsWith('javascript:') && !/\/news\/?$/.test(href)) {
                    const extLink = document.createElement('a');
                    extLink.className = 'dispatch-drawer__action';
                    extLink.href = href;
                    extLink.setAttribute('data-cursor', 'OPEN');
                    extLink.textContent = 'View full write-up ↗';
                    extLink.addEventListener('click', () => closeDrawer());
                    footEl.appendChild(extLink);
                }
                const hint = document.createElement('span');
                hint.className = 'dispatch-drawer__hint';
                hint.textContent = 'Press Esc or click outside to close';
                footEl.appendChild(hint);
            }

            drawer.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            document.documentElement.classList.add('has-drawer-open');
            if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();

            const closeBtn = drawer.querySelector('.dispatch-drawer__close');
            if (closeBtn) closeBtn.focus({ preventScroll: true });
        };

        cards.forEach((card) => {
            if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
            if (card.tagName !== 'BUTTON' && card.tagName !== 'A') {
                card.setAttribute('role', 'button');
            }
            card.setAttribute('aria-haspopup', 'dialog');
            if (!card.hasAttribute('data-cursor')) card.setAttribute('data-cursor', 'READ');

            card.onclick = (e) => {
                e.preventDefault();
                openDrawerFromCard(card);
            };
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDrawerFromCard(card);
                }
            };
        });
    }

    // --- Projects Category Filtering on /projects/ ---
    function initProjectsFilter() {
        const filterBar = document.querySelector('[data-bar-panel="projects-filter"]');
        const loop = document.querySelector('#projets-loop');
        if (!filterBar || !loop) return;

        const buttons = filterBar.querySelectorAll('button[data-filter]');
        const cards = loop.querySelectorAll('.fp__card');

        buttons.forEach(btn => {
            btn.onclick = () => {
                buttons.forEach(b => {
                    b.setAttribute('aria-pressed', 'false');
                    b.classList.remove('is-active');
                });
                btn.setAttribute('aria-pressed', 'true');
                btn.classList.add('is-active');

                const targetType = btn.getAttribute('data-filter');
                loop.classList.add('is-switching');

                setTimeout(() => {
                    let visibleIndex = 0;
                    const shownCards = [];
                    cards.forEach(card => {
                        const cardType = card.getAttribute('data-type');
                        const matches = targetType === 'all' || cardType === targetType;
                        if (matches) {
                            card.style.display = '';
                            const slotNum = (visibleIndex % 5) + 1;
                            card.setAttribute('data-slot', slotNum.toString());
                            const fig = card.querySelector('.fp__fig');
                            if (fig) {
                                fig.classList.add('is-in', 'is-done');
                            }
                            shownCards.push(card);
                            visibleIndex++;
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    loop.classList.remove('is-switching');

                    if (window.gsap && shownCards.length) {
                        window.gsap.fromTo(
                            shownCards,
                            { opacity: 0, y: 18 },
                            { opacity: 1, y: 0, duration: 0.42, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }
                        );
                    }
                    if (typeof window.refreshCardsMotion === 'function') {
                        window.refreshCardsMotion();
                    }
                    if (window.ScrollTrigger) ScrollTrigger.refresh();
                    initFooterSubBarObserver();
                }, 280);
            };
        });
    }

    // --- News Topic Filtering on /news/ ---
    function initNewsFilter() {
        const filterBar = document.querySelector('[data-bar-panel="news-filter"]');
        const grid = document.querySelector('.news__grid');
        if (!filterBar || !grid) return;

        const buttons = filterBar.querySelectorAll('button[data-filter]');
        const cards = grid.querySelectorAll('.news-card');

        buttons.forEach(btn => {
            btn.onclick = () => {
                buttons.forEach(b => {
                    b.setAttribute('aria-pressed', 'false');
                    b.classList.remove('is-active');
                });
                btn.setAttribute('aria-pressed', 'true');
                btn.classList.add('is-active');

                const topic = btn.getAttribute('data-filter');
                cards.forEach(card => {
                    const matches = topic === 'all' || card.getAttribute('data-cat') === topic;
                    card.style.display = matches ? '' : 'none';
                });
                if (window.ScrollTrigger) ScrollTrigger.refresh();
            };
        });
    }

    // --- FAQ Topic Filtering on /faq/ ---
    function initFaqFilter() {
        const filterBar = document.querySelector('[data-bar-panel="faq-filter"]');
        const list = document.querySelector('.faq-acc');
        if (!filterBar || !list) return;

        const buttons = filterBar.querySelectorAll('button[data-filter]');
        const items = list.querySelectorAll('.faq-acc__item');

        buttons.forEach(btn => {
            btn.onclick = () => {
                buttons.forEach(b => {
                    b.setAttribute('aria-pressed', 'false');
                    b.classList.remove('is-active');
                });
                btn.setAttribute('aria-pressed', 'true');
                btn.classList.add('is-active');

                const group = btn.getAttribute('data-filter');
                items.forEach(item => {
                    const matches = group === 'all' || item.getAttribute('data-faq-group') === group;
                    item.style.display = matches ? '' : 'none';
                });
                if (window.ScrollTrigger) ScrollTrigger.refresh();
            };
        });
    }

    // --- Case Study Next Project Portal & Pixel Decode ---
    function initNextProjectPortals() {
        const portal = document.querySelector('[data-project-next]');
        if (!portal) return;

        const canvas = portal.querySelector('[data-next-canvas]');
        const progressBar = portal.querySelector('[data-next-bar]');
        const targetUrl = portal.getAttribute('data-href');
        if (!canvas || !targetUrl) return;

        portal.onclick = () => {
            navigate(targetUrl);
        };

        const ctx = canvas.getContext('2d');
        const src = portal.getAttribute('data-src');
        if (src) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                canvas.width = 640;
                canvas.height = 360;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }

        // Scroll listener for portal progress
        if (window.ScrollTrigger) {
            ScrollTrigger.create({
                trigger: portal,
                start: 'top bottom',
                end: 'bottom bottom',
                onUpdate: (self) => {
                    const p = self.progress;
                    if (progressBar) progressBar.style.width = (p * 100) + '%';
                    if (p >= 0.99 && !portal.hasAttribute('data-navigated')) {
                        portal.setAttribute('data-navigated', 'true');
                        navigate(targetUrl);
                    }
                }
            });
        }
    }

    // --- Lighthouse Score Number Count-up ---
    function initLighthouseCounters() {
        const scoreEls = document.querySelectorAll('[data-count]');
        scoreEls.forEach(el => {
            const target = parseInt(el.getAttribute('data-count'), 10) || 100;
            let current = 0;
            const duration = 1400;
            const startTime = performance.now();

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const val = Math.floor(progress * target);
                el.textContent = val.toString();
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = target.toString();
                }
            }
            requestAnimationFrame(tick);
        });
    }

    // --- Main Router Navigate Function ---
    async function navigate(url, options = {}) {
        const pushState = options.pushState !== undefined ? options.pushState : true;
        const isPopstate = !!options.isPopstate;
        if (window.isNavigating && !isPopstate) return;

        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(url, window.location.origin);
        const currentCleanPath = normalizeRoutePath(currentUrl.pathname);
        const targetCleanPath = normalizeRoutePath(targetUrl.pathname);

        const closeNavIfOpen = () => {
            if (typeof window.closeBottomNav === 'function') {
                window.closeBottomNav();
            } else {
                const nav = document.querySelector('[data-bottom-nav-init]');
                if (nav && nav.getAttribute('data-bottom-nav-open') === 'true') {
                    nav.querySelector('[data-bottom-nav-toggle]')?.click();
                }
            }
        };

        const syncTopRouteState = () => {
            topScrollImmediate();
            if (currentCleanPath === '/' && typeof window.resetRevealsForHome === 'function') {
                window.resetRevealsForHome();
            }
            updateActiveNavigation(targetUrl.href);
            updateSubBarForRoute(currentCleanPath);
            if (typeof window.initAnthraciteNav === 'function') {
                window.initAnthraciteNav(currentCleanPath);
            }
            if (window.ScrollTrigger) {
                try { ScrollTrigger.refresh(); } catch (e) {}
            }
            topScrollImmediate();
        };

        const runSamePageTopTransition = () => {
            if (pushState && (currentUrl.hash || currentUrl.pathname !== targetUrl.pathname)) {
                history.pushState({ path: targetUrl.pathname }, document.title, targetUrl.pathname);
            }
            window.isNavigating = false;
            if (typeof window.triggerPageTransition === 'function') {
                window.triggerPageTransition(0, syncTopRouteState);
            } else {
                syncTopRouteState();
                requestAnimationFrame(() => topScrollImmediate());
            }
        };

        // Same-page hash navigation
        if (targetCleanPath === currentCleanPath && targetUrl.hash) {
            closeNavIfOpen();
            if (targetUrl.hash === '#hero' || targetUrl.hash === '#main') {
                runSamePageTopTransition();
                return;
            }
            const targetEl = document.querySelector(targetUrl.hash);
            if (targetEl) {
                window.isNavigating = false;
                if (pushState) history.pushState({ path: targetUrl.pathname }, document.title, targetUrl.hash);
                if (typeof window.triggerPageTransition === 'function') {
                    window.triggerPageTransition(targetEl);
                } else if (window.__lenis) {
                    window.__lenis.scrollTo(targetEl, { offset: -80 });
                } else {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
                return;
            }
        }

        // Same-page root/top navigation: play preloader sweep animation while returning cleanly to landing/page top
        if (targetCleanPath === currentCleanPath && !targetUrl.hash) {
            closeNavIfOpen();
            runSamePageTopTransition();
            return;
        }

        // Cross-page Pjax navigation
        closeNavIfOpen();
        window.isNavigating = true;
        if (window.__lenis) {
            try { window.__lenis.stop(); } catch (e) {}
        }
        document.documentElement.classList.add('is-page-transition');
        const overlay = document.querySelector('[data-page-transition]');
        if (overlay && window.gsap) {
            if (typeof window.prepareSweepLines === 'function') {
                window.prepareSweepLines();
            }
            overlay.classList.add('is-on');
            gsap.killTweensOf(overlay);
            await gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.in' });
            window.__isTransitionCovering = true;
        }

        // Play sweep lines in parallel with fetch
        let sweepDuration = 0.8;
        if (typeof window.playSweepSequence === 'function') {
            sweepDuration = window.playSweepSequence(1.0);
        }

        try {
            // Parallel fetch target page (reusing in-memory / HTTP cache)
            const fetchPromise = fetchPageHtml(targetUrl);

            const [htmlText] = await Promise.all([
                fetchPromise,
                new Promise(r => setTimeout(r, Math.max(300, (sweepDuration - 0.28) * 1000)))
            ]);

            // Parse incoming document
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(htmlText, 'text/html');

            // 0. Kill stale ScrollTriggers and reset scroll before DOM swap
            if (window.__homeHeroSt) {
                try { window.__homeHeroSt.kill(); } catch (e) {}
                window.__homeHeroSt = null;
            }
            if (window.ScrollTrigger) {
                ScrollTrigger.getAll().forEach(st => {
                    try { st.kill(); } catch (e) {}
                });
                if (typeof ScrollTrigger.clearScrollMemory === 'function') {
                    try { ScrollTrigger.clearScrollMemory('manual'); } catch (e) {}
                }
            }
            topScrollImmediate();

            // 0.5 Sync target stylesheet BEFORE swapping DOM so layout & reveals measure final CSS once
            await syncStylesheetsBeforeSwap(newDoc, targetCleanPath);

            // Update document URL before DOM swap so relative asset URLs resolve against the target route
            if (pushState) {
                history.pushState({ path: targetUrl.pathname }, newDoc.title, targetUrl.href);
            }

            // 1. Swap <main>
            const currentMain = document.getElementById('main');
            const newMain = newDoc.getElementById('main');
            if (currentMain && newMain) {
                currentMain.innerHTML = newMain.innerHTML;
                currentMain.className = newMain.className;
            }

            // 2. Swap or preserve <footer> (keep live BinaryReveal instance across swaps)
            const currentFooter = document.querySelector('.site-footer');
            const newFooter = newDoc.querySelector('.site-footer');
            if (currentFooter && newFooter) {
                const currentBrEl = currentFooter.matches?.('[data-binary-reveal]')
                    ? currentFooter
                    : currentFooter.querySelector('[data-binary-reveal]');
                const newBrEl = newFooter.matches?.('[data-binary-reveal]')
                    ? newFooter
                    : newFooter.querySelector('[data-binary-reveal]');
                const currentSrc = currentBrEl?.dataset?.src || currentFooter.dataset.src || '/images/footer-sample.webp';
                const nextSrc = newBrEl?.dataset?.src || newFooter.dataset.src || '/images/footer-sample.webp';
                const br = currentBrEl?.__binaryReveal;
                if (br && !br.destroyed && currentSrc === nextSrc) {
                    currentFooter.className = newFooter.className;
                    currentFooter.classList.remove('is-revealed');
                    currentBrEl.classList.remove('is-revealed');
                    currentFooter.style.display = '';
                    if (!br.armed) {
                        br.armed = true;
                        cancelAnimationFrame(br.raf);
                        br.stopTwinkle?.();
                        br.progress = 0;
                        br.drawnAtZero = false;
                        br.resetFooter?.();
                    }
                } else {
                    currentFooter.innerHTML = newFooter.innerHTML;
                    currentFooter.className = newFooter.className;
                    currentFooter.style.display = '';
                }
            } else if (currentFooter && !newFooter) {
                currentFooter.style.display = 'none';
            } else if (!currentFooter && newFooter) {
                document.body.appendChild(newFooter);
            }

            // 2.5 Swap or sync Sub-Bar inner contents
            const currentSubBarInner = document.querySelector('[data-sub-bar-inner]');
            const newSubBarInner = newDoc.querySelector('[data-sub-bar-inner]');
            if (currentSubBarInner && newSubBarInner) {
                currentSubBarInner.innerHTML = newSubBarInner.innerHTML;
            }

            // 3. Update <title> and metadata
            document.title = newDoc.title;
            const newOgTitle = newDoc.querySelector('meta[property="og:title"]');
            if (newOgTitle) {
                const currentOgTitle = document.querySelector('meta[property="og:title"]');
                if (currentOgTitle) currentOgTitle.setAttribute('content', newOgTitle.getAttribute('content'));
            }

            // 4. Update active navigation UI
            updateActiveNavigation(targetUrl.href);

            // 6. Wait for fonts & calm frames
            try {
                await document.fonts.ready;
            } catch (e) {}

            // 7. Re-initialize page engines
            reinitializePageEngines(targetUrl.pathname, targetUrl.hash);

            // 8. Let browser settle layout, paint, and compositor layers while overlay still covers
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        } catch (err) {
            window.__isTransitionCovering = false;
            console.error('ClientRouter navigation error, falling back to full load:', err);
            window.location.href = targetUrl.href;
            return;
        }

        // Fade out overlay
        if (overlay && window.gsap) {
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.45,
                ease: 'power2.out',
                onStart: () => {
                    window.__isTransitionCovering = false;
                    requestAnimationFrame(() => {
                        if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
                    });
                    if (window.__handsField && typeof window.__handsField.startIntro === 'function') {
                        window.__handsField.startIntro();
                    }
                },
                onComplete: () => {
                    window.__isTransitionCovering = false;
                    overlay.classList.remove('is-on');
                    if (typeof window.resetSweepOverlay === 'function') {
                        window.resetSweepOverlay();
                    }
                    document.documentElement.classList.remove('is-page-transition');
                    window.isNavigating = false;
                    if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
                }
            });
        } else {
            window.__isTransitionCovering = false;
            if (typeof window.computeRevealBars === 'function') window.computeRevealBars();
            if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
            if (window.__handsField && typeof window.__handsField.startIntro === 'function') {
                window.__handsField.startIntro();
            }
            if (overlay) overlay.classList.remove('is-on');
            if (typeof window.resetSweepOverlay === 'function') {
                window.resetSweepOverlay();
            }
            document.documentElement.classList.remove('is-page-transition');
            window.isNavigating = false;
        }
    }

    // Expose router globally
    window.ClientRouter = {
        navigate,
        updateSubBarForRoute,
        updateActiveNavigation
    };

    function prefetchLinkTarget(targetEl) {
        const link = targetEl?.closest?.('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank' || link.hasAttribute('download')) return;
        let url;
        try {
            url = new URL(href, window.location.origin);
        } catch (err) {
            return;
        }
        if (url.origin !== window.location.origin) return;
        const cleanTarget = normalizeRoutePath(url.pathname);
        if (cleanTarget === normalizeRoutePath(window.location.pathname)) return;
        if (cleanTarget !== '/') warmSharedStylesheet(SHARED_CSS_HREF);
        fetchPageHtml(url).catch(() => {});
    }

    document.addEventListener('pointerover', (e) => prefetchLinkTarget(e.target), { passive: true });
    document.addEventListener('focusin', (e) => prefetchLinkTarget(e.target), { passive: true });

    // Global Link Click Interceptor
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        const link = e.target.closest('a');
        if (!link) return;

        // Skip non-HTTP, download, target="_blank", or external URLs
        const href = link.getAttribute('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') return;
        if (link.hasAttribute('download')) return;

        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        e.preventDefault();
        navigate(url.href);
    });

    // Handle Browser Back / Forward buttons
    window.addEventListener('popstate', (e) => {
        navigate(window.location.href, { pushState: false, isPopstate: true });
    });

    // Initial page load setup & sweep reveal
    async function initShell() {
        updateActiveNavigation(window.location.href);
        updateSubBarForRoute(window.location.pathname);

        const overlay = document.querySelector('[data-page-transition]');
        if (document.documentElement.classList.contains('is-loading')) {
            document.documentElement.classList.remove('is-loading');
            if (overlay && window.gsap) {
                window.__isTransitionCovering = true;
                overlay.classList.add('is-on');
                gsap.set(overlay, { opacity: 1 });
                try {
                    await document.fonts.ready;
                } catch (e) {}
                gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.5,
                    ease: 'power2.out',
                    delay: 0.1,
                    onStart: () => {
                        window.__isTransitionCovering = false;
                        requestAnimationFrame(() => {
                            if (typeof window.computeRevealBars === 'function') window.computeRevealBars();
                            if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
                        });
                    },
                    onComplete: () => {
                        window.__isTransitionCovering = false;
                        overlay.classList.remove('is-on');
                        document.documentElement.classList.remove('is-page-transition');
                        if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
                    }
                });
            } else {
                if (overlay) overlay.classList.remove('is-on');
                requestAnimationFrame(() => {
                    if (typeof window.computeRevealBars === 'function') window.computeRevealBars();
                    if (typeof window.revealVisibleNow === 'function') window.revealVisibleNow();
                });
            }
        } else if (overlay && !document.documentElement.classList.contains('is-page-transition')) {
            overlay.classList.remove('is-on');
        }

        reinitializePageEngines(window.location.pathname);
        scheduleIdlePrefetch();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initShell);
    } else {
        initShell();
    }

})();
