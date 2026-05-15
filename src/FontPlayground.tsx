import React, {useEffect} from 'react';
import {AbsoluteFill, continueRender, delayRender, getRemotionEnvironment} from 'remotion';
import {ensureGoogleFonts} from './googleFonts';

const fontSamples = [
  {
    id: 'kedebideri',
    label: '01 Kedebideri',
    family: '"Kedebideri", sans-serif',
    title: 'Bold Hook',
    subtitle: '更像短视频封面字，力量感强，适合观点和结论。',
    sample: 'Nobody told me posture changes your whole energy.',
    treatment: {
      fontSize: 46,
      fontWeight: 800,
      letterSpacing: -1.3,
      lineHeight: 1.02,
      color: '#fffaf5',
    },
  },
  {
    id: 'corinthia',
    label: '02 Corinthia',
    family: '"Corinthia", cursive',
    title: 'Luxury Script',
    subtitle: '偏柔美和精致，适合护肤、审美、氛围感镜头。',
    sample: 'Soft rituals make sharp women.',
    treatment: {
      fontSize: 66,
      fontWeight: 700,
      letterSpacing: 0.2,
      lineHeight: 1,
      color: '#fff0df',
    },
  },
  {
    id: 'special-elite',
    label: '03 Special Elite',
    family: '"Special Elite", monospace',
    title: 'Typewriter',
    subtitle: '更有“记录感”和故事感，适合旁白型视频。',
    sample: 'I tested every shortcut before finding the simple fix.',
    treatment: {
      fontSize: 34,
      fontWeight: 400,
      letterSpacing: -0.2,
      lineHeight: 1.16,
      color: '#f4ead8',
    },
  },
  {
    id: 'lato',
    label: '04 Lato Black',
    family: '"Lato", sans-serif',
    title: 'Commercial Sans',
    subtitle: '广告感最稳，适合投放素材和通用品牌字幕。',
    sample: 'This small change made the whole video convert better.',
    treatment: {
      fontSize: 43,
      fontWeight: 900,
      letterSpacing: -1.1,
      lineHeight: 1.03,
      color: '#fff9f2',
    },
  },
  {
    id: 'lugrasimo',
    label: '05 Lugrasimo',
    family: '"Lugrasimo", cursive',
    title: 'Character Script',
    subtitle: '更有个性，像手写品牌签名，不适合大段字幕。',
    sample: 'Your face changes when your shoulders finally relax.',
    treatment: {
      fontSize: 44,
      fontWeight: 400,
      letterSpacing: -0.4,
      lineHeight: 1.06,
      color: '#fff2ea',
    },
  },
  {
    id: 'shadows-into-light',
    label: '06 Shadows Into Light',
    family: '"Shadows Into Light", cursive',
    title: 'Casual Handwritten',
    subtitle: '更轻松、亲近，适合日常口播、vlog、经验分享。',
    sample: 'This habit made me look less tired on camera.',
    treatment: {
      fontSize: 42,
      fontWeight: 400,
      letterSpacing: -0.3,
      lineHeight: 1.08,
      color: '#f8f7ff',
    },
  },
  {
    id: 'meriendia',
    label: '07 Merienda',
    family: '"Merienda", cursive',
    title: 'Rounded Friendly',
    subtitle: '介于可爱和成熟之间，适合女性向 lifestyle 内容。',
    sample: 'A softer tone can still feel premium.',
    treatment: {
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: -0.8,
      lineHeight: 1.08,
      color: '#fff8fb',
    },
  },
  {
    id: 'cantarell',
    label: '08 Cantarell Italic',
    family: '"Cantarell", sans-serif',
    title: 'Editorial Sans',
    subtitle: '更像杂志副标题，理性但不冷，适合品牌表达。',
    sample: 'Confidence is visible long before words appear.',
    treatment: {
      fontSize: 39,
      fontWeight: 700,
      fontStyle: 'italic' as const,
      letterSpacing: -0.8,
      lineHeight: 1.08,
      color: '#eff8ff',
    },
  },
  {
    id: 'nanum-gothic',
    label: '09 Nanum Gothic',
    family: '"Nanum Gothic", sans-serif',
    title: 'Clean East-Asian Sans',
    subtitle: '更克制、干净，韩系品牌感会比普通无衬线更明显。',
    sample: 'Balanced posture makes the whole face read calmer.',
    treatment: {
      fontSize: 40,
      fontWeight: 700,
      letterSpacing: -0.6,
      lineHeight: 1.08,
      color: '#f3fbff',
    },
  },
];

const cardBackgrounds = [
  'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(255,214,179,0.18), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(255,243,200,0.14), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(255,187,122,0.18), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(255,194,217,0.16), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(190,213,255,0.16), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(255,205,244,0.16), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(181,233,255,0.16), rgba(255,255,255,0.03))',
  'linear-gradient(145deg, rgba(196,255,244,0.16), rgba(255,255,255,0.03))',
];

const shouldBlockForFonts = !getRemotionEnvironment().isRendering;
const handle = shouldBlockForFonts ? delayRender('Loading Google Fonts') : null;

export const FontPlayground: React.FC = () => {
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!shouldBlockForFonts) {
        return;
      }

      ensureGoogleFonts();

      try {
        await document.fonts.ready;
      } finally {
        if (mounted && handle !== null) {
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
        background:
          'radial-gradient(circle at top, #35261c 0%, #171110 34%, #090909 100%)',
        color: '#f8efe6',
        padding: 28,
        fontFamily: '"Roboto", sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          marginBottom: 18,
        }}
      >
        <div style={{maxWidth: 700}}>
          <div
            style={{
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: 2,
              opacity: 0.68,
              marginBottom: 8,
            }}
          >
            Google Fonts Playground
          </div>
          <div
            style={{
              fontSize: 52,
              lineHeight: 0.98,
              letterSpacing: -2,
              fontWeight: 900,
            }}
          >
            这次不是系统字体，是你给的真实 Web Fonts
          </div>
        </div>
        <div
          style={{
            width: 240,
            borderRadius: 28,
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
            fontSize: 18,
            lineHeight: 1.35,
          }}
        >
          先挑风格方向。
          <br />
          喜欢哪张，我再把它接进字幕组件。
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 14,
          flex: 1,
          alignContent: 'start',
        }}
      >
        {fontSamples.map((sample, index) => {
          return (
            <div
              key={sample.id}
              style={{
                borderRadius: 30,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: cardBackgrounds[index],
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 50px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  {sample.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    opacity: 0.62,
                    textAlign: 'right',
                    maxWidth: 150,
                  }}
                >
                  {sample.family}
                </div>
              </div>

              <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    opacity: 0.76,
                    marginBottom: 6,
                  }}
                >
                  {sample.title}
                </div>
                <div
                  style={{
                    fontFamily: sample.family,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginBottom: 10,
                    ...sample.treatment,
                  }}
                >
                  {sample.sample}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    lineHeight: 1.35,
                    opacity: 0.82,
                    marginBottom: 10,
                  }}
                >
                  {sample.subtitle}
                </div>
                <div
                  style={{
                    fontFamily: sample.family,
                    fontSize: 22,
                    lineHeight: 1.05,
                    color: 'rgba(255,255,255,0.88)',
                  }}
                >
                  镜头气质会因为字体立刻变掉
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
