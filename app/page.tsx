"use client";

import Link from 'next/link';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Matter from "matter-js";
import { HeaderBrand } from "@/components/HeaderBrand";

const LOGO_URL = "/talktech-mark-futuristic.svg";
const WORD_STR = "TalkTech";
const LETTERS = WORD_STR.split("");

const PILE_DURATION_MS = 1600;
const FONT_SIZE_CLAMP = { base: 64, sm: 80, md: 96, lg: 112 };
const MAX_PARALLAX = 8;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

function useStableRandoms(count: number, seed = 1337) {
  return useMemo(() => {
    const arr: number[] = [];
    let x = seed;
    for (let i = 0; i < count; i++) {
      x = (1103515245 * x + 12345) % 2 ** 31;
      arr.push(x / 2 ** 31);
    }
    return arr;
  }, [count, seed]);
}

function useLetterMetrics(letters: string[], fontSizePx: number) {
  const [widths, setWidths] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measures = Array.from(el.querySelectorAll("span[data-measure]"));
    if (!measures.length) return;
    const w = measures.map((m) => (m as HTMLElement).getBoundingClientRect().width);
    setWidths(w);
  }, [letters, fontSizePx]);

  const measureNode = (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute opacity-0 pointer-events-none select-none"
      style={{ left: -9999, top: -9999 }}
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          data-measure
          className="font-extrabold tracking-tight"
          style={{ fontSize: fontSizePx, lineHeight: 1 }}
        >
          {ch}
        </span>
      ))}
    </div>
  );

  return { widths, measureNode } as const;
}

// SVG letter (pattern + shimmer + glow)
function SvgLetter({
  ch,
  fontSize,
  textureOffset,
  dark = false,
}: {
  ch: string;
  fontSize: number;
  textureOffset: [number, number];
  dark?: boolean;
}) {
  const uid = useMemo(() => Math.random().toString(36).slice(2), []);
  const patternId = `pat_${uid}`;
  const glowId = `glow_${uid}`;
  const aniGrad = `aniGrad_${uid}`;

  const ascent = fontSize;
  const viewW = fontSize * 0.8;
  const viewH = fontSize * 1.1;

  return (
    <svg width={viewW} height={viewH} viewBox={`0 0 ${viewW} ${viewH}`} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.08)]" aria-hidden>
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width={viewW} height={viewH} x={textureOffset[0]} y={textureOffset[1]}>
          <image href={LOGO_URL} x={0} y={0} width={viewW * 3} height={viewH * 3} preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <linearGradient id={aniGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3047FD" />
          <stop offset="50%" stopColor="#00C2FF" />
          <stop offset="100%" stopColor="#00D4A6" />
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="8s" repeatCount="indefinite" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x={viewW / 2} y={ascent * 0.8} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontWeight={800} style={{ fill: `url(#${patternId})` }}>
        {ch}
      </text>
      <text x={viewW / 2} y={ascent * 0.8} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontWeight={800} style={{ fill: `url(#${aniGrad})`, opacity: 0.28 }} filter={`url(#${glowId})`}>
        {ch}
      </text>
      <text x={viewW / 2} y={ascent * 0.8} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontWeight={800} fill="none" stroke={dark ? "#0ea5e9" : "#0f172a"} strokeOpacity={dark ? 0.25 : 0.08} strokeWidth={fontSize * 0.04}>
        {ch}
      </text>
    </svg>
  );
}

