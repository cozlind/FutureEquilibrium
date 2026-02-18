"use client";

import React, { useEffect, useRef } from "react";
import "./bgA.css";

export default function BackgroundA({
  blobCount = 18,
  intensity = 1.0, // 0.6~1.6
  speed = 1.0,     // 0.6~1.8
}: {
  blobCount?: number;
  intensity?: number;
  speed?: number;
}) {
  return (
    <div className="bgA-root" aria-hidden="true">
      <BlobCanvas blobCount={blobCount} intensity={intensity} speed={speed} />
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
