import React, { useState } from 'react';
import EmailConfirmBird from '../../assets/Images/EmailConfirmBird.png';
import { useNavigate } from 'react-router-dom';
import { resendVerificationEmail } from '../../api/Services/User/resendVerificationEmail';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';
import AlternateSubmitButton from '@components/atoms/buttons/AlternateSubmitButton';
const WelcomePage: React.FC = () => {

    class ValidationError extends Error {
        constructor(message: string) {
            super(message); 
            this.name = 'ValidationError'; 
        }
    }

    const navigate = useNavigate();
    const [resendMessage, setResendMessage] = useState<string>('');
    type ResendMessageType = "" | "success" | "error" | "info";
    const [resendMessageType, setResendMessageType] = useState<ResendMessageType>("");
    const [showInputBox, setShowInputBox] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');

    const handleResendClick = () => {
        setShowInputBox((prevState) => !prevState);
        setResendMessage('');
    };

    const handleLoginNavigation = () => {
        navigate('/login');
    };

    const handleResendVerification = async () => {
        try {
            setResendMessage('Skickar verifieringslänk...');
            setResendMessageType("info");
    
            const { status, message } = await resendVerificationEmail(email);
    
            if (status === 200) {
                setResendMessage('En ny verifieringslänk har skickats. Kontrollera din e-post.');
                setResendMessageType("success");
            } else if (status === 429) {
                setResendMessage('Vänligen vänta några minuter innan du försöker igen.');
                setResendMessageType("error");
            } else {
                setResendMessage(message || 'Det gick inte att skicka verifieringslänken. Försök igen senare.');
                setResendMessageType("error");
            }
        } catch (error) {
            // Handle validation and network errors separately
            if (error instanceof ValidationError || (error as Error).name === 'ValidationError') {
                setResendMessage((error as ValidationError).message); // Display validation error message
            } else if (error instanceof Error) {
                console.error('Error message:', error.message); 
                setResendMessage('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            } else {
                setResendMessage('Ett okänt fel inträffade. Försök igen senare.');
            }
            setResendMessageType('error');
        }
    };

    return (
    <div className="flex flex-col items-center justify-center min-h-screen iphone-se:pt-10 pt-10">
        {/* Bird Image */}
            <img 
                src={EmailConfirmBird} 
                alt="EmailConfirmBird" 
                className="
                w-auto max-w-[320px] z-10
                hidden lg:block /* Visible for large screens */
                absolute right-[3%] top-[50%] transform translate-y-[-50%]
                "
            />            
            <DeepBlueContainer 
            maxWidth="max-w-lg" 
            additionalClasses="
                relative shadow-[0_5px_15px_rgba(133,224,133,0.2)] 
                hover:shadow-[0_10px_140px_rgba(133,224,133,0.4)] 
                hover:scale-105 transition-all duration-300 ease-in-out pt-30 pb-6 z-10
                "
            >
            <div className="text-center p-5 space-y-4">
                <p className="text-center text-xl font-semibold mb-6">Välkommen till <span className="text-limeGreen">eBudget</span></p>
                <div>
                    {/* Welcome Message */}

                        <p>
                            För att slutföra din registrering, vänligen verifiera din e-postadress
                            genom att klicka på länken som vi precis har skickat till din mailadress.
                            Om du inte ser e-posten inom några minuter, vänligen kontrollera din
                            skräppostmapp.
                            <br />
                            <br />
                        </p>


                    {/* Resend Verification Link */}
                    <p className="text-center text-sm mb-4">
                        <span
                            className="inline-block text-blue-500 underline cursor-pointer hover:text-blue-700 hover:scale-105 hover:shadow-md transition-transform duration-200 ease-in-out text-lg"
                            onClick={handleResendClick}
                        >
                            Klicka här för att skicka en ny verifieringslänk!
                        </span>
                        <br />
                        (Om du inte kan se e-posten eller har problem med att hitta den)
                    </p>

                    {/* Email Input Box */}
                    {showInputBox && (
                        <div className="flex flex-col gap-4 mb-6">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ange din e-postadress"
                                className="border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-limeGreen focus:border-transparent transition-all duration-200 ease-in-out"
                                required
                            />
                            <button
                                onClick={handleResendVerification}
                                className="bg-[limeGreen]  text-black py-2 rounded-lg hover:bg-[#32CD32] hover:text-white"
                            >
                                Skicka ny verifieringslänk
                            </button>
                        </div>
                    )}

                    {/* Resend Message */}
                    {resendMessage && (
                        <p
                            className={`text-center mt-4 ${
                                resendMessage === 'Skickar verifieringslänk...'
                                ? 'text-darkLimeGreen'
                                : resendMessageType === 'success'
                                ? 'text-darkLimeGreen'
                                : 'text-red-500'
                            }`}
                        >
                            {resendMessage}
                        </p>
                    )}

                    <p className="text-sm text-center mt-6">
                        Om du har några frågor eller behöver hjälp, tveka inte att kontakta vår
                        support på <span className="text-limeGreen">info@eBudget.se</span>.
                    </p>
                </div>

                <div className="text-center mt-6">
                    <AlternateSubmitButton
                    isSubmitting={false}
                    label="Logga in!"
                    size="large"
                    enhanceOnHover
                    onClick={handleLoginNavigation}
                    />
                </div>
            </div>
        </DeepBlueContainer>
        {/* Bird Image for iPads and Mobile */}
        <img
            src={EmailConfirmBird}
            alt="EmailConfirmBird"
            className="
            w-auto max-w-[150px] z-10
            lg:hidden /* Hide for large screens */
            block /* Visible for smaller screens */
            mt-6 /* Adds margin to push below container */
            "
        />
    </div>
    );
};

export default WelcomePage;
