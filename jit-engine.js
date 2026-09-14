/* ═══════════════════════════════════════════════════════════════
   STEP 3: PREDICTIVE SLIDING WINDOW (+/- 4SECTIONS) & PRIORITY PRE-BUFFER ENGINE
   ═══════════════════════════════════════════════════════════════ */
(function (window) {
    'use strict';

    const PRIORITY = {
        CRITICAL: 1,
        HIGH: 2,
        BACKGROUND: 3
    };

    class SlidingWindowEngine {
        constructor() {
            this.sections = new Map();
            this.cachedUrls = new Set();
            this.queue = [];
            this.inFlight = 0;
            this.maxConcurrent = this.getConcurrencyLimit();

            this.initObserver();
            this.initBackgroundPrebuffer();
        }

        getConcurrencyLimit() {
            if (navigator.connection) {
                const effectiveType = navigator.connection.effectiveType;
                if (effectiveType === '2g' || effectiveType === 'slow-2g' || navigator.connection.saveData) {
                    return 2;
                }
            }
            return 4;
        }

        // 1. Priority Queue Asset Downloader
        preload(urls, priority = PRIORITY.BACKGROUND) {
            const list = Array.isArray(urls) ? urls : [urls];
            list.forEach(url => {
                if (!url || this.cachedUrls.has(url)) return;
                this.queue.push({ url, priority });
            });
            // Sort queue by priority ascending (1 = CRITICAL first)
            this.queue.sort((a, b) => a.priority - b.priority);
            this.processQueue();
        }

        processQueue() {
            while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
                const item = this.queue.shift();
                if (this.cachedUrls.has(item.url)) continue;

                this.cachedUrls.add(item.url);
                this.inFlight++;

                this.fetchAsset(item.url)
                    .catch(() => {})
                    .finally(() => {
                        this.inFlight--;
                        this.processQueue();
                    });
            }
        }

        fetchAsset(url) {
            return new Promise((resolve, reject) => {
                const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(url);
                const isVideo = /\.(mp4|webm|ogv)$/i.test(url);

                if (isImage) {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = url;
                } else if (isVideo) {
                    // For video, fetch first 512KB to populate browser HTTP cache without downloading whole video
                    fetch(url, { headers: { Range: 'bytes=0-524287' }, mode: 'cors', cache: 'force-cache' })
                        .then(resolve)
                        .catch(() => {
                            // Fallback to standard fetch
                            fetch(url, { mode: 'cors', cache: 'force-cache' }).then(resolve).catch(reject);
                        });
                } else {
                    // 3D models (.glb), JSON, etc.
                    fetch(url, { mode: 'cors', cache: 'force-cache' })
                        .then(resolve)
                        .catch(reject);
                }
            });
        }

        // 2. Event-Driven State Machine Background Pre-buffer
        initBackgroundPrebuffer() {
            if (this.prebufferStarted) return;

            const runPrebuffer = () => {
                if (this.prebufferStarted) return;
                this.prebufferStarted = true;

                // Tier 1: HIGH priority (Portal Videos + First 3 Ring Animals)
                this.preload([
                    'sec3/air5sec.mp4',
                    'sec3/water5sec.mp4',
                    'ring/lion7.webp',
                    'ring/tiger4.webp',
                    'ring/red fox1.webp'
                ], PRIORITY.HIGH);

                // Tier 2: BACKGROUND priority (Remaining Ring Animals + 3D Models)
                this.preload([
                    'ring/lepord3.webp',
                    'ring/bear6.webp',
                    'ring/cheetah5.webp',
                    'ring/deer2.webp',
                    'ring/giraff8.webp',
                    'ring/komodo_gradon9.webp',
                    'login_page/lion-3.glb',
                    'login_page/eagle-3.glb',
                    'login_page/crock-3.glb'
                ], PRIORITY.BACKGROUND);
            };

            this.wakeUp = runPrebuffer;

            // Trigger background downloads when user starts interacting/scrolling OR when system becomes idle
            const triggerEvents = ['scroll', 'touchmove', 'pointerdown', 'wheel'];
            const onUserActivity = () => {
                runPrebuffer();
                triggerEvents.forEach(e => window.removeEventListener(e, onUserActivity));
            };

            triggerEvents.forEach(e => window.addEventListener(e, onUserActivity, { passive: true }));

            // Idle fallback after hero video has settled (4s)
            if ('requestIdleCallback' in window) {
                requestIdleCallback(runPrebuffer, { timeout: 4000 });
            } else {
                setTimeout(runPrebuffer, 4000);
            }
        }

        // 3. Robust Video Playback Helper with Retries
        ensureVideoPlayable(video, retries = 3) {
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');

            if (!video.src && video.dataset.src) {
                video.src = video.dataset.src;
            }

            const attemptPlay = (remainingAttempts) => {
                if (video.readyState >= 2) {
                    const promise = video.play();
                    if (promise !== undefined) {
                        promise.catch(() => {});
                    }
                } else if (remainingAttempts > 0) {
                    video.load();
                    setTimeout(() => attemptPlay(remainingAttempts - 1), 400);
                } else {
                    // Last resort force play
                    video.play().catch(() => {});
                }
            };

            attemptPlay(retries);
        }

        // 4. Predictive Sliding Window Observer (+/- 4 Viewport Sections lookahead)
        initObserver() {
            // 2000px lookahead margin so assets pre-buffer well before reaching viewport
            const rootMargin = '2000px 0px 2000px 0px';

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const targetId = entry.target.id || entry.target.dataset.jitId;
                    const config = this.sections.get(targetId);
                    if (!config) return;

                    if (entry.isIntersecting) {
                        // Enter Sliding Window: Boot section & start videos safely
                        if (typeof config.onEnter === 'function') {
                            if (!config.booted || config.repeat) {
                                config.booted = true;
                                config.onEnter(entry.target);
                            }
                        }
                        const vids = entry.target.querySelectorAll('video');
                        vids.forEach(v => this.ensureVideoPlayable(v));
                    } else {
                        // Exit Sliding Window: Pause to save GPU/CPU
                        if (typeof config.onExit === 'function') {
                            config.onExit(entry.target);
                        }
                        const vids = entry.target.querySelectorAll('video');
                        vids.forEach(v => v.pause());
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
    window.WildlifeJIT.PRIORITY = PRIORITY;
})(window);

