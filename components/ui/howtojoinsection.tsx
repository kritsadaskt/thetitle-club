import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const highlight = (chunks: ReactNode) => (
  <span className="text-lime-400">{chunks}</span>
);

function HowToJoinSection() {
  const t = useTranslations("landing");

  return (
    <div
      className="py-20 bg-cream-200 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/club/how-to_bg.webp')" }}
    >
      <div className="container mx-auto px-4">
        <Image src="/club/how-to-join-headline.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-5/6 md:w-1/3 mx-auto" />
        <div className="h-10" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-1">
            <Image src="/club/how-to-join-1.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              {t.rich("howToJoin.scanHere", { highlight })}
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-2.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              {t.rich("howToJoin.tapBecome", { highlight })}
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-3.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              {t.rich("howToJoin.fillDetails", { highlight })}
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-4.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              {t.rich("howToJoin.confirmEmail", { highlight })}
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-5.webp" alt={t("howToJoin.imageAlt")} width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              {t.rich("howToJoin.startEnjoying", { highlight })}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="w-5/6 mx-auto">
          <h2 className="text-4xl text-white text-center">
            {t("howToRedeem.title")} <span className="text-lime-400">{t("howToRedeem.titleHighlight")}</span>
          </h2>
          <div className="h-10" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-1.webp" alt={t("howToRedeem.imageAlt")} width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
                {t.rich("howToRedeem.step1", { highlight })}
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-2.webp" alt={t("howToRedeem.imageAlt")} width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
                {t.rich("howToRedeem.step2", { highlight })}
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-4.webp" alt={t("howToRedeem.imageAlt")} width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
                {t.rich("howToRedeem.step3", { highlight })}
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-3.webp" alt={t("howToRedeem.imageAlt")} width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
                {t.rich("howToRedeem.step4", { highlight })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowToJoinSection;
