import { useState } from 'react';
import { Check, LoaderCircle, Send } from 'lucide-react';
import type { Editor } from 'tldraw';
import './App.css';
import { PaintEditor } from './PaintEditor';
import { CountryPrompt, type Country } from './CountryPrompt';

type FlagEvaluation = {
  matches: boolean;
  score: number;
  summary: string;
  differences: string[];
  model: string;
};

type FlagSubmissionResponse = {
  country: Country & {
    img: string;
  };
  evaluation: FlagEvaluation;
};

type MatchResult = {
  tone: 'success' | 'miss' | 'error';
  message: string;
  flagImage?: string;
  flagAlt?: string;
};

function App() {
  const [country, setCountry] = useState<Country | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [countryRefreshKey, setCountryRefreshKey] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const moveToNextCountry = () => {
    if (editor) {
      editor.deleteShapes(editor.getCurrentPageShapes().map((shape) => shape.id));
    }

    setMatchResult(null);
    setCountryRefreshKey((currentKey) => currentKey + 1);
  };

  const sendFlag = async () => {
    if (!country || !editor) return;

    const shapes = editor.getCurrentPageShapes();

    if (shapes.length === 0) return;

    setSendState('sending');
    setMatchResult(null);

    const { blob } = await editor.toImage(shapes, {
      background: true,
      format: 'png',
      padding: 0,
    });

    const response = await fetch(`/api/countries/${country.cca2}/flag`, {
      method: 'POST',
      headers: {
        'content-type': 'image/png',
      },
      body: blob,
    });

    if (!response.ok) {
      setSendState('idle');
      setMatchResult({
        tone: 'error',
        message: 'Could not check the flag. Try sending it again.',
      });
      return;
    }

    const { country: evaluatedCountry, evaluation } =
      (await response.json()) as FlagSubmissionResponse;

    console.log(
      evaluation.matches
        ? `Flag matched ${country.name.common}`
        : `Flag did not match ${country.name.common}`,
      {
        differences: evaluation.differences,
        summary: evaluation.summary,
      },
    );

    setSendState('sent');

    if (evaluation.matches) {
      setMatchResult({
        tone: 'success',
        message: `Correct. Nice work drawing ${country.name.common}.`,
        flagImage: evaluatedCountry.img,
        flagAlt: `${country.name.common} flag`,
      });
      window.setTimeout(() => {
        setSendState('idle');
      }, 1600);
      return;
    }

    setMatchResult({
      tone: 'miss',
      message: `Not quite. That did not match ${country.name.common}. Next country.`,
    });

    window.setTimeout(() => {
      setSendState('idle');
      moveToNextCountry();
    }, 2200);
  };

  const sendButtonDisabled = !country || !editor || sendState === 'sending';
  const sendButtonLabel = sendState === 'sent' ? 'Sent' : 'Send flag';

  return (
    <main className="app-shell">
      <header className="app-header">
        <CountryPrompt onCountryChange={setCountry} refreshKey={countryRefreshKey} />
        <button
          aria-label={country ? `Send flag for ${country.name.common}` : 'Send flag'}
          className="send-flag-button"
          data-state={sendState}
          disabled={sendButtonDisabled}
          onClick={() => {
            sendFlag().catch((error: unknown) => {
              console.error(error);
            });
          }}
          type="button"
        >
          {sendState === 'sending' ? (
            <LoaderCircle
              aria-hidden="true"
              className="send-flag-spinner"
              size={24}
              strokeWidth={2.5}
            />
          ) : sendState === 'sent' ? (
            <Check aria-hidden="true" size={24} strokeWidth={3} />
          ) : (
            <Send aria-hidden="true" size={24} strokeWidth={2.5} />
          )}
          <span>{sendButtonLabel}</span>
        </button>
        {matchResult ? (
          <div className="match-result" data-tone={matchResult.tone} role="status">
            {matchResult.flagImage ? (
              <img
                alt={matchResult.flagAlt ?? ''}
                className="match-result-flag"
                src={matchResult.flagImage}
              />
            ) : null}
            <span>{matchResult.message}</span>
          </div>
        ) : null}
      </header>
      <PaintEditor onEditorReady={setEditor} />
    </main>
  );
}

export default App;