export default function Page() {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"physics" | "assemble">(prefersReduced ? "assemble" : "physics");

  const letterCount = LETTERS.length;
  const randoms = useStableRandoms(letterCount * 2, 42);

  const [fontSize, setFontSize] = useState(FONT_SIZE_CLAMP.base);
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) setFontSize(FONT_SIZE_CLAMP.lg);
      else if (w >= 1024) setFontSize(FONT_SIZE_CLAMP.md);
      else if (w >= 640) setFontSize(FONT_SIZE_CLAMP.sm);
      else setFontSize(FONT_SIZE_CLAMP.base);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bodiesState, setBodiesState] = useState<{ x: number; y: number; angle: number }[]>(() =>
    LETTERS.map(() => ({ x: 0, y: -200, angle: 0 }))
  );

  const { widths, measureNode } = useLetterMetrics(LETTERS, fontSize);
  const [targets, setTargets] = useState<{ x: number; y: number }[] | null>(null);
  useEffect(() => {
    if (!widths) return;
    const totalWidth = widths.reduce((a, b) => a + b, 0) + (letterCount - 1) * (fontSize * 0.05);
    const container = containerRef.current;
    const cw = container?.clientWidth ?? 0;
    const ch = container?.clientHeight ?? 0;
    const startX = cw / 2 - totalWidth / 2;
    const y = ch / 2;
    const positions: { x: number; y: number }[] = [];
    let xCursor = startX;
    for (let i = 0; i < letterCount; i++) {
      positions.push({ x: xCursor + widths[i] / 2, y });
      xCursor += widths[i] + fontSize * 0.05;
    }
    setTargets(positions);
  }, [widths, fontSize, letterCount]);

  useEffect(() => {
    if (phase !== "physics") return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
    const world = engine.world;

    const floor = Matter.Bodies.rectangle(W / 2, H - 10, W, 20, { isStatic: true, restitution: 0.2, friction: 0.8 });
    const left = Matter.Bodies.rectangle(0, H / 2, 20, H, { isStatic: true });
    const right = Matter.Bodies.rectangle(W, H / 2, 20, H, { isStatic: true });
    Matter.World.add(world, [floor, left, right]);

    const bodies = LETTERS.map((_, i) => {
      const rX = ((randoms[i] - 0.5) * 0.6 + 0.5) * W;
      const sizeW = Math.max(fontSize * 0.6, 36);
      const sizeH = Math.max(fontSize * 0.9, 48);
      const b = Matter.Bodies.rectangle(rX, -80 - i * 30, sizeW, sizeH, {
        restitution: 0.3, friction: 0.6, density: 0.0025, angle: (randoms[i + letterCount] - 0.5) * 0.3,
      });
      return b;
    });
    Matter.World.add(world, bodies);

    const runner = Matter.Runner.create();
    let animId = 0;
    const raf = () => {
      const state = bodies.map((b) => ({ x: b.position.x, y: b.position.y, angle: b.angle }));
      setBodiesState(state);
      animId = requestAnimationFrame(raf);
    };
    animId = requestAnimationFrame(raf);
    Matter.Runner.run(runner, engine);

    const toAssemble = setTimeout(() => {
      cancelAnimationFrame(animId);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      setPhase("assemble");
    }, PILE_DURATION_MS);

    return () => {
      clearTimeout(toAssemble);
      cancelAnimationFrame(animId);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [phase, fontSize, randoms, letterCount]);

  const [parallax, setParallax] = useState<{x: number; y: number}>({x: 0, y: 0});
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setParallax({ x: Math.max(-1, Math.min(1, dx)) * MAX_PARALLAX, y: Math.max(-1, Math.min(1, dy)) * MAX_PARALLAX });
  };
  const onPointerLeave = () => setParallax({x: 0, y: 0});

  const textureOffsets = useMemo(() => {
    return LETTERS.map((_, i) => [Math.floor(randoms[i] * 120), Math.floor(randoms[i + letterCount] * 80)] as [number, number]);
  }, [randoms, letterCount]);

  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => setDark(mq.matches);
    handle();
    mq.addEventListener?.("change", handle);
    return () => mq.removeEventListener?.("change", handle);
  }, []);

  return (
    <main className="min-h-screen w-full">
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/40 border-b border-slate-200 dark:supports-[backdrop-filter]:bg-slate-950/40 dark:bg-slate-950/30 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <HeaderBrand />
            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
              <a href="#solutions" className="hover:text-slate-900 dark:hover:text-white transition">Solutions</a>
              <a href="#integrations" className="hover:text-slate-900 dark:hover:text-white transition">Integrations</a>
              <Link href="/contact" className="hover:text-slate-900 dark:hover:text-white transition">Contact</Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center pt-16 pb-10 lg:py-24">
            <div className="relative lg:col-span-7">
              <div ref={containerRef} className="relative h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] select-none will-change-transform" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
                {measureNode}

                {phase === "physics" && (
                  <div className="absolute inset-0">
                    {LETTERS.map((ch, i) => (
                      <div
                        key={`phys_${i}`}
                        className="absolute transition-transform duration-100"
                        style={{
                          left: 0, 
                          top: 0, 
                          transform: `translate(${bodiesState[i]?.x ?? 0}px, ${bodiesState[i]?.y ?? -200}px) rotate(${(bodiesState[i]?.angle ?? 0) * (180 / Math.PI)}deg)`,
                          transformOrigin: "center",
                        }}
                      >
                        <SvgLetter ch={ch} fontSize={fontSize} textureOffset={textureOffsets[i]} dark={dark} />
                      </div>
                    ))}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-4 w-2/3 rounded-full blur-md"
                         style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0) 100%)" }}/>
                  </div>
                )}

                {phase === "assemble" && targets && (
                  <div className="absolute inset-0">
                    {LETTERS.map((ch, i) => {
                      const targetX = targets[i].x + (prefersReduced ? 0 : parallax.x * (0.2 + i * 0.03));
                      const targetY = targets[i].y + (prefersReduced ? 0 : parallax.y * (0.2 + i * 0.03));
                      
                      return (
                        <div
                          key={`asm_${i}`}
                          className="absolute transition-all duration-1000 ease-out"
                          style={{
                            left: 0,
                            top: 0,
                            transform: `translate(${targetX}px, ${targetY}px) rotate(0deg) scale(1)`,
                            transformOrigin: "center",
                            transitionDelay: `${50 + i * 60}ms`
                          }}
                        >
                          <SvgLetter ch={ch} fontSize={fontSize} textureOffset={textureOffsets[i]} dark={dark} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-prose">
                Hardware to software, VoIP to AI—TalkTech helps you design, deploy, and integrate the systems that connect your business.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium shadow hover:shadow-md transition">Start a project</Link>
                <a href="#solutions" className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">Explore solutions</a>
              </div>

              <span className="sr-only">{prefersReduced ? "Animations reduced" : "Animations enabled"}</span>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 grid place-items-center">
                  <div className="text-center px-6">
                    <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">Featured</p>
                    <h3 className="mt-2 text-xl font-semibold">Agentic AI for Contact Centers</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">Cut handle time, boost CSAT, and deflect repetitive work with safe, controllable automation.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">VoIP Design</div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">Integrations</div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">Headsets</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Solutions</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-prose">From UCaaS to CCaaS, we architect reliable, scalable voice and AI systems tailored to your workflows.</p>
        </div>
      </section>

      <section id="integrations" className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-prose">Salesforce, HubSpot, custom CRMs—if it has an API, we can connect it.</p>
        </div>
      </section>

      <section id="contact" className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Let's Connect</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
            Have a project in mind? We'll make it real.
          </p>
          <Link 
            href="/contact" 
            className="inline-block mt-6 px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium shadow hover:shadow-md transition"
          >
            Get In Touch
          </Link>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} TalkTech</footer>
    </main>
  );
}
