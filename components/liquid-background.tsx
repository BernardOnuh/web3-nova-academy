// components/liquid-background.tsx — animated blue/gold liquid backdrop for public pages
"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import './liquid.css';

const PULSE_EVENT = 'liquid-pulse';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Make the cursor blob swell briefly (used by typing splashes). */
export function pulseLiquid() {
  window.dispatchEvent(new Event(PULSE_EVENT));
}

/** Liquid droplet that bursts from the caret of `input` on every keystroke. */
let measureCtx: CanvasRenderingContext2D | null = null;
export function splash(input: HTMLInputElement) {
  if (reducedMotion()) return;
  const field = input.parentElement;
  if (!field) return;

  measureCtx ??= document.createElement('canvas').getContext('2d');
  let caretX = input.offsetLeft;
  if (measureCtx) {
    measureCtx.font = getComputedStyle(input).font;
    const text = input.type === 'password' ? '•'.repeat(input.value.length) : input.value;
    caretX += Math.min(measureCtx.measureText(text).width, input.clientWidth);
  }

  const drop = document.createElement('span');
  drop.className = 'liquid-splash';
  drop.style.left = `${caretX}px`;
  drop.style.setProperty('--hue', Math.random() < 0.3 ? '#E8A317' : '#2389DB');
  drop.addEventListener('animationend', () => drop.remove());
  field.appendChild(drop);

  field.classList.remove('liquid-input--pulse');
  void field.offsetWidth; // restart the pulse animation
  field.classList.add('liquid-input--pulse');
  pulseLiquid();
}

export default function LiquidBackground({ children }: { children: ReactNode }) {
  const cursorBlobRef = useRef<HTMLDivElement>(null);

  // blob that trails the pointer and merges with the ambient blobs
  useEffect(() => {
    if (reducedMotion()) return;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };
    const onPulse = () =>
      cursorBlobRef.current?.animate([{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], {
        duration: 500,
        easing: 'ease-out',
        composite: 'add',
      });
    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      if (cursorBlobRef.current) {
        cursorBlobRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener(PULSE_EVENT, onPulse);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener(PULSE_EVENT, onPulse);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="liquid-page relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* Gooey + wobble filter that turns the blobs into liquid */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="liquid-goo" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="3" result="noise">
              <animate attributeName="baseFrequency" dur="18s" values="0.008;0.012;0.008" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" result="wobble" />
            <feGaussianBlur in="wobble" stdDeviation="22" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
          </filter>
        </defs>
      </svg>

      <div className="liquid-layer pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="liquid-blob liquid-blob--blue-1" />
        <div className="liquid-blob liquid-blob--blue-2" />
        <div className="liquid-blob liquid-blob--deep" />
        <div className="liquid-blob liquid-blob--gold-1" />
        <div className="liquid-blob liquid-blob--gold-2" />
        <div ref={cursorBlobRef} className="liquid-blob liquid-blob--cursor" />
      </div>
      <div className="liquid-grid pointer-events-none fixed inset-0" aria-hidden="true" />

      {children}
    </div>
  );
}
