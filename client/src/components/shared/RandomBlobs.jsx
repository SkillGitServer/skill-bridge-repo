import React, { useMemo } from 'react';

// Palette of blob colours
const COLORS = [
  'bg-orange-400', 'bg-teal-400', 'bg-purple-400', 'bg-yellow-400',
  'bg-indigo-400', 'bg-pink-400',  'bg-sky-400',   'bg-green-400',
  'bg-rose-400',   'bg-amber-400', 'bg-cyan-400',  'bg-violet-400',
];

// Organic border-radius presets
const SHAPES = [
  'rounded-[60%_40%_30%_70%/60%_30%_70%_40%]',
  'rounded-[40%_60%_70%_30%/50%_50%_60%_40%]',
  'rounded-[30%_70%_70%_30%/30%_30%_70%_70%]',
  'rounded-[50%_50%_20%_80%/25%_25%_75%_75%]',
  'rounded-[70%_30%_50%_50%/50%_30%_70%_50%]',
  'rounded-[40%_60%_60%_40%/60%_30%_70%_40%]',
  'rounded-full',
];

const ANIMATIONS = ['animate-float-slow', 'animate-float-fast', 'animate-blob'];

// Returns a random integer between min (inclusive) and max (inclusive)
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

/**
 * RandomBlobs
 *
 * Renders `count` decorative blobs at random positions every time the
 * parent component mounts (i.e. every page load / navigation).
 *
 * Props:
 *   count  – number of blobs to render (default 5)
 *   zIndex – tailwind z-index class applied to each blob (default 'z-0')
 */
export default function RandomBlobs({ count = 5, zIndex = 'z-0' }) {
  const blobs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Random position: top 0–90 %, left 0–90 %
      const top  = rand(0, 90);
      const left = rand(0, 90);

      // Random size between 120 px and 360 px
      const size = rand(120, 360);

      // Random opacity 0.25 – 0.65
      const opacity = (rand(25, 65) / 100).toFixed(2);

      // Random rotation –30° to +30°
      const rotate = rand(-30, 30);

      return {
        id: i,
        color:     pick(COLORS),
        shape:     pick(SHAPES),
        animation: pick(ANIMATIONS),
        top,
        left,
        size,
        opacity,
        rotate,
        delay: rand(0, 4000), // animation-delay ms
      };
    });
  }, []); // empty deps → computed once per mount

  return (
    <>
      {blobs.map(({ id, color, shape, animation, top, left, size, opacity, rotate, delay }) => (
        <div
          key={id}
          className={`absolute ${color} ${shape} ${animation} ${zIndex} pointer-events-none`}
          style={{
            top:     `${top}%`,
            left:    `${left}%`,
            width:   `${size}px`,
            height:  `${size}px`,
            opacity,
            transform: `rotate(${rotate}deg)`,
            animationDelay: `${delay}ms`,
            // keep them from affecting layout
            translate: '-50% -50%',
          }}
        />
      ))}
    </>
  );
}
