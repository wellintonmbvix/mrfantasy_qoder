# Script de Deploy - Svelte + Prisma

Este repositório inclui um script de deploy automatizado (`deploy.bat`) que prepara uma versão final da aplicação Svelte com Prisma para ser distribuída a clientes, sem expor o código-fonte completo.

O objetivo do script é gerar a **pasta de release final** (`release_build/`) contendo:

- Build compilado da aplicação (`build/`)
- Dependências corretas em `node_modules/` (incluindo o Prisma Client)
- Arquivo `.env` com variáveis de ambiente
- `package.json` mínimo para execução (`npm start`)

---

## O que o `deploy.bat` faz

O script executa automaticamente os seguintes passos:

1. **Cria uma pasta temporária** (`deploy_temp`) para gerar dependências e o Prisma Client.
2. **Copia arquivos essenciais** para a pasta temporária:
   - `prisma/` (contendo schema e seeds)
   - `package.json` e `package-lock.json`
   - `.env`
3. **Instala todas as dependências** (`npm install`) dentro da pasta temporária.
4. **Aplica migrações** no banco de dados com `npx prisma migrate deploy`.
5. **Gera o Prisma Client** com `npx prisma generate`.
6. **Executa o seed** inicial do banco (`npx prisma db seed`).
7. **Gera o build final da aplicação** (`npm run build`).
8. **Cria a pasta final de entrega** (`release_build/`) limpa.
9. **Copia o build** para a pasta de release.
10. **Copia o `node_modules` correto** (com Prisma Client) para a pasta de release.
11. **Copia o arquivo `.env`** para a pasta de release.
12. **Gera um `package.json` simplificado** de produção dentro da pasta de release.
13. **Remove a pasta temporária** usada durante o deploy.

Ao final, a pasta `release_build/` estará pronta para ser usada pelo cliente sem necessidade de compilar ou rodar comandos adicionais de Prisma.

---

## Como usar o `deploy.bat`

1. Coloque o arquivo `deploy.bat` na raiz do seu projeto.
2. Certifique-se de que você tem:
   - Node.js instalado
   - npm disponível
   - Arquivo `.env` configurado corretamente
   - Pasta `prisma/` com `schema.prisma` e seeds
3. Execute o script: deploy.bat
4. Aguarde o processo completar. Ao final, você verá a mensagem: 
✔ Deploy finalizado com sucesso!
Pasta gerada: release_build
5. Para rodar a aplicação no cliente:
cd release_build
npm start
