// src/pages/NotFoundPage.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";

import LostBird from "@assets/Images/404NoText.png";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  const goHome = React.useCallback(() => navigate("/"), [navigate]);
  const goBack = React.useCallback(() => navigate(-1), [navigate]);
  const goContact = React.useCallback(() => navigate("/contact"), [navigate]); // adjust route if needed

  return (
    <PageContainer>
      <ContentWrapperV2>
        <main className="mx-auto flex max-w-3xl items-center justify-center ">
          <SurfaceCard className="w-full max-w-xl p-6 text-center sm:p-8 md:p-10">
            <div className="mb-6 flex justify-center">
              <Mascot
                src={LostBird}
                alt="En liten fågel som letar efter rätt sida"
                size={190}
                smSize={220}
                mdSize={260}
                lgSize={280}
              />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[rgb(var(--eb-text))] sm:text-4xl">
              Hoppsan, här var det tomt.
            </h1>

            <p className="mt-3 text-base text-[rgb(var(--eb-text)/0.7)] sm:text-lg">
              Sidan du försökte nå finns inte, eller har flyttat. Vi hjälper dig
              tillbaka.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              {/* Secondary action: back (only if it makes sense) */}
              {canGoBack ? (
                <SecondaryButton onClick={goBack} className="justify-center">
                  Gå tillbaka
                </SecondaryButton>
              ) : (
                <SecondaryButton onClick={goContact} className="justify-center">
                  Kontakta oss
                </SecondaryButton>
              )}

              {/* Primary action */}
              <CtaButton onClick={goHome} className="justify-center">
                Startsidan
              </CtaButton>
            </div>

            <p className="mt-6 text-sm text-[rgb(var(--eb-text)/0.45)]">
              Felkod: 404
            </p>
          </SurfaceCard>
        </main>
      </ContentWrapperV2>
    </PageContainer>
  );
}
