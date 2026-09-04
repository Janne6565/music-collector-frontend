import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The banner's rules from screen 25b, which are all about when it does *not* appear.
 *
 * Worth testing without a screen: the component is a strip of markup, and every decision
 * that matters is in this hook. The one rule not asserted here is placement, which is not
 * a decision this hook makes at all — the shell mounts the banner only where the tab bar
 * is, so the add flow, the detail level, sign-in and the legal pages have no slot for it.
 */

const store = vi.hoisted(() => ({ url: "https://apps.apple.com/app/id1" as string | null }));
vi.mock("@/lib/appStores", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appStores")>("@/lib/appStores");
  return { ...actual, appStoreUrl: () => store.url };
});

const { useAppBannerLogic } = await import("@/features/app/useAppBannerLogic");

/** The user agent is the only thing that says which of the two phones this is. */
function pretendPhone(userAgent: string): void {
  Object.defineProperty(globalThis.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36";

function pretendWidth(phone: boolean): void {
  globalThis.matchMedia = vi.fn().mockReturnValue({ matches: phone }) as never;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  store.url = "https://apps.apple.com/app/id1";
  pretendPhone(IPHONE);
  pretendWidth(true);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Renders and lets the "after the first screen has painted" delay elapse. */
async function shown(): Promise<boolean> {
  const { result } = renderHook(() => useAppBannerLogic());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  return result.current !== null;
}

describe("useAppBannerLogic", () => {
  it("appears on a phone, once", async () => {
    expect(await shown()).toBe(true);
    // The second visit is the same browser with the key already written. "One appearance,
    // first visit" is taken literally: ignoring the offer is an answer too.
    expect(await shown()).toBe(false);
  });

  it("never appears on a desktop", async () => {
    pretendPhone(MAC);
    pretendWidth(false);
    expect(await shown()).toBe(false);
    // And it did not spend the one appearance finding that out, so the same person on
    // their phone later still gets it.
    pretendPhone(IPHONE);
    pretendWidth(true);
    expect(await shown()).toBe(true);
  });

  it("never appears on a phone-sized window that is not a phone", async () => {
    // A narrow desktop window is not somebody who could install anything.
    pretendPhone(MAC);
    expect(await shown()).toBe(false);
  });

  it("never appears on a phone at desktop width", async () => {
    // The banner takes room from the layout, so the viewport decides, not the device.
    pretendWidth(false);
    expect(await shown()).toBe(false);
  });

  it("does not appear, or spend itself, with no store to send anyone to", async () => {
    store.url = null;
    expect(await shown()).toBe(false);
    store.url = "https://apps.apple.com/app/id1";
    expect(await shown()).toBe(true);
  });

  it("skips the appearance rather than spending it when a sheet is open", async () => {
    // A visit that starts inside a sheet — a shared link opening a record — gets the
    // banner on the next screen instead of losing it to a moment it was invisible.
    const sheet = document.createElement("dialog");
    sheet.setAttribute("open", "");
    document.body.append(sheet);
    expect(await shown()).toBe(false);

    sheet.remove();
    expect(await shown()).toBe(true);
  });

  it("stays gone for good once dismissed", async () => {
    const { result } = renderHook(() => useAppBannerLogic());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).not.toBeNull();

    const dismiss = result.current?.dismiss;
    act(() => dismiss?.());
    expect(result.current).toBeNull();

    // Permanent and silent: no confirmation, and no second ask on any later visit.
    expect(await shown()).toBe(false);
  });
});
