import { useEffect, useState } from 'react';

import './CountryPrompt.css';

export type Country = Readonly<{
  cca2: string;
  name: string;
}>;

type CountryPromptProps = {
  onCountryChange: (country: Country | null) => void;
};

export function CountryPrompt({ onCountryChange }: CountryPromptProps) {
  const [country, setCountry] = useState<Country | null>(null);

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

      setCountry(randomCountry ?? null);
      onCountryChange(randomCountry ?? null);
    }

    loadRandomCountry().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error(error);
    });

    return () => {
      controller.abort();
    };
  }, [onCountryChange]);

  if (!country) return null;

  return (
    <div className="country-prompt" aria-live="polite">
      {country.name}
    </div>
  );
}
