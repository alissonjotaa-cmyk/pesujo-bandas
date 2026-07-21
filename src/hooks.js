import { useEffect } from "react";

export function useEscFechar(onFechar) {
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFechar();
      }
    }
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onFechar]);
}
