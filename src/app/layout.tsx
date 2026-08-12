import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CortaIA — Edit Pro',
  description: 'Editor de vídeo com IA: timeline, cortes automáticos, legendas por IA e exportação em MP4.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
