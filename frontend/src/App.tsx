import { useState } from 'react';
import { Check, LoaderCircle, Send } from 'lucide-react';
import type { Editor } from 'tldraw';
import './App.css';
import { PaintEditor } from './PaintEditor';
import { CountryPrompt, type Country } from './CountryPrompt';

function App() {
  const [country, setCountry] = useState<Country | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const sendFlag = async () => {
    if (!country || !editor) return;

    const shapes = editor.getCurrentPageShapes();

    if (shapes.length === 0) return;

    setSendState('sending');

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
      throw new Error('Failed to send flag');
    }

    setSendState('sent');
    window.setTimeout(() => {
      setSendState('idle');
    }, 1600);
  };

  const sendButtonDisabled = !country || !editor || sendState === 'sending';
  const sendButtonLabel = sendState === 'sent' ? 'Sent' : 'Send flag';

  return (
    <main className="app-shell">
      <header className="app-header">
        <CountryPrompt onCountryChange={setCountry} />
        <button
          aria-label={country ? `Send flag for ${country.name}` : 'Send flag'}
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
      </header>
      <PaintEditor onEditorReady={setEditor} />
    </main>
  );
}

export default App;
