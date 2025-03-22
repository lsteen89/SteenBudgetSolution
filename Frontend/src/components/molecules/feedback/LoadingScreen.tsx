import LogoIcon from '@components/atoms/logo/LogoIcon';

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center">
      <LogoIcon className="animate-spin w-20 h-20" />
      <p className="text-white mt-4">Laddar...</p>
    </div>
);

export default LoadingScreen;
