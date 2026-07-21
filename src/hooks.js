import { useEffect } from "react";

export function useEscFechar(onFechar) {
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onFechar]);
}
