"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/types";
import { getAssetThumbnail } from "@/lib/thumbnails";

/**
 * Retorna a URL da thumbnail de um asset (gerada sob demanda e cacheada).
 * null enquanto carrega ou para tipos sem thumbnail (áudio).
 */
export function useAssetThumbnail(asset: Asset | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!asset) {
      setUrl(null);
      return;
    }
    getAssetThumbnail(asset).then((result) => {
      if (active) setUrl(result);
    });
    return () => {
      active = false;
    };
  }, [asset]);

  return url;
}
