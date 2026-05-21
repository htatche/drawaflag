import type { CSSProperties } from 'react';
import './MatchResult.css';

export type MatchResultData = {
  tone: 'success' | 'miss' | 'error';
  message: string;
  reasons?: string[];
  durationMilliseconds?: number;
  flagImage?: string;
  flagAlt?: string;
};

type MatchResultProps = {
  result: MatchResultData;
};

export function MatchResult({ result }: MatchResultProps) {
  return (
    <div className="match-result" data-tone={result.tone} role="status">
      {result.flagImage ? (
        <img alt={result.flagAlt ?? ''} className="match-result-flag" src={result.flagImage} />
      ) : null}
      <span className="match-result-message">{result.message}</span>
      {result.reasons?.length ? (
        <span className="match-result-reasons">{result.reasons.join(' ')}</span>
      ) : null}
      {result.durationMilliseconds ? (
        <svg
          aria-hidden="true"
          className="match-result-countdown"
          viewBox="0 0 44 44"
          style={
            {
              '--countdown-duration': `${result.durationMilliseconds}ms`,
            } as CSSProperties
          }
        >
          <circle className="match-result-countdown-track" cx="22" cy="22" r="17" />
          <circle className="match-result-countdown-progress" cx="22" cy="22" r="17" />
        </svg>
      ) : null}
    </div>
  );
}
