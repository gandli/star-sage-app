# PRD — StarSage (星智)

## 1. Overview

**Product Name:** StarSage (星智)
**Tagline:** AI-powered astrology — decode your birth chart, understand yourself.
**Target Users:** Astrology enthusiasts, curious millennials/Gen-Z, people seeking self-reflection tools.

## 2. Problem Statement

Birth chart interpretation requires specialized knowledge. Existing apps either give shallow sun-sign horoscopes or require astrology expertise to understand. StarSage bridges this gap with AI-powered, personalized, plain-language interpretations.

## 3. Core Features

### 3.1 Birth Chart Generation
- Input: date, time, and place of birth
- Output: complete natal chart with planet positions, houses, and aspects
- Visual chart rendering (wheel diagram)

### 3.2 AI Interpretation
- Plain-language explanation of each planet placement
- Personality insights based on chart patterns
- Compatibility analysis between two charts (synastry)

### 3.3 Daily Insights
- Personalized daily/weekly transit readings
- Push notifications for significant transits
- Moon phase integration

### 3.4 Social Sharing
- Beautiful shareable chart cards
- "Compare charts with friends" feature

## 4. Technical Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Flutter App │────▶│  Backend API │────▶│  Ephemeris   │
│  (Frontend)  │     │  (Node.js)   │     │  (Swiss Eph) │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │   LLM API    │
                     │(Interpretation)│
                     └──────────────┘
```

## 5. MVP Scope

| Feature | MVP | V2 |
|---------|-----|----|
| Birth chart generation | ✅ | |
| AI personality reading | ✅ | |
| Visual chart wheel | ✅ | |
| Daily transits | | ✅ |
| Compatibility/synastry | | ✅ |
| Social sharing cards | | ✅ |

## 6. Monetization

- Free: basic chart + one AI reading
- Premium ($4.99/mo): unlimited readings, daily transits, compatibility

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Perceived as unscientific | Position as self-reflection tool, not prediction |
| One-time use (check chart and leave) | Daily transits for retention |
| LLM hallucination in readings | Template-guided generation with astrology constraints |
