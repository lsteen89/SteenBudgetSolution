import React from "react";
import { Banknote, PiggyBank, CreditCard, Flag, XCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/hooks/auth/useAuth';
import GlassPane from "@components/layout/GlassPane";
import { useEffect } from "react";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { Skeleton } from "@/components/ui/Skeleton";

interface StepWelcomeProps {
  connectionError: boolean;
  failedAttempts: number;
  loading: boolean;
  onRetry: () => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({ connectionError, failedAttempts, loading, onRetry }) => {
  const { user } = useAuth();
  useEffect(() => {
    //console.log("StepWelcome props:", { connectionError, failedAttempts, loading });
  }, [connectionError, failedAttempts, loading]);
  if (loading) {
    return (
      <GlassPane>
        {/* Give the pane some breathing-room so the loader is centred nicely */}
        <div className="min-h-48 flex items-center justify-center">
          <Skeleton />
        </div>
      </GlassPane>
    );
  }
  return (
    <GlassPane>
      {connectionError ? (
        <>
          <p className="text-white">
            Anslutningsproblem upptäcktes. Vi kan för närvarande inte spara eller hämta data.
            Försöka igen eller kontakta support om problemet kvarstår. <br />
            <a href="mailto:support@ebudget.se" className="underline">
              support@ebudget.se
            </a>{" "}
            eller maila oss direkt <Link to="/contact" className="underline">här</Link>.
          </p>
          {failedAttempts > 3 && (
            <p className="text-black mt-4">
              Inga fler försök kan göras. Vänligen kontakta support.
            </p>
          )}
          <button
            onClick={onRetry}
            disabled={failedAttempts > 3}
            className={`mt-6 px-4 py-2 items-center gap-5 text-gray-900 rounded-lg transition ml-auto bg-limeGreen ${failedAttempts > 3 ? "opacity-50 cursor-not-allowed" : "hover:bg-darkLimeGreen hover:text-white"
              }`}
          >
            Försök igen
          </button>
        </>
      ) : (
        <>
          {user ? (
            <p className="text-customBlue2">
              Kul att du är här, {user.firstName}! Vi hjälper dig att få full kontroll över din ekonomi.
              För att komma igång behöver vi bara några uppgifter från dig.
            </p>
          ) : (
            <p className="text-customBlue2">
              Kul att du är här! Vi hjälper dig att få full kontroll över din ekonomi.
              För att komma igång behöver vi bara några uppgifter från dig.
            </p>
          )}

          <div className="bg-pastelGreen p-4 rounded-lg shadow-md">
            <h3 className="text-gray-900 font-medium mb-2">Vad vi går igenom:</h3>
            <ul className="space-y-2 text-left">
              <li className="flex items-center gap-2">
                <Banknote className="text-darkLimeGreen w-5 h-5" />
                <span className="text-gray-900"><strong>Inkomst</strong> – Vilka inkomster du har och hur ofta</span>
              </li>
              <li className="flex items-center gap-2">
                <PiggyBank className="text-darkLimeGreen w-5 h-5" />
                <span className="text-gray-900"><strong>Sparande</strong> – Ditt privatsparande och buffert</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="text-darkLimeGreen w-5 h-5" />
                <span className="text-gray-900"><strong>Utgifter</strong> – Dina fasta och rörliga kostnader</span>
              </li>
              <li className="flex items-center gap-2">
                <Flag className="text-darkLimeGreen w-5 h-5" />
                <span className="text-gray-900"><strong>Mål</strong> – Vad du vill uppnå med din ekonomi</span>
              </li>
            </ul>
          </div>

          <p className="text-customBlue1 mt-4">
            <strong>Det tar ca 5-10 minuter.</strong> Du kan när som helst pausa och fortsätta senare—allt sparas automatiskt.
          </p>

          <div className="border-t border-standardMenuColor pt-4">
            <h3 className="text-darkLimeGreen font-medium">Vill du utforska sajten först?</h3>
            <p className="text-customBlue1">
              Inga problem! Du kan hoppa över detta och börja när du känner dig redo.
              Tryck på <XCircle className="inline-block text-red-500 w-5 h-5" /> uppe i hörnet för att spara och avsluta.
            </p>
          </div>

          {/* Data Transparency Section */}
          <div className="mt-6 border-t border-gray-500 pt-4 text-sm text-customBlue1">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-16 h-16 text-darkLimeGreen" />
              <p>
                Vi samlar in dessa uppgifter för att kunna ge dig en bättre upplevelse
                och hjälpa dig att hantera din ekonomi. Vi skyddar din data och delar den aldrig med tredje part.
                Läs mer i vår{" "}
                <Link to="/data-policy" className="text-standardMenuColor underline hover:text-white">
                  dataskyddspolicy
                </Link>.
              </p>
            </div>
          </div>
        </>
      )}
    </GlassPane>
  );
};

export default StepWelcome;
