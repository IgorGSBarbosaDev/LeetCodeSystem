# PRD — LeetCodeSystem

## 1. Visão do produto

O **LeetCodeSystem** é uma aplicação web local para prática de algoritmos e estruturas de dados, inspirada na experiência de resolução do LeetCode, mas voltada exclusivamente para uso pessoal.

O sistema será executado em `localhost`, sem login, autenticação, multiusuário ou infraestrutura em nuvem.

O objetivo principal é permitir:

- organizar exercícios por dificuldade e categoria;
- resolver exercícios diretamente em um editor de código no navegador;
- compilar e executar soluções Java;
- validar soluções automaticamente com casos de teste;
- acompanhar progresso e histórico;
- importar novos pacotes de exercícios em JSON;
- permitir que o ChatGPT gere novos exercícios compatíveis com o sistema.

---

## 2. Objetivo principal

O fluxo principal do sistema deve ser:

1. O usuário inicia o projeto localmente.
2. Acessa o dashboard.
3. Visualiza exercícios disponíveis e seu progresso.
4. Seleciona um exercício.
5. Lê o enunciado, exemplos e restrições.
6. Implementa a solução em Java no editor.
7. Executa testes com `Run`.
8. Envia a solução com `Submit`.
9. O sistema executa os casos de teste.
10. Retorna o resultado:
   - Accepted
   - Wrong Answer
   - Compilation Error
   - Runtime Error
   - Time Limit Exceeded
11. O progresso e o histórico são atualizados.

---

## 3. Stack

### Frontend

- React
- TypeScript
- Vite
- Monaco Editor
- Tailwind CSS

### Backend

- Java 21
- Spring Boot
- Spring Web
- Spring Data JPA

### Banco de dados

- SQLite

Motivo: aplicação local, simples de distribuir e sem necessidade de servidor de banco externo.

### Execução de código

- `javac`
- `java`
- `ProcessBuilder`
- timeout obrigatório para processos

Inicialmente o sistema suportará apenas **Java**.

---

## 4. Arquitetura

```text
React + TypeScript
        |
        v
Spring Boot API
        |
        +------ SQLite
        |
        +------ Java Runner
                  |
                  +-- gera arquivos temporários
                  +-- compila com javac
                  +-- executa com java
                  +-- executa test cases
                  +-- aplica timeout
                  +-- retorna resultado
```

---

## 5. Funcionalidades

## 5.1 Dashboard

Exibir:

- total de exercícios;
- exercícios resolvidos;
- exercícios pendentes;
- percentual concluído;
- quantidade por dificuldade:
  - Easy
  - Medium
  - Hard
- progresso por categoria;
- exercícios marcados para revisão;
- exercícios favoritos.

Exemplo:

```text
120 Problems
45 Solved
75 Remaining

Easy     25 / 40
Medium   18 / 55
Hard      2 / 25
```

---

## 5.2 Lista de exercícios

Permitir visualizar todos os exercícios com:

- título;
- dificuldade;
- categorias;
- status;
- favorito;
- necessidade de revisão.

Filtros:

- dificuldade;
- categoria;
- resolvidos;
- não resolvidos;
- revisão;
- favoritos.

Busca por título.

---

## 5.3 Página de resolução

A tela deve conter:

### Área do problema

- título;
- dificuldade;
- categorias;
- descrição;
- exemplos;
- restrições;
- assinatura do método.

### Editor

Usar Monaco Editor.

Inicialmente:

- linguagem fixa em Java;
- código inicial fornecido pelo exercício;
- botão `Run`;
- botão `Submit`.

### Resultado

Exibir:

- resultado de cada teste;
- output recebido;
- output esperado;
- tempo de execução;
- erro de compilação;
- erro de execução;
- timeout.

---

## 5.4 Run

`Run` executa apenas os casos de teste públicos.

Objetivo:

- validar rapidamente a implementação;
- permitir visualizar input, output esperado e output recebido.

---

## 5.5 Submit

`Submit` executa todos os casos de teste:

- públicos;
- ocultos.

Resultado possível:

- `ACCEPTED`
- `WRONG_ANSWER`
- `COMPILATION_ERROR`
- `RUNTIME_ERROR`
- `TIME_LIMIT_EXCEEDED`

Quando aceito:

- marcar exercício como resolvido;
- salvar data;
- salvar código;
- salvar quantidade de tentativas.

---

## 5.6 Test Cases

Cada exercício deve possuir:

- exemplos públicos;
- casos de teste públicos;
- casos de teste ocultos.

Os testes ocultos não devem revelar automaticamente seus inputs ao usuário.

O sistema deve informar:

```text
Passed 13 / 15 tests
```

---

## 5.7 Histórico de submissões

Registrar:

- exercício;
- código enviado;
- resultado;
- data;
- tempo de execução;
- quantidade de testes aprovados.

Permitir consultar soluções anteriores.

---

## 5.8 Progresso

Para cada exercício armazenar:

- status;
- número de tentativas;
- data da primeira resolução;
- data da última tentativa;
- favorito;
- necessidade de revisão.

Status principais:

- NOT_STARTED
- ATTEMPTED
- SOLVED
- REVIEW

---

## 5.9 Revisão

Permitir marcar exercícios como:

- favorito;
- precisa revisar.

Versão futura poderá implementar revisão espaçada:

```text
3 dias
7 dias
15 dias
30 dias
```

---

## 6. Categorias iniciais

O sistema deve suportar categorias semelhantes às utilizadas em entrevistas técnicas:

