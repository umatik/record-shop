import Image from "next/image";

type LogoProps = {
  size?: number;
  /** Na ciemnym tle (nagłówek z moro) logo jest białe. */
  onDark?: boolean;
};

const Logo = ({ size = 40, onDark = false }: LogoProps) => (
  <Image
    src="/logo.png"
    alt="RasBass"
    width={size}
    height={size}
    className={onDark ? "logo-on-dark" : "logo"}
    priority
  />
);

export default Logo;
