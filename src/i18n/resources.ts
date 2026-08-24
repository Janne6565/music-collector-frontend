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
    all: "All",
    vinyl: "Vinyl",
    cd: "CD",
    cassette: "Cassette",
    digital: "Digital",
    other: "Other",
  },
  library: {
    title: "Library",
    formats: "Formats",
    counts: "{{copies}} copies · {{releases}} releases",
    searchPlaceholder: "Search artist, title, catalog number",
    addItem: "Add item",
    sortedBy: "Sorted by {{sort}}",
    sort: {
      addedDesc: "date added",
      artistAsc: "artist",
      yearDesc: "year",
    },
    empty: {
      title: "Nothing here yet",
      body: "Add the first record, tape, disc or download to your collection.",
      action: "Add your first item",
    },
    noMatches: "No items match this filter.",
  },
  add: {
    title: "Add item",
    searchPlaceholder: "Search for a release or artist",
    hint: "Search by artist and title, or paste a barcode.",
    resultCount: "{{count}} releases",
    searching: "Searching MusicBrainz…",
    failed: "Could not reach the release database. Try again in a moment.",
    noResults: "Nothing found for that search.",
    add: "Add to library",
    added: "Added",
  },
  detail: {
    back: "Library",
    notFound: "That item is no longer in your collection.",
    condition: "Condition",
    paid: "Paid",
    bought: "Bought",
    where: "Where",
    pressing: "Pressing",
    rating: "Rating",
    notes: "Notes",
    notesEmpty: "No notes yet.",
    otherCopies: "Other copies of this release",
    yourRating: "your rating",
    remove: "Remove from library",
  },
  common: {
    unknownYear: "Year unknown",
    save: "Save",
    cancel: "Cancel",
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
    all: "Alle",
    vinyl: "Vinyl",
    cd: "CD",
    cassette: "Kassette",
    digital: "Digital",
    other: "Sonstige",
  },
  library: {
    title: "Sammlung",
    formats: "Formate",
    counts: "{{copies}} Exemplare · {{releases}} Veröffentlichungen",
    searchPlaceholder: "Künstler, Titel, Katalognummer suchen",
    addItem: "Hinzufügen",
    sortedBy: "Sortiert nach {{sort}}",
    sort: {
      addedDesc: "Hinzugefügt",
      artistAsc: "Künstler",
      yearDesc: "Jahr",
    },
    empty: {
      title: "Noch nichts da",
      body: "Füge die erste Platte, Kassette, CD oder Datei zu deiner Sammlung hinzu.",
      action: "Erstes Exemplar hinzufügen",
    },
    noMatches: "Keine Einträge passen zu diesem Filter.",
  },
  add: {
    title: "Hinzufügen",
    searchPlaceholder: "Nach Veröffentlichung oder Künstler suchen",
    hint: "Nach Künstler und Titel suchen oder einen Barcode einfügen.",
    resultCount: "{{count}} Veröffentlichungen",
    searching: "Suche bei MusicBrainz…",
    failed: "Die Datenbank ist gerade nicht erreichbar. Versuche es gleich noch einmal.",
    noResults: "Nichts zu dieser Suche gefunden.",
    add: "Zur Sammlung",
    added: "Hinzugefügt",
  },
  detail: {
    back: "Sammlung",
    notFound: "Dieses Exemplar ist nicht mehr in deiner Sammlung.",
    condition: "Zustand",
    paid: "Bezahlt",
    bought: "Gekauft",
    where: "Wo",
    pressing: "Pressung",
    rating: "Bewertung",
    notes: "Notizen",
    notesEmpty: "Noch keine Notizen.",
    otherCopies: "Weitere Exemplare dieser Veröffentlichung",
    yourRating: "deine Bewertung",
    remove: "Aus der Sammlung entfernen",
  },
  common: {
    unknownYear: "Jahr unbekannt",
    save: "Speichern",
    cancel: "Abbrechen",
  },
};

export const defaultNS = "common";
export const resources = { en: { common: enCommon }, de: { common: deCommon } } as const;
export type AppLanguage = keyof typeof resources;
