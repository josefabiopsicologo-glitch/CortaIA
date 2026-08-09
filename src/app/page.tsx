export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        Corta<span className="text-brand">IA</span>
      </h1>
      <p className="max-w-md text-lg text-foreground/70">
        Bem-vindo ao CortaIA. O projeto foi iniciado com Next.js, TypeScript e
        Tailwind CSS.
      </p>
      <a
        href="https://nextjs.org/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-dark"
      >
        Começar
      </a>
    </main>
  );
}
