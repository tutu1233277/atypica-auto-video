import {z} from 'zod';

export const captionSchema = z.object({
  zh: z.string(),
  en: z.string(),
});

export const sceneSchema = z.object({
  id: z.string(),
  assetPath: z.string(),
  durationInFrames: z.number().int().positive(),
  subtitle: captionSchema,
  startFrom: z.number().int().min(0).optional(),
  endAt: z.number().int().positive().optional(),
  note: z.string().optional(),
});

export const videoConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic: z.string(),
  fps: z.number().int().positive().default(30),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  style: z.object({
    accent: z.string(),
    background: z.string(),
  }),
  inspiration: z.array(
    z.object({
      platform: z.string(),
      title: z.string(),
      url: z.string().url().optional(),
      insight: z.string(),
    }),
  ),
  scenes: z.array(sceneSchema).min(1),
  cta: captionSchema.optional(),
});

export const compositionPropsSchema = z.object({
  config: videoConfigSchema,
});

export type Caption = z.infer<typeof captionSchema>;
export type SceneConfig = z.infer<typeof sceneSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type CompositionProps = z.infer<typeof compositionPropsSchema>;
