import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Caption} from '../types';

export const BilingualCaption: React.FC<{
  caption: Caption;
  accent: string;
}> = ({caption, accent}) => {
  void accent;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        padding: '0 64px',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          transform: 'translateY(300px)',
        }}
      >
        <div
          style={{
            fontFamily: '"Nanum Gothic", "Roboto", sans-serif',
            color: '#ffffff',
            fontSize: 56,
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: -0.8,
            WebkitTextStroke: '4px rgba(0, 0, 0, 0.92)',
            textShadow:
              '0 4px 10px rgba(0, 0, 0, 0.45), 0 10px 30px rgba(0, 0, 0, 0.28)',
            paintOrder: 'stroke fill',
            whiteSpace: 'pre-line',
          }}
        >
          {caption.en}
        </div>
      </div>
    </AbsoluteFill>
  );
};
