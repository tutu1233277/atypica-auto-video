import React from 'react';
import {Composition} from 'remotion';
import {AtypicaAutoVideo} from './AtypicaAutoVideo';
import {FontPlayground} from './FontPlayground';
import {compositionPropsSchema} from './types';
import exampleConfig from '../data/videos/competitor-ugc.json';

const defaultProps = {
  config: exampleConfig,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FontPlayground"
        component={FontPlayground}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
      />
      <Composition
        id="AtypicaAutoVideo"
        component={AtypicaAutoVideo}
        schema={compositionPropsSchema}
        defaultProps={defaultProps}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={exampleConfig.scenes.reduce(
          (total, scene) => total + scene.durationInFrames,
          0,
        )}
        calculateMetadata={({props}) => {
          const config = props.config;
          return {
            durationInFrames: config.scenes.reduce(
              (total, scene) => total + scene.durationInFrames,
              0,
            ),
            width: config.width,
            height: config.height,
            fps: config.fps,
          };
        }}
      />
    </>
  );
};
