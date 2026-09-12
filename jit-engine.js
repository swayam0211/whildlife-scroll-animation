/* ═══════════════════════════════════════════════════════════════
   STEP 3: PREDICTIVE SLIDING WINDOW (+/- 2 SECTIONS) & PRE-BUFFER ENGINE
   ═══════════════════════════════════════════════════════════════ */
(function (window) {
    'use strict';

    class SlidingWindowEngine {
        constructor() {
            this.sections = new Map();
            this.cachedUrls = new Set();
            this.initObserver();
            this.initBackgroundPrebuffer();
        }

        // 1. Idle Background Pre-buffer into Browser HTTP Cache
        initBackgroundPrebuffer() {
            const mediaToCache = [
                'hero/swyam_edit_30mb.mp4',
                'sec3/air5sec.mp4',
                'sec3/water5sec.mp4',
                'sec3/forest.mp4',
                'login_page/lion-3.glb',
                'login_page/eagle-3.glb',
                'login_page/crock-3.glb'
            ];

            const cacheMedia = () => {
                mediaToCache.forEach(url => {
                    if (this.cachedUrls.has(url)) return;
                    this.cachedUrls.add(url);
                    // Silent background pre-fetch into browser HTTP cache
                    fetch(url, { mode: 'cors', cache: 'force-cache' })
                        .catch(() => {});
                });
            };

            if ('requestIdleCallback' in window) {
                requestIdleCallback(cacheMedia, { timeout: 2000 });
            } else {
                setTimeout(cacheMedia, 500);
            }
        }

        // 2. Predictive Sliding Window Observer (+/- 2 Viewport Sections)
        initObserver() {
            // +/- 2 Sections viewport margin (200vh lookahead/behind)
            const rootMargin = '200vh 0px 200vh 0px';

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const targetId = entry.target.id || entry.target.dataset.jitId;
                    const config = this.sections.get(targetId);
                    if (!config) return;

                    if (entry.isIntersecting) {
                        // Enter Sliding Window (+/- 2 Sections): Load & Attach from Cache
                        if (typeof config.onEnter === 'function') {
                            if (!config.booted || config.repeat) {
                                config.booted = true;
                                config.onEnter(entry.target);
                            }
                        }
                        // Connect data-src videos instantly from local browser cache
                        const vids = entry.target.querySelectorAll('video[data-src]');
                        vids.forEach(v => {
                            if (!v.src && v.dataset.src) {
                                v.muted = true;
                                v.playsInline = true;
                                v.setAttribute('playsinline', '');
                                v.setAttribute('webkit-playsinline', '');
                                v.src = v.dataset.src;
                                v.load();
                                const playPromise = v.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(() => {});
                                }
                            }
                        });
                    } else {
                        // Exit Sliding Window (> +/- 2 Sections): Evict & Reclaim RAM/VRAM
                        if (typeof config.onExit === 'function') {
                            config.onExit(entry.target);
                        }
                        const vids = entry.target.querySelectorAll('video[data-src]');
                        vids.forEach(v => {
                            if (v.src) {
                                v.pause();
                                v.removeAttribute('src');
                                v.load(); // Flush hardware video decoder memory
                            }
                        });
                    }
                });
            }, {
                root: null,
                rootMargin: rootMargin,
                threshold: 0.001
            });
        }

        register(elementOrId, options = {}) {
            const setup = () => {
                let el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
                if (!el) return;
                const id = el.id || (el.id = `jit-${Math.random().toString(36).substr(2, 9)}`);
                el.dataset.jitId = id;
                const config = typeof options === 'function' ? { onEnter: options } : options;
                this.sections.set(id, config);
                this.observer.observe(el);
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setup);
            } else {
                setup();
            }
        }
    }

    window.WildlifeJIT = new SlidingWindowEngine();
})(window);
