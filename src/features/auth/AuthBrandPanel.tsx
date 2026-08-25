import { FormatThumb } from "@/components/FormatThumb";
import type { Format } from "@janne6565/music-collector-shared";
import { Disc3, Heart, Layers, ScanBarcode } from "lucide-react";
import { useTranslation } from "react-i18next";

const SHOWCASE: readonly Format[] = ["VINYL", "CD", "CASSETTE", "DIGITAL"];

/** The dark half of screens 4c and 4d. */
export function AuthBrandPanel({ mode }: { readonly mode: "SIGN_IN" | "REGISTER" }) {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-[520px] flex-none flex-col justify-between bg-ink p-13 px-12 py-13 md:flex">
      <div>
        <div className="flex items-center gap-3 text-paper">
          <Disc3 size={22} strokeWidth={1.6} aria-hidden />
          <span className="font-serif text-[19px]">{t("app.name")}</span>
        </div>

        <h2 className="mt-14 font-serif text-[40px] leading-[1.15] text-white text-pretty">
          {mode === "SIGN_IN" ? t("authPanel.signInHeadline") : t("authPanel.registerHeadline")}
        </h2>

        {mode === "SIGN_IN" ? (
          <p className="mt-4 max-w-[360px] text-[14.5px] leading-[1.7] text-white/60 text-pretty">
            {t("authPanel.signInBody")}
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            <Bullet icon={<ScanBarcode size={17} strokeWidth={1.75} aria-hidden />}>
              {t("authPanel.bulletScan")}
            </Bullet>
            <Bullet icon={<Layers size={17} strokeWidth={1.75} aria-hidden />}>
              {t("authPanel.bulletCopies")}
            </Bullet>
            <Bullet icon={<Heart size={17} strokeWidth={1.75} aria-hidden />}>
              {t("authPanel.bulletWishlist")}
            </Bullet>
          </ul>
        )}
      </div>

      {mode === "SIGN_IN" ? (
        <div className="grid grid-cols-4 gap-3.5">
          {SHOWCASE.map((format) => (
            <div key={format} className="aspect-square">
              <FormatThumb format={format} />
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/35">
          {t("authPanel.freeNote")}
        </p>
      )}
    </aside>
  );
}

function Bullet({
  icon,
  children,
}: { readonly icon: React.ReactNode; readonly children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-white/70">
      <span className="text-white/50">{icon}</span>
      {children}
    </li>
  );
}
