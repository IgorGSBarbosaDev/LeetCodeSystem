# LeetCodeSystem

## Contexto

- Leia `docs/PRD-LeetCodeSystem.md` antes de implementar qualquer funcionalidade.
- O produto é uma aplicação local, sem autenticação, multiusuário ou infraestrutura em nuvem.
- O MVP deve priorizar o fluxo importar exercícios -> visualizar -> editar Java -> Run/Submit -> registrar progresso.
- Preserve o escopo do PRD; não introduza suporte a outras linguagens, Docker, cloud ou recursos de usuário sem solicitação explícita.

## Estrutura

- `backend/`: Spring Boot, Java 21 no contrato do projeto, Spring Web, Spring Data JPA, validação, SQLite e Java Runner.
- `frontend/`: React + TypeScript + Vite + Monaco + Tailwind; consome a API local por meio do proxy do Vite.
- `docs/`: documentação de produto e contratos funcionais.

## Desenvolvimento

- Backend: execute `./mvnw test` a partir de `backend/` (`.\mvnw.cmd test` no Windows).
- Backend: execute `./mvnw spring-boot:run` a partir de `backend/` para iniciar a API quando a configuração estiver pronta.
- Antes de declarar o sistema pronto, valide o fluxo real com SQLite e o Java Runner, incluindo timeout e limpeza de temporários.
- Não assuma que testes estáticos comprovam compilação/execução de soluções do usuário ou comportamento no navegador.

## Estado atual do checkout

- A raiz possui um repositório Git configurado; preserve alterações locais e não publique sem solicitação explícita.
- O backend implementa importação validada de pacotes, catálogo, progresso, histórico, dashboard e execução Java.
- O frontend implementa o dashboard, catálogo, importação, editor Java, resultados do judge e histórico.
- `backend/leetcodesystem.db` é a base SQLite local e está excluída pelo `.gitignore`; trate-a como dado do usuário.

## Diretrizes de alteração

- Faça mudanças pequenas e alinhadas ao PRD; preserve trabalho local existente.
- Para o executor Java, use diretórios temporários isolados, timeout obrigatório, encerramento forçado e limpeza garantida.
- Valide o schema de importação antes de persistir qualquer pacote.
- Mantenha resultados do judge explícitos (`ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`).
- Ao concluir uma tarefa, informe claramente o que foi verificado e quais limitações de ambiente permanecem.
