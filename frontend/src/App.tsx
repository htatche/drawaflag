import { useState } from 'react';
import { Box } from '@tldraw/editor';
import type { Editor } from 'tldraw';
import './App.css';
import { PaintEditor } from './PaintEditor';
import { CountryPrompt, type Country } from './CountryPrompt';
import { MatchResult, type MatchResultData } from './MatchResult';

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

const matchDisplayMilliseconds = 5000;
const noMatchDisplayMilliseconds = 10000;

function App() {
  const [country, setCountry] = useState<Country | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [countryRefreshKey, setCountryRefreshKey] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);

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
        reasons: [evaluation.summary, ...evaluation.differences].filter(Boolean),
        durationMilliseconds: matchDisplayMilliseconds,
        flagImage: evaluatedCountry.img,
        flagAlt: `${country.name.common} flag`,
      });
      window.setTimeout(() => {
        setSendState('idle');
        moveToNextCountry();
      }, matchDisplayMilliseconds);
      return;
    }

    setMatchResult({
      tone: 'miss',
      message: `Not quite. That did not match ${country.name.common}. Next country.`,
      reasons: [evaluation.summary, ...evaluation.differences].filter(Boolean),
      durationMilliseconds: noMatchDisplayMilliseconds,
      flagImage: evaluatedCountry.img,
      flagAlt: `${country.name.common} flag`,
    });

    window.setTimeout(() => {
      setSendState('idle');
      moveToNextCountry();
    }, noMatchDisplayMilliseconds);
  };

  const sendButtonDisabled = !country || !editor || sendState === 'sending';
  const sendButtonLabel = sendState === 'sent' ? 'Checked' : 'Check flag';

  return (
    <main className="app-shell">
      <header className="app-header">
        <CountryPrompt onCountryChange={setCountry} refreshKey={countryRefreshKey} />
        {matchResult ? <MatchResult result={matchResult} /> : null}
      </header>
      <PaintEditor
        checkFlagButton={{
          ariaLabel: country ? `Check flag for ${country.name.common}` : 'Check flag',
          disabled: sendButtonDisabled,
          label: sendButtonLabel,
          onClick: () => {
            sendFlag().catch((error: unknown) => {
              console.error(error);
            });
          },
          state: sendState,
        }}
        onEditorReady={setEditor}
      />
    </main>
  );
}

export default App;
