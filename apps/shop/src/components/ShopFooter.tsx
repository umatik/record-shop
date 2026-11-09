import Image from "next/image";
import type { ReactNode } from "react";

export default function ShopFooter({ children }: { children: ReactNode }) {
  return (
    <footer>
      <div className="footer-copy">
        <span>RasBass Record Shop</span>
        {children}
      </div>
      <Image src="/logo.png" width={56} height={56} alt="" />
    </footer>
  );
}
