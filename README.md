# drawaflag

## Description

Flag drawing game where the app shows you a country name and you need to draw the flag as best you can.

## How and what

- Use a VLM to decide whether the drawing matches the actual flag.
- The real flag is shown after the player attempts drawing, and the reasons for/if a non-match will be displayed

## Goal

- 1-day-only project (LLM-assisted) to learn LangChain basics
- Put into practice React/TS skills recently learned in my other pet project https://github.com/htatche/flagxword

## Run locally

### Requirements

- Node.js 22+
- npm
- An OpenRouter account with an API key

The backend uses `gemini-2.0-flash-lite-001` model through OpenRouter to compare the drawn flag image with the real flag.

Create an account and API key from https://openrouter.ai/settings/keys.

*Note: `gemini-2.0-flash-lite-001` is going away on June 1 '26, after it's recommended to swap it out for the (non-free-anymore) `google/gemini-3.1-flash-lite`*

### Environment

Create a `.env` file in the project root from `.env.example` and fillout the API key

```sh
cp .env.example .env
```

### Install and start

```sh
npm install
npm run dev
```

Browse at http://127.0.0.1:5173
