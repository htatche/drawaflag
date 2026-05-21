import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../.env'), quiet: true });
config({ quiet: true });

export type FlagEvaluation = {
  matches: boolean;
  score: number;
  summary: string;
  differences: string[];
};

type EvaluateFlagInput = {
  countryCode: string;
  countryName: string;
  referenceFlagDataUrl: string;
  submittedFlagDataUrl: string;
};

const openRouterBaseUrl = 'https://openrouter.ai/api/v1';
const modelName = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-lite-001';
const openRouterTimeoutMilliseconds = 60_000;

type OpenRouterChatCompletion = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class FlagEvaluationConfigurationError extends Error {
  constructor() {
    super('OPENROUTER_API_KEY is required to evaluate submitted flags.');
  }
}

export async function evaluateFlagMatch({
  countryCode,
  countryName,
  referenceFlagDataUrl,
  submittedFlagDataUrl,
}: EvaluateFlagInput): Promise<FlagEvaluation & { model: string }> {
  return evaluateFlagWithOpenRouter({
    countryCode,
    countryName,
    referenceFlagDataUrl,
    submittedFlagDataUrl,
  });
}

async function evaluateFlagWithOpenRouter({
  countryCode,
  countryName,
  referenceFlagDataUrl,
  submittedFlagDataUrl,
}: EvaluateFlagInput): Promise<FlagEvaluation & { model: string; evaluator: 'openrouter' }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    throw new FlagEvaluationConfigurationError();
  }

  const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${openRouterApiKey}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(openRouterTimeoutMilliseconds),
    body: JSON.stringify({
      model: modelName,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: [
            'You are judging whether a user-drawn flag matches the official country flag.',
            'Compare the submitted drawing to the reference flag image.',
            'This is for hand-drawn flags, so ignore neatness, small emblems, coats of arms, text, and exact proportions.',
            'Focus on broad flag structure: main colors, stripe direction, stripe count, color order, large shapes, and relative placement.',
            'A simple solid-color rectangle, reversed stripe order, wrong stripe direction, missing major stripe, or wrong main color is not a match.',
            'Do not award a match for partial color overlap when the layout is clearly different.',
            'If matches is false, differences must include the main visible reason.',
            'Return only valid JSON with keys: matches, score, summary, differences.',
            'score must be a number from 1 to 10. Use 6 or lower for a non-match. Use greater than 5 only when the broad flag pattern is recognizable. matches must be true only when score is greater than 5. differences must be an array of strings.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Country: ${countryName} (${countryCode}). First image is the official reference flag. Second image is the user submission.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: referenceFlagDataUrl,
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: submittedFlagDataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = await readOpenRouterResponse(response);

  if (!response.ok) {
    throw new Error(
      `OpenRouter flag evaluator failed: ${response.status} ${
        payload.error?.message ?? response.statusText
      }`,
    );
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter flag evaluator returned no message content.');
  }

  const parsed = parseFlagEvaluation(content);

  return {
    ...parsed,
    model: modelName,
    evaluator: 'openrouter',
  };
}

async function readOpenRouterResponse(response: Response): Promise<OpenRouterChatCompletion> {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText) as OpenRouterChatCompletion;
  } catch {
    if (!response.ok) {
      throw new Error(`OpenRouter flag evaluator failed: ${response.status} ${responseText}`);
    }

    throw new Error('OpenRouter flag evaluator returned a non-JSON response.');
  }
}

function parseFlagEvaluation(content: unknown): FlagEvaluation {
  const text = extractTextContent(content);
  const json = JSON.parse(extractJsonObject(text)) as Partial<FlagEvaluation>;

  if (
    typeof json.matches !== 'boolean' ||
    typeof json.score !== 'number' ||
    typeof json.summary !== 'string' ||
    !Array.isArray(json.differences) ||
    !json.differences.every((difference) => typeof difference === 'string')
  ) {
    throw new Error('Flag evaluator returned an invalid response shape.');
  }

  return {
    matches: json.score > 5,
    score: json.score,
    summary: json.summary,
    differences: json.differences,
  };
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join('');
  }

  throw new Error('Flag evaluator returned an unreadable response.');
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Flag evaluator did not return JSON.');
  }

  return jsonMatch[0];
}
