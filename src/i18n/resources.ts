const enCommon = {
  app: {
    name: "Music Collector",
    tagline: "Your records, tapes, discs and files in one place.",
  },
  nav: {
    library: "Library",
    wishlist: "Wishlist",
    artists: "Artists",
    settings: "Settings",
  },
  format: {
    vinyl: "Vinyl",
    cd: "CD",
    cassette: "Cassette",
    digital: "Digital",
  },
} as const;

/** Maps every leaf to `string` while preserving the nested shape. */
type DeepStringSchema<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringSchema<T[K]>;
};
type CommonSchema = DeepStringSchema<typeof enCommon>;

const deCommon: CommonSchema = {
  app: {
    name: "Music Collector",
    tagline: "Deine Platten, Kassetten, CDs und Dateien an einem Ort.",
  },
  nav: {
    library: "Sammlung",
    wishlist: "Wunschliste",
    artists: "Künstler",
    settings: "Einstellungen",
  },
  format: {
    vinyl: "Vinyl",
    cd: "CD",
    cassette: "Kassette",
    digital: "Digital",
  },
};

export const defaultNS = "common";
export const resources = { en: { common: enCommon }, de: { common: deCommon } } as const;
export type AppLanguage = keyof typeof resources;
