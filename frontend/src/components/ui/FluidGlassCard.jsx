import React, { useRef, useState, useCallback } from 'react';

/**
 * FluidGlassCard — Inspired by React Bits FluidGlass (mode="cube", thickness=5, chromaticAberration=0.1)
 *
 * Provides a high-performance, fluid-interactive glassmorphic cube card with:
 * - Refractive chromatic aberration border glow (RGB dispersion)
 * - 3D fluid perspective tilt tracking mouse movement
 * - Dynamic liquid specular reflection / refraction sheen
 * - 5px refractive glass bevel thickness
 */
export default function FluidGlassCard({
  children,
  className = '',
  mode = 'cube',
  thickness = 5,
  chromaticAberration = 0.1,
  interactive = true,
  as: Component = 'article',
  ...props
}) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback((e) => {
    if (!interactive || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    // Subtle 3D cube tilt (-6deg to +6deg)
    const tiltX = ((y / rect.height) - 0.5) * -8;
    const tiltY = ((x / rect.width) - 0.5) * 8;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--fluid-x', `${percentX.toFixed(2)}%`);
      cardRef.current.style.setProperty('--fluid-y', `${percentY.toFixed(2)}%`);
      cardRef.current.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      cardRef.current.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    });
  }, [interactive]);

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    if (cardRef.current) {
      cardRef.current.style.setProperty('--tilt-x', '0deg');
      cardRef.current.style.setProperty('--tilt-y', '0deg');
    }
  }, []);

  return (
    <Component
      ref={cardRef}
      className={`fluid-glass-card fluid-glass-card--${mode} ${isHovered ? 'fluid-glass--hovered' : ''} ${className}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        '--glass-thickness': `${thickness}px`,
        '--chromatic-aberration': chromaticAberration,
      }}
      {...props}
    >
      {/* Chromatic aberration prismatic edge */}
      <span className="fluid-glass__chromatic" aria-hidden="true" />

      {/* Refractive liquid specular sheen */}
      <span className="fluid-glass__specular" aria-hidden="true" />

      {/* Glass bevel / transmission layer */}
      <span className="fluid-glass__bevel" aria-hidden="true" />

      {/* Content wrapper */}
      <div className="fluid-glass__content">
        {children}
      </div>
    </Component>
  );
}
