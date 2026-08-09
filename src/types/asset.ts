/**
 * Asset — a mídia original importada pelo usuário.
 *
 * Um Asset é imutável do ponto de vista da edição: nunca modificamos o
 * arquivo original. A utilização de um Asset na timeline é representada por
 * um Clip (ver clip.ts). Vários Clips podem referenciar o mesmo Asset.
 */

export type AssetType = "video" | "audio" | "image";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  /**
   * URL utilizável pelo player/preview. No MVP local costuma ser um
   * Object URL (URL.createObjectURL). Deve ser revogado ao remover o asset.
   */
  source: string;
  /** Duração em segundos. 0 para imagens. */
  duration: number;
  /** Dimensões em pixels (undefined para áudio). */
  width?: number;
  height?: number;
  mimeType: string;
  /** Tamanho do arquivo em bytes. */
  fileSize: number;
}
