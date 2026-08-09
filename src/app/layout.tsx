import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortaIA — Editor de vídeo",
  description:
    "Editor inteligente de vídeos para Reels, TikTok e YouTube Shorts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
