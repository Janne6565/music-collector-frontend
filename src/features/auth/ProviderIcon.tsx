/**
 * The provider marks for the OAuth buttons.
 *
 * Drawn inline rather than fetched: both are on the sign-in screen, which is the one page
 * that has to render before any session exists, and a wordless button says less than the
 * logo people are looking for. Google's is its four-colour G, which its brand terms require
 * to keep those colours, so it ignores the surrounding text colour; Apple's is a solid
 * silhouette and follows `currentColor` like any other icon here.
 *
 * An id this does not know renders nothing, so an added provider is a plain label rather
 * than a broken button.
 */
export function ProviderIcon({ providerId }: { readonly providerId: string | undefined }) {
  if (providerId === "google") return <GoogleMark />;
  if (providerId === "apple") return <AppleMark />;
  return null;
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.37 1.43c0 1.14-.42 2.2-1.26 3.06-1 1.03-2.14 1.62-3.36 1.53a3.7 3.7 0 0 1-.06-.6c0-1.11.48-2.28 1.29-3.09.81-.84 2.04-1.44 3.24-1.5.03.21.15.42.15.6zM20.7 17.16c-.36.84-.54 1.2-1.02 1.95-.66 1.05-1.59 2.34-2.73 2.34-1.02.03-1.29-.66-2.67-.66-1.38 0-1.68.69-2.7.69-1.14.03-2.01-1.17-2.67-2.19-1.86-2.88-2.07-6.24-.9-8.04.81-1.26 2.1-2.01 3.33-2.01 1.23 0 2.01.69 3.03.69.99 0 1.59-.69 3.03-.69 1.08 0 2.22.6 3.03 1.62-2.67 1.47-2.25 5.28.27 6.3z" />
    </svg>
  );
}
