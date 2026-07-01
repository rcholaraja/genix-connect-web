interface AppLogoProps {
  size?: number;
  className?: string;
}

export default function AppLogo({ size = 32, className = '' }: AppLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Genix Connect"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
      className={className}
    />
  );
}
