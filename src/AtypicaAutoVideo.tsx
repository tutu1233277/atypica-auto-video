import React, {useEffect} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {SceneVideo} from './components/SceneVideo';
import {CompositionProps} from './types';
import {ensureGoogleFonts} from './googleFonts';

const handle = delayRender('Loading subtitle fonts');

export const AtypicaAutoVideo: React.FC<CompositionProps> = ({config}) => {
  let cursor = 0;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      ensureGoogleFonts();

      try {
        await document.fonts.ready;
      } finally {
        if (mounted) {
          continueRender(handle);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AbsoluteFill
      style={{
        background: config.style.background,
        fontFamily:
          '"Avenir Next", "Helvetica Neue", "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      {config.scenes.map((scene) => {
        const from = cursor;
        cursor += scene.durationInFrames;
        return (
          <SceneVideo
            key={scene.id}
            scene={scene}
            from={from}
            accent={config.style.accent}
          />
        );
      })}
    </AbsoluteFill>
  );
};
