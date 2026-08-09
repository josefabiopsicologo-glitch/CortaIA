# CortaIA

Aplicação web construída com **Next.js** (App Router), **TypeScript** e **Tailwind CSS**.

## Requisitos

- Node.js 18.18+ (recomendado: 20 ou 22)
- npm 10+

## Como começar

Instale as dependências:

```bash
npm install
```

Rode o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Scripts disponíveis

| Comando             | Descrição                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Inicia o servidor de desenvolvimento             |
| `npm run build`     | Gera o build de produção                         |
| `npm run start`     | Sobe o build de produção                         |
| `npm run lint`      | Roda o ESLint                                     |
| `npm run typecheck` | Verifica os tipos com o TypeScript (sem emitir)  |

## Estrutura do projeto

```
CortaIA/
├── src/
│   └── app/
│       ├── globals.css   # Estilos globais + diretivas do Tailwind
│       ├── layout.tsx    # Layout raiz
│       └── page.tsx      # Página inicial
├── next.config.mjs       # Configuração do Next.js
├── tailwind.config.ts    # Configuração do Tailwind CSS
├── tsconfig.json         # Configuração do TypeScript
└── package.json
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha os valores conforme necessário.

```bash
cp .env.example .env.local
```
