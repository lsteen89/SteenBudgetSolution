// EmailConfirmationPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';
import AlternateSubmitButton from '@components/atoms/buttons/AlternateSubmitButton';
import SuccessEmailBird from '@assets/Images/SuccessEmailBird.png';
import FailEmailBird from '@assets/Images/FailEmailBird.png';
import useDisableScroll from '@hooks/useDisableScroll';
import { verifyEmail as defaultVerifyEmail } from '@api/Services/User/verifyEmail';

interface EmailConfirmationPageProps {
  verifyEmail?: (token: string) => Promise<void>;
  debugToken?: string;
  /** default: true — set false in Storybook so we don’t navigate to a non-existent route */
  navigateOnMissingToken?: boolean;
}

const EmailConfirmationPage: React.FC<EmailConfirmationPageProps> = ({
  verifyEmail,
  debugToken,
  navigateOnMissingToken = true,
}) => {
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'idle'>('idle');

  const navigate = useNavigate();
  const isDev = process.env.NODE_ENV === 'development';

  const searchParams = new URLSearchParams(window.location.search);
  const token = useMemo(
    () => searchParams.get('token') ?? (isDev ? debugToken ?? null : null),
    [searchParams, isDev, debugToken]
  );

  const verifyFn = verifyEmail ?? defaultVerifyEmail;

  useDisableScroll(true);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        if (navigateOnMissingToken) {
          navigate('/404');
        } else {
          setWelcomeMessage('Token saknas');
          setStatusMessage('Verifieringslänken saknar token i URL:en.');
          setVerificationStatus('error');
        }
        return;
      }

      try {
        await verifyFn(token);
        setWelcomeMessage('Välkommen till ');
        setStatusMessage('Tack för att du verifierade din e-postadress. Du kan nu logga in och börja använda tjänsten.');
        setVerificationStatus('success');
      } catch (err: any) {
        const msg = err?.message ?? 'Verification failed.';
        if (msg.toLowerCase().includes('already verified')) {
          setWelcomeMessage('E-postadress redan verifierad!');
          setStatusMessage('Den här e-postadressen är redan verifierad. Du kan logga in med ditt konto.');
        } else {
          setWelcomeMessage('Det gick inte att verifiera!');
          setStatusMessage(msg);
        }
        setVerificationStatus('error');
      }
    };
    run();
  }, [token, verifyFn, navigate, navigateOnMissingToken]);

  const isError = verificationStatus === 'error';

  const handleLoginNavigation = () => navigate('/login');

  return (
    <div className="flex flex-col items-center min-h-screen justify-center iphone-se:pt-10">
      {/* Bird Image (lg+) */}
      <img
        src={isError ? FailEmailBird : SuccessEmailBird}
        alt={isError ? 'ErrorEmailBird' : 'SuccessEmailBird'}
        className="absolute right-[3%] top-[25%] transform translate-y-[10%] w-auto max-w-[320px] z-10 hidden lg:block
        2xl:right-[5%] 2xl:max-w-[400px]
        3xl:right-[1000px] 3xl:max-w-[400px]"
      />

      <DeepBlueContainer
        additionalClasses="
          relative shadow-[0_5px_15px_rgba(133,224,133,0.2)]
          hover:shadow-[0_10px_140px_rgba(133,224,133,0.4)]
          hover:scale-105 transition-all duration-300 ease-in-out pt-30 pb-6
          max-w-lg pl-5 pr-5 py-10 z-10
        "
      >
        <p className={`text-xl font-semibold text-center mb-4 ${isError ? 'text-red-500' : 'text-white'}`}>
          {welcomeMessage}
          {!isError && <span className="text-limeGreen">eBudget</span>}
        </p>

        <p className="text-center text-white">{statusMessage}</p>

        {verificationStatus === 'success' && (
          <div className="text-center mt-6">
            <AlternateSubmitButton
              isSubmitting={false}
              label="Logga in!"
              size="large"
              enhanceOnHover
              onClick={handleLoginNavigation}
            />
          </div>
        )}
      </DeepBlueContainer>

      {/* Bird Image (sm–md) */}
      <img
        src={isError ? FailEmailBird : SuccessEmailBird}
        alt={isError ? 'ErrorEmailBird' : 'SuccessEmailBird'}
        className="w-auto max-w-[150px] z-10 md:max-w-[320px] lg:hidden block"
      />
    </div>
  );
};

export default EmailConfirmationPage;
