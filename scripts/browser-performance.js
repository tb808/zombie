/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  await page.goto('about:blank');
  const errors = [], onConsole = msg => { if (msg.type() === 'error') errors.push(msg.text()); }, onError = e => errors.push(e.message);
  page.on('console', onConsole); page.on('pageerror', onError);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.title-card button')?.disabled, {}, { timeout: 60000 });
  const result = await page.evaluate(async () => {
    const g = window.__nachtwache, canvas = document.querySelector('.game-canvas'), gl = canvas.getContext('webgl2');
    let lost = 0; canvas.addEventListener('webglcontextlost', () => lost++);
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const profile = { viewport: [innerWidth, innerHeight], devicePixelRatio, renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), userAgent: navigator.userAgent };
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const views = [
      ['forest', -101, 40, -130, 4, 65, 12],
      ['city', 151, 4, 181, 3, -20, 12],
      ['interior', 198, 31.6, 200.65, 1, 30, 12],
      ['night', 151, 4, 181, 3, -20, 0],
    ], regions = [];
    for (const [name, x, z, tx, ty, tz, hour] of views) {
      g.start(); g.teleport(x, z); g.aim(tx, ty, tz); g.setTime(hour); g.resume();
      // Let shader uploads and the adaptive resolution settle before sampling.
      const warmupUntil=performance.now()+5000;
      while(performance.now()<warmupUntil)await frame();
      const intervals = [], calls = [], triangles = [], begin = performance.now(); let previous = await frame();
      for (let i = 0; i < 48; i++) {
        const now = await frame(); intervals.push(now - previous); previous = now;
        const render = g.state().render; calls.push(render.calls); triangles.push(render.triangles);
      }
      // Readback is outside the timing window. Read in the render RAF before the
      // browser presents the non-preserved canvas; black alpha is otherwise normal.
      let black = 0;
      for (let i = 0; i < 8; i++) {
        await frame();
        const bytes = new Uint8Array(24 * 24 * 4); gl.readPixels(gl.drawingBufferWidth / 2 - 12, gl.drawingBufferHeight / 2 - 12, 24, 24, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        if (bytes.every((v, at) => at % 4 === 3 || v < 3)) black++;
      }
      const sorted = [...intervals].sort((a, b) => a - b), at = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
      regions.push({ name, warmupMs:5000,intervalsMs: intervals, medianMs: at(.5), p95Ms: at(.95), longFrames: intervals.filter(t => t > 50).length, calls: Math.round(calls.reduce((a, b) => a + b) / calls.length), triangles: Math.round(triangles.reduce((a, b) => a + b) / triangles.length), blackSamples: black, sampleWindowMs: performance.now() - begin, telemetry: g.performance?.() });
    }
    g.pause();
    return { kind: g.performance ? 'candidate' : 'baseline', profile, regions, contextLosses: lost, glError: gl.getError() };
  });
  result.errors = errors; page.off('console', onConsole); page.off('pageerror', onError);
  return result;
}
