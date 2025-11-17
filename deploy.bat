@echo off
setlocal enabledelayedexpansion

echo =================================================
echo      🚀 Iniciando processo de Deploy do Svelte
echo =================================================

REM 1) Criar pasta temporária
echo → Criando pasta temporaria: deploy_temp
rmdir /s /q deploy_temp 2>nul
mkdir deploy_temp

REM 2) Copiar prisma e package.json
echo → Copiando arquivos essenciais para deploy_temp
xcopy prisma deploy_temp\prisma /E /I /Y >nul
copy package.json deploy_temp\ /Y >nul
if exist package-lock.json copy package-lock.json deploy_temp\ /Y >nul
if exist .env copy .env deploy_temp\ /Y >nul

REM 3) Instalar dependencias
echo → Instalando dependencias (npm install)
cd deploy_temp
npm install

REM 4) Rodar migracoes
echo → Aplicando migracoes (prisma migrate deploy)
npx prisma migrate deploy

REM 5) Gerar Prisma Client
echo → Gerando Prisma Client (prisma generate)
npx prisma generate

REM 6) Rodar seed
echo → Executando seed (prisma db seed)
npx prisma db seed

REM 7) Voltar ao projeto raiz e gerar build final
cd ..
echo → Gerando build final (npm run build)
npm run build

REM 8) Criar pasta final de entrega
echo → Criando pasta release_build
rmdir /s /q release_build 2>nul
mkdir release_build

REM 9) Copiar build gerado
echo → Copiando build/ para release_build/
xcopy build release_build\build /E /I /Y >nul

REM 10) Copiar node_modules do deploy_temp (com Prisma Client)
echo → Copiando node_modules corretos
xcopy deploy_temp\node_modules release_build\node_modules /E /I /Y >nul

REM 11) Copiar .env
echo → Copiando .env
copy .env release_build\ /Y >nul

REM 12) Criar package.json de produção
echo → Criando package.json de producao
(
echo {
echo   "name": "mrfantasy",
echo   "version": "1.0.0",
echo   "main": "build/index.js",
echo   "scripts": {
echo     "start": "node build/index.js"
echo   },
echo   "type": "module",
echo   "dependencies": {
echo     "@prisma/client": "^5.22.0",
echo     "bcrypt": "^6.0.0",
echo     "bcryptjs": "^2.4.3",
echo     "jsonwebtoken": "^9.0.2",
echo     "zod": "^3.22.4"
echo   }
echo }
) > release_build\package.json

REM 13) Limpar pasta temporária
echo → Removendo pasta temporaria
rmdir /s /q deploy_temp

echo =================================================
echo      ✔ Deploy finalizado com sucesso!
echo      Pasta gerada:  release_build
echo =================================================
pause