/**
 * Where "Get" goes, and which store this phone belongs to — screens 25b and 25c.
 *
 * Two constants and one guess. The guess is the platform, and it is made from the user
 * agent because there is nothing better: the choice is only ever between two store links,
 * and being wrong costs a reader one tap on a page that names the other platform. Feature
 * detection would answer a different question entirely.
 *
 * A store URL that is null is not a missing string, it is a store the app is not in yet.
 * A "Get" button pointing at a listing that does not exist reads as a broken app rather
 * than as an app that has not been published there, so everything downstream renders
 * without the offer when the link is null. Filling one in is the only step needed to turn
 * that platform's offer on.
 */

/**
 * The App Store listing, without a storefront segment.
 *
 * `apps.apple.com/app/id…` resolves to the reader's own region; the `/ca/` form the link
 * is copied out of pins everyone to the Canadian store and shows a country switcher to
 * everybody else.
 */
export const IOS_APP_URL: string | null = "https://apps.apple.com/app/id6805122251";

/**
 * Android is not a store listing yet, it is a tester sign-up form.
 *
 * Kept in the same slot deliberately, because everything downstream needs exactly one
 * answer to "where does this phone go" — but it is *not* the same offer, and
 * {@link androidIsTesterSignup} exists so the copy can say so. A button reading "Get" that
 * opens a form asking for an email address is a small lie, and this is the one screen in
 * the app whose whole argument is that it does not tell them.
 */
export const ANDROID_APP_URL: string | null = "https://n8n.jannekeipert.de/form/rekordo-tester";

/**
 * Whether the Android destination is the closed test rather than a public listing.
 *
 * A constant rather than a check on the URL: when the app is listed on Play this becomes
 * false and the copy switches back to the ordinary offer in one edit.
 */
export const androidIsTesterSignup = true;

export type MobilePlatform = "IOS" | "ANDROID";

/**
 * Which of the two phones this is, or null for everything else.
 *
 * iPadOS reports itself as a Mac and is deliberately not caught: the offer is for a phone
 * in a record shop, and a tablet on a desk is the case the web app already serves best.
 */
export function mobilePlatform(userAgent: string = navigator.userAgent): MobilePlatform | null {
  if (/android/i.test(userAgent)) return "ANDROID";
  // The iPod is in the list because Safari still sends it and it costs one word.
  if (/iphone|ipod/i.test(userAgent)) return "IOS";
  return null;
}

/** The store link for a platform, or null while that store's URL is still unset. */
export function appStoreUrl(platform: MobilePlatform | null): string | null {
  if (platform === "IOS") return IOS_APP_URL;
  if (platform === "ANDROID") return ANDROID_APP_URL;
  return null;
}

/**
 * The i18n key for whatever the button says on this platform.
 *
 * Android's destination is a form asking to be let into a closed test, so the word cannot
 * be "Get": nothing is got. The rest of the offer stands unchanged, which is why only the
 * verb moves.
 */
export function getLabelKey(
  platform: MobilePlatform | null,
): "appBanner.get" | "appBanner.joinTest" {
  return platform === "ANDROID" && androidIsTesterSignup ? "appBanner.joinTest" : "appBanner.get";
}