- Array
- String
- Hash Table
- Two Pointers
- Sliding Window
- Stack
- Queue
- Linked List
- Binary Search
- Tree
- Binary Tree
- Binary Search Tree
- Heap
- Graph
- Backtracking
- Greedy
- Dynamic Programming
- Recursion
- Sorting
- Matrix
- Bit Manipulation

Um exercício pode possuir múltiplas categorias.

---

## 7. Importação de exercícios

O sistema deve possuir uma tela:

```text
Import Problems
```

O usuário seleciona um arquivo `.json`.

Fluxo:

```text
JSON
 |
 v
Validação
 |
 v
Conversão
 |
 v
Persistência no SQLite
 |
 v
Exercícios disponíveis
```

O sistema deve validar o schema antes da importação.

---

## 8. Formato padrão dos arquivos

Todo pacote deve possuir:

```json
{
  "schemaVersion": "1.0",
  "problems": []
}
```

Cada problema deve conter no mínimo:

```json
{
  "id": "two-sum-001",
  "title": "Two Sum",
  "difficulty": "EASY",
  "categories": ["ARRAY", "HASH_TABLE"],
  "description": "...",
  "constraints": [],
  "examples": [],
  "method": {
    "name": "twoSum",
    "returnType": "int[]",
    "parameters": []
  },
  "starterCode": {
    "java": "..."
  },
  "testCases": [],
  "solution": {
    "java": "...",
    "explanation": "...",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(n)"
  }
}
```

---

## 9. Geração de exercícios com ChatGPT

O schema JSON será o contrato entre o ChatGPT e o LeetCodeSystem.

O usuário poderá solicitar, por exemplo:

```text
Gere 10 exercícios para o LeetCodeSystem:

3 Easy
5 Medium
2 Hard

Categorias:
Array
Hash Table
Two Pointers
```

O ChatGPT deverá gerar um arquivo JSON compatível com a versão atual do schema.

O arquivo poderá ser importado diretamente pelo sistema.

Os problemas gerados devem preferencialmente ser originais e não cópias literais de exercícios existentes.

---

## 10. Java Runner

O backend deve executar o código do usuário fora do processo principal da aplicação.

Fluxo:

```text
Código do usuário
      |
      v
Solution.java
      |
      v
TestRunner.java
      |
      v
javac
      |
      v
java
      |
      v
resultado
```

O sistema gera automaticamente o `TestRunner` a partir:

- da assinatura do método;
- dos parâmetros;
- dos casos de teste.

---

## 11. Segurança mínima do executor

Mesmo sendo uma aplicação local, todo processo executado deve possuir:

- timeout;
- encerramento forçado em caso de timeout;
- diretório temporário separado;
- limpeza dos arquivos temporários.

Exemplo:

```text
Tempo máximo inicial: 3 segundos
```

Não utilizar Docker no MVP.

Sandbox avançado poderá ser considerado futuramente.

---

## 12. Tipos suportados inicialmente

O executor deve priorizar suporte a:

- int
- long
- double
- boolean
- String
- int[]
- long[]
- String[]
- List<Integer>
- List<String>

Tipos mais complexos poderão ser adicionados depois.

---

## 13. Modelo de dados principal

### Problem

- id
- title
- description
- difficulty
- starterCode
- solution
- solutionExplanation
- timeComplexity
- spaceComplexity
- createdAt

### Category

- id
- name

### ProblemCategory

- problemId
- categoryId

### TestCase

- id
- problemId
- input
- expectedOutput
- hidden

### Submission

- id
- problemId
- code
- status
- testsPassed
- totalTests
- executionTime
- submittedAt

### ProblemProgress

- problemId
- status
- attempts
- favorite
- reviewRequired
- firstSolvedAt
- lastAttemptAt

---

## 14. Fora do escopo

Não implementar inicialmente:

- login;
- cadastro;
- usuários;
- permissões;
- ranking;
- multiplayer;
- cloud;
- pagamentos;
- colaboração;
- suporte a múltiplas linguagens;
- Docker sandbox;
- microserviços;
- Redis;
- filas;
- infraestrutura distribuída.

---

## 15. Roadmap

### Fase 1 — Base do sistema

- React + Vite;
- Spring Boot;
- SQLite;
- dashboard;
- lista de exercícios;
- página do problema;
- Monaco Editor.

### Fase 2 — Conteúdo

- modelo de exercícios;
- categorias;
- test cases;
- importação JSON;
- validação de schema.

### Fase 3 — Judge

- Java Runner;
- geração de TestRunner;
- compilação;
- execução;
- timeout;
- Run;
- Submit;
- resultados.

### Fase 4 — Progresso

- histórico;
- estatísticas;
- filtros;
- favoritos;
- revisão;
- dashboard completo.

### Fase 5 — Expansão

- packs gerados pelo ChatGPT;
- mais tipos de parâmetros;
- revisão espaçada;
- análise de complexidade;
- melhorias na experiência de estudo.

---

## 16. Critério de MVP concluído

O MVP estará funcional quando for possível:

1. gerar um arquivo JSON com exercícios;
2. importar o arquivo no sistema;
3. visualizar os exercícios;
4. abrir um exercício;
5. escrever uma solução Java;
6. clicar em `Run`;
7. executar testes públicos;
8. clicar em `Submit`;
9. executar todos os testes;
10. receber `Accepted` ou erro;
11. registrar a resolução e atualizar o dashboard.

Esse fluxo representa o núcleo do LeetCodeSystem.
