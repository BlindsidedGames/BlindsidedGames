const canvas = document.querySelector('[data-dot-field]');
if (!(canvas instanceof HTMLCanvasElement)) {
  // Nothing to render if the canvas is not present.
} else {
  const context = canvas.getContext('2d', { alpha: true });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (context) {
    const state = {
      width: 0,
      height: 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      particles: [],
      scroll: {
        current: 0,
        target: 0,
        parallaxX: 0,
        parallaxY: 0
      },
      pointer: {
        x: -9999,
        y: -9999,
        active: false
      }
    };

    const createParticles = () => {
      const area = state.width * state.height;
      const minDensity = state.width < 900 ? 520 : 720;
      const maxDensity = state.width < 900 ? 1240 : 2200;
      const density = Math.max(minDensity, Math.min(maxDensity, Math.floor(area / 1600)));
      const starColors = [
        'rgba(236, 233, 255, 1)',
        'rgba(210, 201, 255, 1)',
        'rgba(186, 177, 234, 1)'
      ];

      state.particles = [];
      for (let index = 0; index < density; index += 1) {
        const baseX = Math.random() * state.width;
        const baseY = Math.random() * state.height;
        const isBright = Math.random() > 0.92;

        state.particles.push({
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          radius: isBright ? 1.35 + Math.random() * 0.8 : 0.5 + Math.random() * 1.05,
          alpha: isBright ? 0.34 + Math.random() * 0.24 : 0.12 + Math.random() * 0.18,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          depth: 0.35 + Math.random() * 0.9,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.0006 + Math.random() * 0.0014
        });
      }
    };

    const resize = () => {
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.scroll.current = window.scrollY || 0;
      state.scroll.target = window.scrollY || 0;

      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;

      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      createParticles();
      drawFrame(0);
    };

    const movePointer = (clientX, clientY) => {
      state.pointer.x = clientX;
      state.pointer.y = clientY;
      state.pointer.active = true;
    };

    const clearPointer = () => {
      state.pointer.active = false;
      state.pointer.x = -9999;
      state.pointer.y = -9999;
    };

    const updateParticles = () => {
      const interactionRadius = Math.min(190, Math.max(95, state.width * 0.11));
      state.scroll.current += (state.scroll.target - state.scroll.current) * 0.08;
      state.scroll.parallaxY = reducedMotion ? 0 : state.scroll.current * 0.055;
      state.scroll.parallaxX = reducedMotion ? 0 : Math.sin(state.scroll.current * 0.0016) * 8;

      state.particles.forEach((particle) => {
        const toBaseX = particle.baseX - particle.x;
        const toBaseY = particle.baseY - particle.y;

        particle.vx += toBaseX * 0.014;
        particle.vy += toBaseY * 0.014;

        if (!reducedMotion && state.pointer.active) {
          const visualX = ((particle.x + state.scroll.parallaxX * particle.depth) % state.width + state.width) % state.width;
          const visualY = ((particle.y + state.scroll.parallaxY * particle.depth) % state.height + state.height) % state.height;

          let dx = state.pointer.x - visualX;
          let dy = state.pointer.y - visualY;

          // Match cursor interaction across wrapped edges so stars near boundaries still respond correctly.
          if (dx > state.width / 2) dx -= state.width;
          if (dx < -state.width / 2) dx += state.width;
          if (dy > state.height / 2) dy -= state.height;
          if (dy < -state.height / 2) dy += state.height;

          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < interactionRadius && distance > 0.001) {
            const rawInfluence = (interactionRadius - distance) / interactionRadius;
            const influence = Math.pow(rawInfluence, 0.7);
            const directionX = dx / distance;
            const directionY = dy / distance;

            // Soft gravitational pull toward cursor with spring return to base for smooth release.
            particle.vx += directionX * influence * 0.28;
            particle.vy += directionY * influence * 0.22;
          }
        }

        particle.vx *= 0.9;
        particle.vy *= 0.9;

        particle.x += particle.vx;
        particle.y += particle.vy;
      });
    };

    const drawFrame = (timeMs) => {
      context.clearRect(0, 0, state.width, state.height);
      const parallaxY = state.scroll.parallaxY;
      const parallaxX = state.scroll.parallaxX;

      state.particles.forEach((particle) => {
        const twinkle = reducedMotion
          ? 1
          : 0.74 + Math.sin(timeMs * particle.twinkleSpeed + particle.twinklePhase) * 0.26;
        const drawX = ((particle.x + parallaxX * particle.depth) % state.width + state.width) % state.width;
        const drawY = ((particle.y + parallaxY * particle.depth) % state.height + state.height) % state.height;
        context.fillStyle = particle.color;
        context.globalAlpha = particle.alpha * twinkle;
        context.beginPath();
        context.arc(drawX, drawY, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
    };

    let animationFrame = 0;
    const animate = (timeMs) => {
      updateParticles();
      drawFrame(timeMs);
      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => {
      state.scroll.target = window.scrollY || 0;
    }, { passive: true });
    window.addEventListener('mousemove', (event) => movePointer(event.clientX, event.clientY));
    window.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      if (touch) movePointer(touch.clientX, touch.clientY);
    }, { passive: true });
    window.addEventListener('mouseleave', clearPointer);
    window.addEventListener('touchend', clearPointer, { passive: true });

    resize();
    animationFrame = window.requestAnimationFrame(animate);

    window.addEventListener('beforeunload', () => {
      window.cancelAnimationFrame(animationFrame);
    });
  }
}
