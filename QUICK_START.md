# 🚀 QUICK START GUIDE - Mr. Fantasy

## ⚡ Antes de começar

**IMPORTANTE**: Esta aplicação requer um banco MySQL configurado e funcionando.

### 1. Configurar MySQL
```sql
-- 1. Conecte ao MySQL e crie o banco de dados:
CREATE DATABASE mrfantasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Crie um usuário (opcional, mas recomendado):
CREATE USER 'mrfantasy'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON mrfantasy.* TO 'mrfantasy'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copie e configure o arquivo .env
cp .env.example .env

# Edite .env com suas configurações do MySQL:
DATABASE_URL="mysql://mrfantasy:password123@localhost:3306/mrfantasy"
JWT_SECRET="seu-jwt-secret-super-secreto"
```

### 3. Executar Setup Inicial
```bash
# 1. Instalar dependências (se não instalou ainda)
npm install

# 2. Gerar cliente Prisma
npm run db:generate

# 3. Sincronizar schema com banco
npm run db:push

# 4. Popular banco com dados iniciais
npx prisma db seed
```

### 4. Iniciar Aplicação
```bash
npm run dev
```

## 🔑 Credenciais de Acesso

Após executar o seed:
- **URL**: http://localhost:5173
- **Email**: admin@mrfantasy.com  
- **Senha**: admin123

## 📋 Funcionalidades Disponíveis

### ✅ Implementado
- [x] Autenticação e autorização JWT
- [x] Dashboard com estatísticas
- [x] API completa para clientes, produtos, grupos
- [x] Layout responsivo com navegação
- [x] Middleware de segurança
- [x] Sistema de roles (Admin/Manager/Employee)
- [x] Estrutura base da aplicação

### 🔄 Em desenvolvimento
- [ ] Páginas de gestão de clientes (CRUD)
- [ ] Páginas de gestão de produtos (CRUD)  
- [ ] Sistema de pedidos e aluguel
- [ ] Gestão de usuários (Admin)
- [ ] Validação de formulários
- [ ] Testes automatizados

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor dev
npm run build            # Build de produção
npm run preview          # Preview do build

# Banco de dados
npm run db:generate      # Gera cliente Prisma
npm run db:push          # Sincroniza schema
npm run db:migrate       # Executa migrações
npm run db:studio        # Abre Prisma Studio

# Seed e reset
npx prisma db seed       # Popula banco inicial
npx prisma migrate reset # Reset completo do banco
```

## 🔧 Troubleshooting

### Erro de conexão MySQL
```bash
# Verifique se MySQL está rodando:
# Windows: services.msc -> MySQL
# Linux/Mac: sudo systemctl status mysql

# Teste conexão:
mysql -u mrfantasy -p mrfantasy
```

### Erro no Prisma
```bash
# Regenerar cliente:
npx prisma generate

# Reset completo:
npx prisma migrate reset
npx prisma db seed
```

### Problemas de dependências
```bash
# Limpar e reinstalar:
rm -rf node_modules package-lock.json
npm install
```

## 📁 Estrutura do Projeto

```
src/
├── app.html                 # Template base
├── app.css                  # Estilos globais
├── hooks.server.ts          # Middleware autenticação
├── lib/
│   ├── server/
│   │   ├── auth.ts          # Serviços auth
│   │   └── database.ts      # Cliente Prisma
│   └── stores/              # Svelte stores
│       ├── auth.ts          # Estado autenticação
│       ├── customers.ts     # Estado clientes
│       └── ui.ts            # Estado UI/notificações
└── routes/
    ├── +layout.svelte       # Layout principal
    ├── api/                 # Endpoints API
    ├── auth/login/          # Página login
    └── dashboard/           # Dashboard
```

## 🔄 Próximos Passos

1. **Acesse a aplicação** - http://localhost:5173
2. **Faça login** com as credenciais admin
3. **Explore o dashboard** para ver estatísticas básicas
4. **Aguarde implementação** das páginas de gestão

---

💡 **Dica**: Mantenha o Prisma Studio aberto (`npm run db:studio`) para monitorar o banco de dados durante o desenvolvimento.