import { useEffect, useState } from 'react';

import './CountryPrompt.css';

type Country = Readonly<{
  cca2: string;
  name: string;
}>;

export function CountryPrompt() {
  const [countryName, setCountryName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRandomCountry() {
      const response = await fetch('/api/countries', {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to load countries');
      }

      const countries = (await response.json()) as Country[];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];

      setCountryName(randomCountry?.name ?? null);
    }

    loadRandomCountry().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error(error);
    });

    return () => {
      controller.abort();
    };
  }, []);

  if (!countryName) return null;

  return (
    <div className="country-prompt" aria-live="polite">
      {countryName}
    </div>
  );
}
