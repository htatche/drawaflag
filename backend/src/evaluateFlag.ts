import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
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
const modelName = 'openrouter/free';
const timeoutMilliseconds = 30_000;

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
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    throw new FlagEvaluationConfigurationError();
  }

  const flagJudge = new ChatOpenAI({
    apiKey: openRouterApiKey,
    model: modelName,
    temperature: 0,
    timeout: timeoutMilliseconds,
    useResponsesApi: false,
    configuration: {
      baseURL: openRouterBaseUrl,
    },
  });

  const response = await flagJudge.invoke(
    [
      new SystemMessage(
        [
          'You are judging whether a user-drawn flag matches the official country flag.',
          'Compare the submitted drawing to the reference flag image.',
          'Reward correct colors, stripe orientation, symbols, layout, and relative placement.',
          'Do not require pixel perfection because the submitted image may be hand drawn.',
          'Not all details must be present, focus on the overall layout and colors.',
          'Return only valid JSON with keys: matches, score, summary, differences.',
          'score must be a number from 1 to 10, where 1 is no resemblance, 5 is around a 50% match, and 10 is an exact or near-exact match. matches must be true only when score is greater than 5. differences must be an array of strings.',
        ].join(' '),
      ),
      new HumanMessage({
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
      }),
    ],
    {
      response_format: {
        type: 'json_object',
      },
    },
  );

  const parsed = parseFlagEvaluation(response.content);

  return {
    ...parsed,
    model: modelName,
  };
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

  const score = Math.max(1, Math.min(10, json.score));

  return {
    matches: score > 5,
    score,
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
