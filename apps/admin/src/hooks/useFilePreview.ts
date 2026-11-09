import { useEffect, useState } from "react";

/**
 * Podgląd pliku jako data URL. Nie trzeba go zwalniać (w przeciwieństwie do `createObjectURL`),
 * więc podwójne uruchomienie efektu w trybie deweloperskim niczego nie psuje.
 */
export function useFilePreview(file: File | undefined) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!file) return;
    let active = true;
    const reader = new FileReader();
    reader.onload = () => active && setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => {
      active = false;
    };
  }, [file]);

  return url;
}
