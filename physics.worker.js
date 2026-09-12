/* ═══════════════════════════════════════════════════════════════
   STEP 6: WEB WORKER OFFLOADING FOR PARTICLE & SPATIAL PHYSICS
   ═══════════════════════════════════════════════════════════════ */
self.onmessage = function (e) {
    const data = e.data;
    if (!data || !data.type) return;

    if (data.type === 'MAGNETIC_TEXT') {
        const { mouseX, mouseY, chars, threshold } = data;
        const count = chars.length;
        // Result array layout: [moveX, moveY, scale, prox] for each character
        const output = new Float32Array(count * 4);

        for (let i = 0; i < count; i++) {
            const char = chars[i];
            const dx = mouseX - char.cx;
            const dy = mouseY - char.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const offset = i * 4;
            if (dist < threshold && dist > 0) {
                const prox = 1 - (dist / threshold);
                output[offset] = (dx / dist) * prox * 10;     // moveX
                output[offset + 1] = (dy / dist) * prox * 10; // moveY
                output[offset + 2] = 1 + (prox * 0.22);       // scale
                output[offset + 3] = prox;                    // proximity
            } else {
                output[offset] = 0;
                output[offset + 1] = 0;
                output[offset + 2] = 1.0;
                output[offset + 3] = 0;
            }
        }

        // Send results back to main thread using zero-copy Transferable ArrayBuffer
        self.postMessage({ type: 'MAGNETIC_TEXT_RESULT', output: output }, [output.buffer]);
    } else if (data.type === 'PUPIL_TRACKING') {
        const { cursorX, cursorY, faceX, faceY, maxMoveH, maxMoveV, currentLX, currentLY } = data;
        const dx = cursorX - faceX;
        const dy = cursorY - faceY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const focusStrength = Math.max(0, 1 - dist / 500);
        const dirX = dist > 0 ? dx / dist : 0;
        const dirY = dist > 0 ? dy / dist : 0;

        const targetX = dirX * maxMoveH * focusStrength;
        const targetY = dirY * maxMoveV * focusStrength;

        const nextLX = currentLX + (targetX - currentLX) * 0.08;
        const nextLY = currentLY + (targetY - currentLY) * 0.08;

        self.postMessage({ type: 'PUPIL_TRACKING_RESULT', lx: nextLX, ly: nextLY });
    }
};
