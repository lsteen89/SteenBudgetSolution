import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { object, string } from 'yup';

import { useAuth } from '@/hooks/auth/useAuth';
import type { UserLoginDto } from '@myTypes/User/Auth/userLoginForm';

import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';
import CenteredContainer from '@components/atoms/container/CenteredContainer';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import FormContainer from '@components/molecules/containers/FormContainer';
import InputField from '@components/atoms/InputField/ContactFormInputField';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import Checkbox from '@components/atoms/boxes/Checkbox';
import LoginBird from '@assets/Images/LoginBird.png';
import { translateBackendError } from '@/translations/errorMessages';

/* —— yup schema —— */
const schema = object({
  email: string().email('Ogiltig e-post').required('E-post krävs'),
  password: string().min(6, 'Minst 6 tecken').required('Lösenord krävs'),
  captchaToken: string().required('Captcha krävs'),
});

type ReCAPTCHAWithReset = ReCAPTCHA & { reset: () => void };

export default function LoginPage() {
  const [form, setForm] = useState<UserLoginDto>({ email: '', password: '', captchaToken: null });
  const [err, setErr] = useState<Record<string, string>>({});
  const [sub, setSub] = useState(false);
  // State to track whether the user wants to be remembered on this device.
  // Default value is `false` to ensure users explicitly opt in.
  const [rememberMe, setRememberMe] = useState(false);
  const capRef = useRef<ReCAPTCHAWithReset>(null);

  const nav = useNavigate();
  const { login, isLoading, accessToken } = useAuth();

  if (isLoading) return <CenteredContainer><LoadingScreen /></CenteredContainer>;
  if (accessToken) return <Navigate to="/dashboard" replace />;

  const setField = (k: keyof UserLoginDto, v: string | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = async () => {
    try { await schema.validate(form, { abortEarly: false }); setErr({}); return true; }
    catch (e: any) {
      const map: Record<string, string> = {};
      e.inner?.forEach((m: any) => { map[m.path] = m.message; });
      setErr(map); return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await validate())) return;

    setSub(true);
    try { // <-- BEST PRACTICE: Wrap API calls in try/catch

      const res = await login(form, rememberMe); // Pass rememberMe here

      if (res.success) {
        nav('/dashboard', { replace: true });
      } else {
        // This handles defined business logic errors (e.g., wrong password)
        const swedishErrorMessage = translateBackendError(res.message);
        setErr({ form: swedishErrorMessage });
        capRef.current?.reset();
      }

    } catch (error: any) {
      console.error("Login API call failed:", error);

      const swedishErrorMessage = translateBackendError("Server.Error");
      setErr({ form: swedishErrorMessage });
      capRef.current?.reset();

    } finally {
      setSub(false);
    }
  };
  console.log('SITE KEY LOADED BY VITE:', import.meta.env.VITE_RECAPTCHA_SITE_KEY);
  return (
    <PageContainer centerChildren>
      <ContentWrapper className='2xl:pt-[5%]' centerContent>
        <FormContainer tag="form" onSubmit={onSubmit} bgColor='gradient'
          className='z-10 w-full max-h-screen overflow-y-auto'>

          <p className='text-lg font-bold text-gray-800 mb-6 text-center'>
            Välkommen tillbaka! Logga in för att fortsätta
          </p>

          <label className='block mb-2 text-sm'>E-postadress</label>
          <InputField value={form.email} placeholder='Ange e-post'
            onChange={e => setField('email', e.target.value)} width='100%' />
          {err.email && <p className='text-sm text-red-500'>{err.email}</p>}

          <label className='block mt-4 mb-2 text-sm'>Lösenord</label>
          <InputField type='password' value={form.password} placeholder='Ange lösenord'
            onChange={e => setField('password', e.target.value)} width='100%' />
          {err.password && <p className='text-sm text-red-500'>{err.password}</p>}

          {/* Remember Me Checkbox */}
          <div className="mt-4 mb-4 flex items-center">
            <Checkbox
              id="remember-me"
              label="Kom ihåg mig"
              description="Håll mig inloggad på den här enheten i upp till 30 dagar."
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
          </div>

          {/* 1. Move ReCAPTCHA to its own line before the button */}
          <div className="mt-6 flex justify-center">
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={tok => setField('captchaToken', tok)} // 'tok' can be null, your handler should allow it
              onExpired={() => setField('captchaToken', null)}
              ref={capRef}
            />
          </div>

          {/* 2. Disable the button until the form is valid and captcha is complete */}
          <div className='mt-6'>
            <SubmitButton
              type='submit'
              label='Logga in'
              isSubmitting={sub}
              disabled={!form.captchaToken || sub} // <-- LOGIC FIX
              enhanceOnHover
              style={{ width: '100%' }}
            />
          </div>
        </FormContainer>

        <img src={LoginBird} loading='lazy' alt=''
          className='z-0 mt-10 mx-auto max-w-[180px] lg:absolute lg:right-10 lg:top-3/4 lg:-translate-y-1/2 xl:max-w-[350px]' />
      </ContentWrapper>
    </PageContainer>
  );
}