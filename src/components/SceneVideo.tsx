import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import {BilingualCaption} from './BilingualCaption';
import {SceneConfig} from '../types';

function resolveVideoSrc(assetPath: string): string {
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  return staticFile(assetPath);
}

export const SceneVideo: React.FC<{
  scene: SceneConfig;
  from: number;
  accent: string;
}> = ({scene, from, accent}) => {
  return (
    <Sequence from={from} durationInFrames={scene.durationInFrames}>
      <SceneVideoInner scene={scene} accent={accent} />
    </Sequence>
  );
};

const SceneVideoInner: React.FC<{
  scene: SceneConfig;
  accent: string;
}> = ({scene, accent}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 8], [1.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const videoSrc = resolveVideoSrc(scene.assetPath);

  return (
    <AbsoluteFill
      style={{
        background: '#050816',
        transform: `scale(${scale})`,
      }}
    >
      <OffthreadVideo
        src={videoSrc}
        startFrom={scene.startFrom ?? 0}
        endAt={scene.endAt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(2, 6, 14, 0.24) 0%, rgba(2, 6, 14, 0) 38%, rgba(2, 6, 14, 0.78) 100%)',
        }}
      />
      <BilingualCaption caption={scene.subtitle} accent={accent} />
    </AbsoluteFill>
  );
};
