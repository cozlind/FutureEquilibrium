"use client";

import React, { useEffect, useRef } from "react";
import "./bgA.css";

export default function BackgroundA({
  blobCount = 18,
  intensity = 1.0, // 0.6~1.6
  speed = 1.0,     // 0.6~1.8
  weaveEnabled = true,
}: {
  blobCount?: number;
  intensity?: number;
  speed?: number;
  weaveEnabled?: boolean;
}) {
  return (
    <div className="bgA-root" aria-hidden="true">
      <BlobCanvas blobCount={blobCount} intensity={intensity} speed={speed} />
      {weaveEnabled && <WeaveCanvas />}
      <div className="bgA-scan" />
      <div className="bgA-vignette" />
    </div>
  );
}

function BlobCanvas({
  blobCount,
  intensity,
  speed,
}: {
  blobCount: number;
  intensity: number;
  speed: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // 色板：neo tokyo / kabukicho 常见霓虹
    const palette = [
      { h: 285, s: 95, l: 62 }, // purple
      { h: 205, s: 95, l: 62 }, // cyan
      { h: 320, s: 90, l: 62 }, // pink
      { h: 140, s: 80, l: 55 }, // green
      { h: 35,  s: 95, l: 60 }, // amber
      { h: 0,   s: 90, l: 60 }, // red
    ];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const makeBlob = (w: number, h: number) => {
      const c = pick(palette);
      const r = rand(220, 720); // 大小随机
      return {
        x: rand(-r, w + r),
        y: rand(-r, h + r),
        r,
        // 随机速度向量（会带轻微噪声游走）
        vx: rand(-18, 18) * speed,
        vy: rand(-10, 10) * speed,
        // 用于“随机游走”的相位
        ax: rand(0, Math.PI * 2),
        ay: rand(0, Math.PI * 2),
        // 透明度
        a: rand(0.10, 0.24) * intensity,
        // 颜色
        h: c.h + rand(-10, 10),
        s: c.s,
        l: c.l,
      };
    };

    let blobs = Array.from({ length: blobCount }, () =>
      makeBlob(window.innerWidth, window.innerHeight)
    );

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // 清屏（透明），让 CSS 的黑底露出来
      ctx.clearRect(0, 0, w, h);

      // 发光叠加更像霓虹
      ctx.globalCompositeOperation = "lighter";

      // 轻微“呼吸”：整体强度缓慢变化
      const breathe = prefersReduced ? 1 : 0.85 + 0.15 * Math.sin(now / 1400);

      for (const b of blobs) {
        if (!prefersReduced) {
          // 随机游走：速度会轻微变化，让运动不机械
          b.ax += dt * 0.9;
          b.ay += dt * 0.7;
          const jx = Math.sin(b.ax) * 8;
          const jy = Math.cos(b.ay) * 6;

          b.x += (b.vx + jx) * dt;
          b.y += (b.vy + jy) * dt;
        }

        // wrap：无缝循环（出界从另一侧出现）
        const pad = b.r * 0.8;
        if (b.x < -pad) b.x = w + pad;
        if (b.x > w + pad) b.x = -pad;
        if (b.y < -pad) b.y = h + pad;
        if (b.y > h + pad) b.y = -pad;

        // 径向渐变光斑
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `hsla(${b.h}, ${b.s}%, ${b.l}%, ${b.a * 1.2 * breathe})`);
        g.addColorStop(0.25, `hsla(${b.h}, ${b.s}%, ${b.l}%, ${b.a * 0.55 * breathe})`);
        g.addColorStop(1, `hsla(${b.h}, ${b.s}%, ${b.l}%, 0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [blobCount, intensity, speed]);

  return <canvas ref={ref} className="bgA-canvas" />;
}

interface WeavePoint {
  x: number;
  y: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  seed: number;
  phase: number;
  group: number;
}

function WeaveCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const CFG = {
      pointCount: 26,
      minSpacingRatio: 0.46,
      initTriesPerPoint: 220,
      neighborK: 2,
      linkMaxRatio: 0.56,
      lineWidth: 1.35,
      lineMaxAlpha: 0.62,
      dashChance: 0.10,
      dashLen: 4,
      gapLen: 20,
      dashJitter: 4.0,
      drift: 0.04,
      swirl: 0.008,
      damping: 0.992,
      repel: 0.0020,
      weaveAmpRatio: 2.1,
      weaveSpring: 0.0005,
      weaveSpeedA: 0.004,
      weaveSpeedB: 0.012,
      weaveSkew: 0.9,
      fade: 0.80,
      pointSize: 2.0,
      fpsCap: 60,
      rgb: { r: 55, g: 255, b: 215 },
      _r: 0,
      _minSpacing: 0,
    };

    let W = 0, H = 0;
    let center = { x: 0, y: 0 };
    let points: WeavePoint[] = [];
    let t0 = performance.now();
    let lastFrame = 0;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const rgba = (alpha: number) => {
      const { r, g, b } = CFG.rgb;
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const initPoints = () => {
      points = [];
      const R = CFG._r;
      const minD = CFG._minSpacing;
      const minD2 = minD * minD;

      for (let i = 0; i < CFG.pointCount; i++) {
        let placed = false;

        for (let t = 0; t < CFG.initTriesPerPoint; t++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * R;
          const x = center.x + Math.cos(a) * r;
          const y = center.y + Math.sin(a) * r;

          let ok = true;
          for (let k = 0; k < points.length; k++) {
            const p = points[k];
            const dx = x - p.x;
            const dy = y - p.y;
            if (dx * dx + dy * dy < minD2) { ok = false; break; }
          }
          if (!ok) continue;

          points.push({
            x, y,
            bx: x,
            by: y,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            seed: Math.random() * 1000,
            phase: Math.random() * Math.PI * 2,
            group: Math.random() < 0.5 ? 0 : 1,
          });
          placed = true;
          break;
        }

        if (!placed) break;
      }
    };

    const resize = () => {
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      center.x = W * 0.5;
      center.y = H * 0.5;

      const short = Math.min(W, H);
      const R = Math.max(280, Math.min(700, short * 0.45));
      CFG._r = R;
      CFG._minSpacing = R * CFG.minSpacingRatio;

      initPoints();
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    const step = (now: number) => {
      const dtMs = now - lastFrame;
      const minFrame = 1000 / CFG.fpsCap;
      if (dtMs < minFrame) { raf = requestAnimationFrame(step); return; }
      lastFrame = now;

      const t = (now - t0) / 1000;
      const R = CFG._r;
      const minD = CFG._minSpacing;
      const minD2 = minD * minD;

      ctx.clearRect(0, 0, W, H);

      if (!prefersReduced) {
        const rot = Math.sin(t * 0.7) * 1.0;
        const weaveAmp = minD * CFG.weaveAmpRatio;

        for (let i = 0; i < points.length; i++) {
          const a = points[i];

          const dir = a.group === 0 ? 1 : -1;
          const ta = t * CFG.weaveSpeedA * dir;
          const tb = t * CFG.weaveSpeedB * -dir;

          const wx =
            Math.sin(ta + a.phase) * 0.75 +
            Math.sin(tb + a.seed * 0.3) * 0.45;

          const wy =
            Math.cos(ta * CFG.weaveSkew + a.phase * 1.3) * 0.75 +
            Math.cos(tb * (2 - CFG.weaveSkew) + a.seed * 0.2) * 0.45;

          const targetX = a.bx + wx * weaveAmp;
          const targetY = a.by + wy * weaveAmp;

          a.vx += (targetX - a.x) * CFG.weaveSpring;
          a.vy += (targetY - a.y) * CFG.weaveSpring;

          a.vx += Math.sin(t * 1.4 + a.seed) * CFG.drift;
          a.vy += Math.cos(t * 1.2 + a.seed * 1.37) * CFG.drift;

          const dx0 = a.x - center.x;
          const dy0 = a.y - center.y;
          const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
          const tx = -dy0 / dist0;
          const ty = dx0 / dist0;
          a.vx += tx * rot * (R * CFG.swirl) * 0.0016;
          a.vy += ty * rot * (R * CFG.swirl) * 0.0016;

          for (let j = i + 1; j < points.length; j++) {
            const b = points[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > minD2 || d2 < 1e-6) continue;

            const d = Math.sqrt(d2);
            const push = (minD - d) / minD;
            const px = (dx / d) * push * (R * CFG.repel);
            const py = (dy / d) * push * (R * CFG.repel);

            a.vx += px; a.vy += py;
            b.vx -= px; b.vy -= py;
          }

          a.vx *= CFG.damping;
          a.vy *= CFG.damping;

          a.x += a.vx;
          a.y += a.vy;

          const dx = a.x - center.x;
          const dy = a.y - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > R) {
            const k = (dist - R) / R;
            a.vx -= (dx / dist) * k * (R * 0.0022);
            a.vy -= (dy / dist) * k * (R * 0.0022);
            a.bx -= (dx / dist) * k * (R * 0.0010);
            a.by -= (dy / dist) * k * (R * 0.0010);
          } else {
            a.bx += Math.sin(t * 0.15 + a.seed) * 0.10;
            a.by += Math.cos(t * 0.13 + a.seed * 1.11) * 0.10;
          }
        }
      }

      const maxD = R * CFG.linkMaxRatio;
      const maxD2 = maxD * maxD;

      ctx.lineWidth = CFG.lineWidth;
      ctx.lineCap = "round";

      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const nearest: [number, WeavePoint][] = [];

        for (let j = 0; j < points.length; j++) {
          if (i === j) continue;
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;
          nearest.push([d2, b]);
        }

        nearest.sort((u, v) => u[0] - v[0]);
        const k = Math.min(CFG.neighborK, nearest.length);

        for (let n = 0; n < k; n++) {
          const [d2, b] = nearest[n];
          const d = Math.sqrt(d2);
          const alpha = Math.max(0, (1 - d / maxD) * CFG.lineMaxAlpha);
          if (alpha < 0.02) continue;

          const t_now = (performance.now() - t0) / 1000;
          const dashed = Math.random() < CFG.dashChance;
          if (dashed) {
            const wobble = Math.sin(t_now * 1.25 + (a.seed + b.seed) * 0.6) * CFG.dashJitter;
            const dash = Math.max(6, CFG.dashLen + wobble);
            const gap = Math.max(6, CFG.gapLen - wobble * 0.35);
            ctx.setLineDash([dash, gap]);
          } else {
            ctx.setLineDash([]);
          }

          ctx.strokeStyle = rgba(alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      for (const p of points) {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const falloff = Math.max(0, 1 - dist / R);
        const alpha = 0.22 + falloff * 0.55;

        ctx.fillStyle = rgba(alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, CFG.pointSize, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="bgA-weave" />;
}
