import Image from "next/image";

type LogoProps = {
  size?: number;
};

const Logo = ({ size = 40 }: LogoProps) => (
  <Image src="/logo.png" alt="RasBass" width={size} height={size} className="logo" priority />
);

export default Logo;
