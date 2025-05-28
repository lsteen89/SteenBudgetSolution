import LogoIcon from '@components/atoms/logo/LogoIcon';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <LogoIcon className="animate-spin w-20 h-20 text-white" />
    <p className="text-white mt-4">Laddar…</p>
  </div>
);

export default LoadingScreen;
