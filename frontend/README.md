# LeetCodeSystem — frontend

Frontend React + TypeScript + Vite alinhado ao PRD do projeto.

```powershell
pnpm install
pnpm dev
```

O frontend usa dados de demonstração isolados em `src/data/demoProblems.ts` enquanto o backend ainda não expõe os endpoints de problemas, importação e Java Runner. O pacote JSON é validado no navegador conforme o schema `1.0`, mas a persistência no SQLite e os resultados de `Run`/`Submit` dependem da implementação da API.

Comandos de verificação:

```powershell
pnpm typecheck
pnpm build
```
