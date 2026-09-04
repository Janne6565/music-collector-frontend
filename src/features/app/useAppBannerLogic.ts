import { type MobilePlatform, appStoreUrl, mobilePlatform } from "@/lib/appStores";
import { useEffect, useState } from "react";

/**
 * Whether the one offer of the native app is showing, and how to put it away for good.
 *
 * Screen 25b's rules, in the order they are written on the board:
 *
 * - **Appears** on a phone-width viewport, after the first screen has painted. Never on
 *   desktop, which is why the answer is a media query and not a user-agent test: the
 *   viewport is the thing the banner takes room from.
 * - **Never appears** over a sheet, or a second time. Placement takes care of the rest of
 *   that row: the shell only mounts the banner where the tab bar is, so the add flow, the
 *   detail level, sign-in and the legal pages have no slot for it at all.
 * - **Dismissal is permanent** and silent, stored on this browser.
 *
 * "One appearance" is taken literally: the visit that shows it is the only visit that
 * shows it, so the key is written when it appears rather than when it is dismissed.
 * Ignoring it is an answer too, and asking again next time would make it two asks.
 */

const STORAGE_KEY = "rekordo.appBanner";

/** The breakpoint the whole phone layout is cut at. Above it there is no banner. */
const PHONE = "(max-width: 639.98px)";

export interface AppBannerState {
  readonly visible: boolean;
  /** Which store the offer names, once there is one to name. */
  readonly platform: MobilePlatform;
  readonly url: string;
  readonly dismiss: () => void;
}

export function useAppBannerLogic(): AppBannerState | null {
  const [platform, setPlatform] = useState<MobilePlatform | null>(null);

  useEffect(() => {
    if (spent()) return;
    // A phone with no store link to offer is a phone that gets no banner, and it should
    // not spend its one appearance finding that out.
    const phone = mobilePlatform();
    if (phone === null || appStoreUrl(phone) === null) return;
    if (!globalThis.matchMedia?.(PHONE).matches) return;

    /*
     * One frame late, which is what "after the first screen has painted" buys: the banner
     * shortens the scroll area, and doing that in the same paint as the grid arriving
     * makes the first thing a reader sees a layout that moves. It also settles the last
     * rule cheaply. A sheet open at this moment means the visit started inside one, and
     * the appearance is skipped rather than spent, so the next screen gets it instead.
     */
    const timer = globalThis.setTimeout(() => {
      if (document.querySelector("dialog[open]") !== null) return;
      spend();
      setPlatform(phone);
    }, 600);
    return () => globalThis.clearTimeout(timer);
  }, []);

  if (platform === null) return null;
  const url = appStoreUrl(platform);
  if (url === null) return null;

  return { visible: true, platform, url, dismiss: () => setPlatform(null) };
}

/** Whether this browser has had its one appearance. */
function spent(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) !== null;
  } catch {
    // A browser that refuses storage gets the banner every visit rather than none: the
    // alternative is suppressing an offer nobody has seen, and refusing storage is the
    // reader's setting, not their answer to this.
    return false;
  }
}

function spend(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, "1");
  } catch {
    // Nothing to do. The banner is still dismissible for this session.
  }
}
