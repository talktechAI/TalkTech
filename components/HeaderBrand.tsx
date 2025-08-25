"use client";
import { motion, useAnimationControls } from "framer-motion";
import React, { useEffect, useState } from "react";

export function HeaderBrand() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setDark(mq.matches);
    h(); mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);

  const rightT = useAnimationControls();
  const shimmer = useAnimationControls();
  const group = useAnimationControls();

  useEffect(() => {
    (async () => {
      await rightT.start({
        x: [40, -4, 0],
        transition: { times: [0, 0.8, 1], duration: 0.7, type: "spring", stiffness: 280, damping: 18 }
      });
      await group.start({
        scale: [1, 1.04, 1],
        transition: { duration: 0.45, times: [0, 0.5, 1], type: "spring", stiffness: 220, damping: 18 }
      });
      shimmer.start({
        x: [-60, 120],
        opacity: [0, 1, 0],
        transition: { duration: 0.9, ease: "easeInOut" }
      });
    })();
  }, [group, rightT, shimmer]);

  const onHover = () => {
    shimmer.start({
      x: [-60, 120],
      opacity: [0, 1, 0],
      transition: { duration: 0.9, ease: "easeInOut" }
    });
    rightT.start({
      x: [8, 0],
      transition: { duration: 0.25, type: "spring", stiffness: 400, damping: 20 }
    });
    group.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.3 }
    });
  };

  const stroke = dark ? "#86e1ff" : "#0f172a";
  const strokeOpacity = dark ? 0.35 : 0.1;

  return (
    <div className="flex items-center gap-3">
      <motion.svg
        onHoverStart={onHover}
        width="36" height="36" viewBox="0 0 200 200" className="shrink-0"
        initial={false}
        animate={group}
        role="img" aria-label="TalkTech logo"
      >
        <defs>
          <linearGradient id="ttGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3047FD"/>
            <stop offset="50%" stopColor="#00C2FF"/>
            <stop offset="100%" stopColor="#00D4A6"/>
          </linearGradient>
          <filter id="ttGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="rightTClip">
            <path d="M100 58 H160 M130 58 V142" />
          </clipPath>
        </defs>

        <path d="M60 20 L140 20 L180 60 L180 140 L140 180 L60 180 L20 140 L20 60 Z"
              stroke="url(#ttGrad)" strokeWidth="12" fill="none" strokeLinejoin="round"/>

        <g filter="url(#ttGlow)">
          <path d="M40 58 H100 M70 58 V142" stroke="url(#ttGrad)" strokeWidth="12" strokeLinecap="square" fill="none"/>
        </g>

        <motion.g filter="url(#ttGlow)" initial={{ x: 40 }} animate={rightT}>
          <path d="M100 58 H160 M130 58 V142" stroke="url(#ttGrad)" strokeWidth="12" strokeLinecap="square" fill="none"/>
          <motion.rect clipPath="url(#rightTClip)" x="-60" y="40" width="200" height="120"
                       fill="url(#ttGrad)" initial={{ x: -60, opacity: 0 }} animate={shimmer}/>
        </motion.g>

        <path d="M60 20 L140 20 L180 60 L180 140 L140 180 L60 180 L20 140 L20 60 Z"
              fill="none" stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth="1.5"/>
      </motion.svg>

      <motion.span
        className="font-semibold tracking-tight"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        TalkTech
      </motion.span>
    </div>
  );
}
