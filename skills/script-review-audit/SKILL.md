---
name: script-review-audit
description: Use when reviewing Atypica short-video scripts, hooks, subtitles, and scene plans before rendering. Separate AI Research from AI Interviews, check whether the case fits the chosen feature, and judge TikTok-style hook strength, product relevance, credibility, and visual feasibility. Do not focus only on code correctness; audit the generated content itself.
---

# Script Review Audit

Use this skill when the user asks to review an Atypica generated script, subtitle plan, `data/videos/*.json` config, or the output of `scripts/generate-script.mjs`.

The goal is not "can it render". The goal is "does this script correctly sell the right Atypica capability without feeling like an ad".

## Product Capability Split

Always identify which feature the script is showing before judging the case.

### AI Research

AI Research is for broad market and business research:

- Market validation
- Market opportunity research
- Competitor analysis
- User needs discovery
- Product feature validation
- Business decision support

The script should imply a workflow like:

1. User enters a research question.
2. The product pulls real social/web signals.
3. It finds repeated patterns.
4. It turns those signals into a report or decision.

Good AI Research scripts make manual browsing feel insufficient because the value is in scale, synthesis, and decision-ready output.

### AI Interviews

AI Interviews is for choosing personas and asking deeper follow-up questions:

- UXR and user interview replacement
- Persona-specific consumer psychology
- Interview prep or hiring-manager perspective
- Dating and relationship insight
- Other high-traffic personal scenarios where "deep follow-up questions" are the appeal

The script should imply a workflow like:

1. User searches/selects target personas.
2. AI interviews or probes those personas.
3. The output reveals motives, objections, fears, or decision logic.

High-traffic personal cases such as interviews, job search, and relationships are allowed when the script is clearly about AI Interviews, not AI Research.

## Hard Rules From The User

- Do not mention `Atypica` in subtitle copy unless the user explicitly asks. It feels too much like marketing.
- The video can promote the product, but the copy should feel like a creator sharing a discovery.
- Do not let the script sound like "I just went to TikTok or Instagram and read comments myself".
- Competitor analysis is only one case, not the default answer to every script.
- AI Research and AI Interviews are separate capabilities and should not be blended casually.
- Preferred structure is around 12 seconds: 0-3 seconds真人惊讶/秘密感 hook, then product workflow footage.
- The hook must feel native to TikTok: secretive, surprising, confessional, boss/team tension, or "I almost made a costly mistake".
- Product workflow footage should carry the proof after the hook.
- Scripts should avoid hard-sell endings.

## What to review

Always check these five layers:

1. Correct feature fit
2. Hook strength
3. Product relevance
4. Claim credibility
5. Visual match and narrative progression

## Review workflow

1. Read the generated config in `data/videos/*.json`.
2. Identify whether the script is AI Research or AI Interviews.
3. Check whether the case belongs to that feature.
4. Review the script as a TikTok viewer first, then as a product marketer.
5. List concrete findings with file references.
6. Rewrite weak lines directly when the user wants fixes.

## Audit checklist

### Hook strength

- Does the first subtitle create curiosity in under 2 seconds?
- Is the hook specific, not generic?
- Does it sound like something a real creator would say on TikTok / IG Reels?
- Is it too abstract, too B2B, or too "AI product demo"?
- Does the hook work with a real surprised/secretive facial expression?

Fail examples:

- "This changes everything"
- "AI helps you research faster"
- "Here is a powerful workflow"
- "I used Atypica to do market research"

Pass examples:

- "DO NOT let my boss find out about this"
- "I almost built something nobody actually wanted"
- "My UXR team cannot know I found this shortcut"

### Claim credibility

- Are numbers, time claims, or outcomes believable?
- Does the script overclaim beyond what the footage or product can prove?
- Does each strong claim have a proof beat after it?
- Does the script avoid saying AI automatically selected users if the real workflow requires user search/selection?
- Does the script avoid implying real humans were directly interviewed when the product uses personas or social-data-based interviews?

Common failure:

- Strong hook, then no proof scene
- Saying "all", "every", "instantly", "perfectly" without evidence
- Saying "AI interviewed 500 real users" when the accurate claim is persona-based interviews or social-data-derived insight

### Visual match

- Can each subtitle plausibly sit on top of the assigned footage?
- Does the emotion of the line match the body language in the clip?
- Does the scene duration support reading speed?
- Is a "proof" line sitting on generic beauty footage with no proof on screen?
- After the hook, does the product footage show workflow rather than more generic reaction footage?

This project especially needs this check because templates currently reuse fixed assets.

### Narrative progression

For most Atypica videos, prefer:

1. 0-3s:真人惊讶/秘密感 hook
2. 3-6s: product question/search/input step
3. 6-9s: product analysis/report/pattern step
4. 9-12s: decision or payoff

Flag scripts where scenes feel interchangeable or repetitive.

### CTA and brand fit

- Is the ending a real payoff, not just "this is how I do X now" every time?
- Does it match Atypica's positioning?
- Does it feel like insight-led content rather than template spam?
- Does it promote the capability without saying the brand name in the subtitle?

## Output format

When auditing, respond in this order:

1. Findings
2. Rewritten lines
3. Structural recommendation

Example:

- `data/videos/competitor-ugc.json`: Scene 1 hook is strong but slightly overclaims. "every weakness" is broader than the later proof supports.
- `data/videos/competitor-ugc.json`: Scene 3 proof is more convincing than Scene 2, so the order may be inverted.
- `data/videos/competitor-ugc.json`: CTA line is generic and reusable across too many topics, which weakens memorability.

Then propose exact replacement lines.

## Project-specific heuristics

For this repository, apply these extra checks:

- Prefer subtitles that can be read comfortably in 1.5 to 2.5 seconds per beat.
- Avoid repeating the same syntactic pattern across presets.
- Avoid generic ending lines reused across competitor, market, interview, dating, and validation topics.
- If the JSON includes `zh` and `en`, check whether both carry the same persuasive meaning instead of literal translation only.
- If footage is soft, lifestyle, or reaction-based, avoid dense analytical wording.
- For AI Research, prefer business scenarios unless the user asks otherwise.
- For AI Interviews, personal high-traffic scenarios can be valid if they center on persona selection and follow-up questions.
- If the script includes job search, interviews, dating, or relationships, verify it is framed as AI Interviews rather than AI Research.

## When to escalate

Recommend generator changes, not just line edits, when you observe:

- The same CTA pattern across many presets
- The same scene progression regardless of topic
- Hook lines that come from template reuse instead of research evidence
- Weak linkage between `research` inputs and final subtitle outputs
- AI Research and AI Interviews are mixed in a way that confuses the product promise

If these repeat, review `scripts/generate-script.mjs` and propose generator-level fixes.
