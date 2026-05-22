import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserCountry = { name: string; iso3: string };

export const COUNTRY_OPTIONS: UserCountry[] = [
  { name: "United States", iso3: "USA" },
  { name: "United Kingdom", iso3: "GBR" },
  { name: "Germany", iso3: "DEU" },
  { name: "France", iso3: "FRA" },
  { name: "Netherlands", iso3: "NLD" },
  { name: "Italy", iso3: "ITA" },
  { name: "Spain", iso3: "ESP" },
  { name: "Canada", iso3: "CAN" },
  { name: "Mexico", iso3: "MEX" },
  { name: "Brazil", iso3: "BRA" },
  { name: "India", iso3: "IND" },
  { name: "China", iso3: "CHN" },
  { name: "Japan", iso3: "JPN" },
  { name: "South Korea", iso3: "KOR" },
  { name: "Singapore", iso3: "SGP" },
  { name: "Vietnam", iso3: "VNM" },
  { name: "Thailand", iso3: "THA" },
  { name: "Indonesia", iso3: "IDN" },
  { name: "Australia", iso3: "AUS" },
  { name: "United Arab Emirates", iso3: "ARE" },
  { name: "Saudi Arabia", iso3: "SAU" },
  { name: "Turkey", iso3: "TUR" },
  { name: "South Africa", iso3: "ZAF" },
  { name: "Nigeria", iso3: "NGA" },
  { name: "Chile", iso3: "CHL" },
  { name: "Argentina", iso3: "ARG" },
];

const DEFAULT: UserCountry = { name: "United States", iso3: "USA" };
const KEY = "supplyrisk.userCountry";

type Ctx = { country: UserCountry; setCountry: (c: UserCountry) => void };
const UserCountryCtx = createContext<Ctx>({ country: DEFAULT, setCountry: () => {} });

export function UserCountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<UserCountry>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserCountry;
        if (parsed?.iso3 && parsed?.name) setCountryState(parsed);
      }
    } catch {}
  }, []);

  const setCountry = (c: UserCountry) => {
    setCountryState(c);
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  };

  return <UserCountryCtx.Provider value={{ country, setCountry }}>{children}</UserCountryCtx.Provider>;
}

export const useUserCountry = () => useContext(UserCountryCtx);