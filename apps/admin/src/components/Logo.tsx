import Image from "next/image";

export function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/logo.png" alt="RasBass" width={size} height={size} className="logo" priority />;
}
