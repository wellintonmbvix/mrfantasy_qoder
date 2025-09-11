# Mr. Fantasy - Sistema de Aluguel de Fantasias

Sistema completo para gerenciamento de aluguel de fantasias e venda de acessórios, desenvolvido em SvelteKit com TypeScript e MySQL.

## Funcionalidades

### 🏠 Dashboard
- Visão geral dos dados do sistema
- Estatísticas de clientes, produtos e pedidos
- Receita mensal e alertas de estoque baixo

### 👥 Gestão de Clientes
- Cadastro completo de clientes
- Busca e filtros avançados
- Validação de CPF e formatação automática
- Histórico de pedidos por cliente

### 📦 Gestão de Produtos
- Cadastro de produtos com grupos/categorias
- Controle de estoque automático
- Preços diferenciados para aluguel e venda
- Geração automática de SKU
- Variações de tamanho e cor

### 📋 Gestão de Pedidos
- Pedidos de aluguel com controle de datas
- Pedidos de venda
- Cálculo automático de totais
- Controle de status (Pendente, Confirmado, Entregue, Devolvido, Cancelado)
- Alertas de atraso em devoluções

### 👨‍💼 Gestão de Usuários (Admin)
- Controle de acesso por papel (Admin, Gerente, Funcionário)
- Criação e edição de usuários
- Controle de status ativo/inativo

### 🔐 Autenticação e Segurança
- Login com JWT tokens
- Sessões seguras com cookies HTTP-only
- Controle de acesso baseado em papéis
- Middleware de autenticação para rotas protegidas

## Tecnologias Utilizadas

### Frontend
- **SvelteKit** - Framework full-stack
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Svelte Stores** - Gerenciamento de estado

### Backend
- **SvelteKit API Routes** - API RESTful
- **Prisma ORM** - Modelagem e acesso ao banco
- **MySQL** - Banco de dados
- **Zod** - Validação de schemas
- **bcryptjs** - Hash de senhas
- **jsonwebtoken** - Autenticação JWT

### Testes
- **Vitest** - Framework de testes
- **Testing Library** - Testes de componentes
- **jsdom** - Ambiente de testes DOM

## Estrutura do Projeto

```
src/
├── lib/
│   ├── components/          # Componentes Svelte reutilizáveis
│   ├── server/             # Utilitários do servidor (auth, database)
│   ├── stores/             # Stores Svelte (auth, ui, notifications)
│   └── utils/              # Utilitários (validação, erros)
├── routes/
│   ├── api/                # Endpoints da API
│   ├── auth/               # Páginas de autenticação
│   ├── customers/          # Páginas de clientes
│   ├── products/           # Páginas de produtos
│   ├── orders/             # Páginas de pedidos
│   ├── users/              # Páginas de usuários (admin)
│   └── dashboard/          # Dashboard principal
└── app.html                # Template HTML principal
```

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- MySQL 8.0+
- npm ou pnpm

### 1. Clone o repositório
```bash
git clone <repository-url>
cd mrfantasy
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados
```bash
# Configure a variável de ambiente DATABASE_URL
# Exemplo: DATABASE_URL="mysql://usuario:senha@localhost:3306/mrfantasy"

# Execute as migrações
npm run db:migrate

# (Opcional) Popule com dados de exemplo
npm run db:seed
```

### 4. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/mrfantasy"
JWT_SECRET="sua-chave-secreta-muito-segura"
```

### 5. Execute o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run preview
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run build            # Build para produção
npm run preview          # Preview do build

# Banco de dados
npm run db:generate      # Gera cliente Prisma
npm run db:push          # Aplica mudanças no schema
npm run db:migrate       # Executa migrações
npm run db:studio        # Abre Prisma Studio

# Testes
npm run test             # Executa testes
npm run test:watch       # Executa testes em modo watch
npm run test:ui          # Interface gráfica de testes

# Qualidade de código
npm run check            # Verificação de tipos
npm run check:watch      # Verificação contínua
```

## Estrutura do Banco de Dados

### Principais Entidades
- **Users**: Usuários do sistema com controle de acesso
- **Customers**: Clientes que fazem pedidos
- **ProductGroups**: Categorias/grupos de produtos
- **Products**: Produtos disponíveis para aluguel/venda
- **Orders**: Pedidos de aluguel ou venda
- **OrderItems**: Itens individuais de cada pedido
- **InventoryLogs**: Log de movimentações de estoque

### Relacionamentos
- Um cliente pode ter vários pedidos
- Um pedido pode ter vários itens
- Cada produto pertence a um grupo
- Usuários têm diferentes níveis de acesso

## Funcionalidades de Validação

### Frontend
- Validação em tempo real com Zod
- Formatação automática de campos (CPF, telefone)
- Mensagens de erro contextuais
- Componentes de formulário reutilizáveis

### Backend
- Validação de schemas com Zod
- Sanitização de dados de entrada
- Tratamento de erros do banco de dados
- Middleware de validação reutilizável

## Controle de Acesso

### Papéis de Usuário
1. **Funcionário (EMPLOYEE)**
   - Acesso a clientes, produtos e pedidos
   - Pode criar e editar registros básicos

2. **Gerente (MANAGER)**
   - Todas as permissões de funcionário
   - Acesso a relatórios avançados

3. **Administrador (ADMIN)**
   - Acesso total ao sistema
   - Gestão de usuários
   - Configurações do sistema

## Testes

O projeto inclui testes abrangentes para:
- Utilitários de validação
- Serviços de autenticação
- Endpoints da API
- Componentes Svelte
- Stores de estado

```bash
# Executar todos os testes
npm run test

# Testes em modo watch
npm run test:watch

# Interface gráfica de testes
npm run test:ui
```

## Deploy

### Variáveis de Ambiente de Produção
```env
DATABASE_URL="mysql://usuario:senha@host:porta/database"
JWT_SECRET="chave-secreta-muito-segura-em-producao"
NODE_ENV="production"
```

### Build de Produção
```bash
npm run build
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença COPYRIGTH. Veja o arquivo `LICENSE` para mais detalhes.

## Suporte

Para suporte, envie um email para wellinton.m.b.vix@gmail.com ou abra uma issue no GitHub.