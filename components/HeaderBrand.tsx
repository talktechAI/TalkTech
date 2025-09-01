"use client";
import React, { useEffect, useState } from "react";

export function HeaderBrand() {
  const [dark, setDark] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setDark(mq.matches);
    h(); 
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);

  const onHover = () => {
    setIsHovered(true);
    setTimeout(() => setIsHovered(false), 900); // Reset after animation
  };

  const stroke = dark ? "#86e1ff" : "#0f172a";
  const strokeOpacity = dark ? 0.35 : 0.1;

  return (
    <div className="flex items-center gap-3">
      <svg
        onMouseEnter={onHover}
        width="36" 
        height="36" 
        viewBox="0 0 200 200" 
        className={`shrink-0 transition-all duration-300 ease-out cursor-pointer
          ${isHovered ? 'scale-105' : 'scale-100'}
          animate-logo-entrance`}
        role="img" 
        aria-label="TalkTech logo"
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

        {/* Outer hexagon */}
        <path 
          d="M60 20 L140 20 L180 60 L180 140 L140 180 L60 180 L20 140 L20 60 Z"
          stroke="url(#ttGrad)" 
          strokeWidth="12" 
          fill="none" 
          strokeLinejoin="round"
        />

        {/* Left T */}
        <g filter="url(#ttGlow)">
          <path 
            d="M40 58 H100 M70 58 V142" 
            stroke="url(#ttGrad)" 
            strokeWidth="12" 
            strokeLinecap="square" 
            fill="none"
          />
        </g>

        {/* Right T with animation */}
        <g 
          filter="url(#ttGlow)" 
          className={`transition-transform duration-700 ease-spring
            ${isHovered ? 'animate-right-t-bounce' : 'animate-right-t-entrance'}`}
        >
          <path 
            d="M100 58 H160 M130 58 V142" 
            stroke="url(#ttGrad)" 
            strokeWidth="12" 
            strokeLinecap="square" 
            fill="none"
          />
          {/* Shimmer effect */}
          <rect 
            clipPath="url(#rightTClip)" 
            x="-60" 
            y="40" 
            width="200" 
            height="120"
            fill="url(#ttGrad)" 
            className={isHovered ? 'animate-shimmer' : ''}
            opacity="0"
          />
        </g>

        {/* Subtle border */}
        <path 
          d="M60 20 L140 20 L180 60 L180 140 L140 180 L60 180 L20 140 L20 60 Z"
          fill="none" 
          stroke={stroke} 
          strokeOpacity={strokeOpacity} 
          strokeWidth="1.5"
        />
      </svg>

      <span 
        className="font-semibold tracking-tight animate-text-entrance"
      >
        TalkTech
      </span>

      <style jsx>{`
        @keyframes logoEntrance {
          0% { opacity: 0; transform: scale(0.8); }
          60% { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes rightTEntrance {
          0% { transform: translateX(40px); }
          80% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }

        @keyframes rightTBounce {
          0% { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }

        @keyframes shimmer {
          0% { opacity: 0; transform: translateX(-60px); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(120px); }
        }

        @keyframes textEntrance {
          0% { opacity: 0; transform: translateX(8px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        .animate-logo-entrance {
          animation: logoEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-right-t-entrance {
          animation: rightTEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-right-t-bounce {
          animation: rightTBounce 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-shimmer {
          animation: shimmer 0.9s ease-in-out forwards;
        }

        .animate-text-entrance {
          opacity: 0;
          animation: textEntrance 0.4s ease-out 0.6s forwards;
        }
      `}</style>
    </div>
  );
}