# Sistema de Upload de Imagens para Produtos

Este documento descreve como usar o sistema de upload de imagens implementado para o cadastro de produtos no Mr. Fantasy.

## Visão Geral

O sistema permite que os usuários façam upload de imagens JPG, JPEG, PNG ou WebP para os produtos, substituindo o campo manual de URL por uma interface de drag-and-drop moderna e intuitiva.

## Estrutura de Arquivos

### Diretórios Criados
```
static/
└── uploads/
    └── products/
        ├── .gitkeep
        └── [imagens dos produtos]
```

### Componentes Implementados
- `src/lib/components/ImageUpload.svelte` - Componente de upload com drag-and-drop
- `src/lib/components/GroupForm.svelte` - Formulário para grupos de produtos  
- `src/lib/components/DeleteConfirmModal.svelte` - Modal de confirmação de exclusão

### Endpoints de API
- `src/routes/api/products/upload/+server.ts` - Endpoint para upload de imagens

## Como Usar

### 1. Acessando o Sistema
1. Faça login no sistema Mr. Fantasy
2. No menu lateral, clique em "Produtos"
3. Clique no botão "Novo Produto" ou edite um produto existente

### 2. Upload de Imagem
No formulário de produto, você verá uma nova seção "Imagem do produto" com:

#### Opções de Upload:
- **Clique para selecionar**: Clique na área pontilhada para abrir o seletor de arquivos
- **Drag and Drop**: Arraste uma imagem diretamente para a área pontilhada
- **Teclado**: Use Tab para navegar até a área e pressione Enter ou Espaço

#### Formatos Aceitos:
- JPG/JPEG
- PNG  
- WebP
- Tamanho máximo: 5MB

#### Preview da Imagem:
- Após o upload, a imagem aparece como preview (128x128px)
- Botão "×" vermelho no canto superior direito para remover a imagem

### 3. Estados Visuais
- **Upload em progresso**: Spinner animado com "Enviando imagem..."
- **Drag ativo**: Borda azul quando arrastar arquivo sobre a área
- **Erro**: Mensagem em vermelho caso o upload falhe
- **Desabilitado**: Área fica opaca quando o formulário está sendo salvo

## Validações Implementadas

### Frontend
- Tipos de arquivo permitidos
- Feedback visual durante upload
- Tratamento de erros de rede

### Backend
- Validação de tipo MIME
- Verificação de tamanho do arquivo (5MB)
- Geração de nomes únicos para evitar conflitos
- Criação automática de diretórios

## Características Técnicas

### Segurança
- Validação dupla (frontend + backend)
- Sanitização de nomes de arquivo
- Restrição de tipos MIME

### Performance
- Upload assíncrono
- Feedback imediato ao usuário
- Compressão automática pelo navegador

### Acessibilidade
- Suporte completo a teclado
- Labels e ARIA apropriadas
- Contraste adequado para estados visuais

## Estrutura de Armazenamento

### Nomes de Arquivo
Formato: `product_{timestamp}_{random}.{extensão}`
Exemplo: `product_1703123456789_abc123def.jpg`

### URLs Servidas
As imagens ficam acessíveis em: `/uploads/products/{nome-do-arquivo}`
Exemplo: `http://localhost:5173/uploads/products/product_1703123456789_abc123def.jpg`

### Controle de Versão
- Pasta `static/uploads/products/` está no `.gitignore`
- Mantém apenas o arquivo `.gitkeep` para preservar a estrutura
- Imagens não são versionadas (apenas sua URL no banco de dados)

## Integração com o Sistema Existente

### Campo do Banco de Dados
O campo `imageUrl` na tabela `Product` armazena o caminho relativo da imagem:
```sql
imageUrl: "/uploads/products/product_1703123456789_abc123def.jpg"
```

### Compatibilidade
- Totalmente compatível com URLs externas existentes
- Não quebra produtos que já têm imagens
- Campo continua opcional

## Resolução de Problemas

### Problemas Comuns

#### "Nenhuma imagem foi enviada"
- Certifique-se de selecionar um arquivo válido
- Verifique se o arquivo não está corrompido

#### "Tipo de arquivo não permitido"
- Use apenas JPG, JPEG, PNG ou WebP
- Verifique se a extensão do arquivo está correta

#### "Arquivo muito grande"
- Reduza o tamanho da imagem para menos de 5MB
- Use ferramentas de compressão de imagem

#### "Erro de conexão"
- Verifique se o servidor está rodando
- Confirme se não há bloqueios de firewall

### Logs do Sistema
Erros de upload são registrados no console do servidor para debug.

## Melhorias Futuras

### Possíveis Implementações
- Redimensionamento automático de imagens
- Múltiplas imagens por produto
- Galeria de imagens
- Integração com CDN
- Compressão otimizada no servidor
- Thumbnails automáticos

## Testes

### Teste Manual
1. Acesse a página de produtos
2. Crie um novo produto
3. Teste o upload por clique e drag-and-drop
4. Verifique se a imagem aparece no preview
5. Salve o produto e confirme que a imagem persiste

### Testes Automatizados
Execute: `npm run test -- src/lib/components/ImageUpload.test.ts`

## Suporte

Para problemas ou dúvidas sobre o sistema de upload de imagens, consulte:
- Este documento
- Logs do servidor de desenvolvimento
- Código-fonte dos componentes implementados