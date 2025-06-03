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

/* —— yup schema —— */
const schema = object({
  email: string().email('Ogiltig e-post').required('E-post krävs'),
  password: string().min(6, 'Minst 6 tecken').required('Lösenord krävs'),
  captchaToken: string().required('Captcha krävs'),
});

type ReCAPTCHAWithReset = ReCAPTCHA & { reset: () => void };

export default function LoginPage() {
  const [form, setForm] = useState<UserLoginDto>({ email: '', password: '', captchaToken: '' });
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

  const setField = (k: keyof UserLoginDto, v: string) =>
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
    // Pass the rememberMe state to the login function
    const res = await login(form, rememberMe);
    setSub(false);

    if (res.success) return nav('/dashboard', { replace: true });
    setErr({ form: res.message });
    capRef.current?.reset();
  };

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

          {err.form && <p className='mt-2 text-sm text-red-500'>{err.form}</p>}

          <div className='mt-6 flex flex-col sm:flex-row sm:items-center sm:space-x-4'>
            <SubmitButton type='submit' label='Logga in' isSubmitting={sub} enhanceOnHover style={{ width: '100%' }} />
            <ReCAPTCHA sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                       onChange={tok => setField('captchaToken', tok || '')}
                       ref={capRef} />
          </div>
        </FormContainer>

        <img src={LoginBird} loading='lazy' alt=''
             className='z-0 mt-10 mx-auto max-w-[180px] lg:absolute lg:right-10 lg:top-3/4 lg:-translate-y-1/2 xl:max-w-[350px]' />
      </ContentWrapper>
    </PageContainer>
  );
}