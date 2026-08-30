# LeetCodeSystem — frontend

Frontend React + TypeScript + Vite alinhado ao PRD do projeto.

```powershell
pnpm install
pnpm dev
```

O frontend carrega os exercícios persistidos por `GET /api/problems`. A importação envia o `File` original para `POST /api/problem-packages/validate`, exibe o resumo e só depois reenvia o mesmo arquivo para `POST /api/problem-packages/import`. O proxy de desenvolvimento aponta para `http://localhost:8080` por padrão; use `VITE_API_PROXY_TARGET` quando a API estiver em outra porta.

O backend deve estar iniciado em paralelo para listar, validar e importar pacotes. Os dados de demonstração em `src/data/demoProblems.ts` permanecem apenas como referência e não participam do fluxo ativo. Os resultados de `Run`/`Submit` dependem da futura implementação do Java Runner.

Comandos de verificação:

```powershell
pnpm typecheck
pnpm build
```
