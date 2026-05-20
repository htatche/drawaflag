import './App.css';
import { PaintEditor } from './PaintEditor';
import { CountryPrompt } from './CountryPrompt';

function App() {
  return (
    <main className="app-shell">
      <CountryPrompt />
      <PaintEditor />
    </main>
  );
}

export default App;
