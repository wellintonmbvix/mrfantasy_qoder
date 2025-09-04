# Confirmação Automática de Pedidos - MRFantasy

## Visão Geral

O sistema implementa uma regra de negócio que automaticamente define o status inicial dos pedidos baseado no tipo de itens incluídos.

## Regra Implementada

### Status Automático por Tipo de Item

Ao criar um novo pedido, o sistema verifica todos os itens incluídos e define o status inicial seguindo esta lógica:

- **🟢 CONFIRMED**: Quando **TODOS** os itens são do tipo `SALE` (venda)
- **🟡 PENDING**: Quando há **pelo menos um** item do tipo `RENTAL` (aluguel)

## Implementação Técnica

### Localização do Código

**Arquivo**: `src/routes/api/orders/+server.ts`  
**Função**: `POST` - Criação de pedidos

```javascript
// Determine order status based on items
// If all items are SALE type, mark order as CONFIRMED
const allItemsAreSale = processedItems.every(item => item.itemType === 'SALE');
const orderStatus = allItemsAreSale ? 'CONFIRMED' : 'PENDING';
```

### Casos de Uso

#### 1. Pedido Apenas com Vendas → CONFIRMED

```javascript
const orderData = {
  attendantId: 1,
  orderType: 'SALE',
  orderDate: '2025-09-04T10:00:00Z',
  items: [
    { productId: 1, quantity: 1, unitPrice: 50, itemType: 'SALE' },
    { productId: 2, quantity: 2, unitPrice: 25, itemType: 'SALE' }
  ],
  payments: [
    { paymentMethodId: 1, amount: 100 }
  ]
};

// Status resultante: CONFIRMED
```

#### 2. Pedido com Aluguel → PENDING

```javascript
const orderData = {
  customerId: 1,
  attendantId: 1,
  orderType: 'RENTAL',
  orderDate: '2025-09-04T10:00:00Z',
  rentalStartDate: '2025-09-05T10:00:00Z',
  rentalEndDate: '2025-09-07T10:00:00Z',
  items: [
    { productId: 1, quantity: 1, unitPrice: 50, itemType: 'RENTAL' }
  ],
  payments: [
    { paymentMethodId: 1, amount: 50 }
  ]
};

// Status resultante: PENDING
```

#### 3. Pedido Misto (Venda + Aluguel) → PENDING

```javascript
const orderData = {
  customerId: 1,
  attendantId: 1,
  orderType: 'SALE',
  orderDate: '2025-09-04T10:00:00Z',
  items: [
    { productId: 1, quantity: 1, unitPrice: 50, itemType: 'SALE' },
    { productId: 2, quantity: 1, unitPrice: 30, itemType: 'RENTAL' }
  ],
  payments: [
    { paymentMethodId: 1, amount: 80 }
  ]
};

// Status resultante: PENDING (devido ao item de aluguel)
```

## Justificativa de Negócio

### Por que Vendas são Confirmadas Automaticamente?

1. **Simplicidade Operacional**: Vendas diretas não requerem validação de datas ou condições especiais
2. **Fluxo de Caixa**: Vendas podem ser processadas imediatamente para faturamento
3. **Experiência do Cliente**: Clientes recebem confirmação instantânea da compra
4. **Redução de Trabalho Manual**: Elimina a necessidade de confirmação manual para vendas simples

### Por que Aluguéis Permanecem Pendentes?

1. **Validação de Datas**: Aluguéis precisam de validação das datas de início e fim
2. **Verificação de Disponibilidade**: Necessário confirmar disponibilidade nos períodos solicitados
3. **Condições do Produto**: Verificação do estado dos itens antes da entrega
4. **Documentação Adicional**: Aluguéis podem requerer contratos ou termos específicos
5. **Planejamento Logístico**: Coordenação de entrega e devolução

## Testes Automatizados

### Arquivo de Teste

**Localização**: `src/routes/api/orders/orders-auto-confirm.test.ts`

### Cenários Testados

1. **✅ Todos itens SALE → CONFIRMED**
   - Verifica que pedidos só com vendas são automaticamente confirmados

2. **✅ Itens mistos (SALE + RENTAL) → PENDING**
   - Verifica que a presença de qualquer item de aluguel mantém o pedido pendente

3. **✅ Apenas itens RENTAL → PENDING**
   - Verifica que pedidos só de aluguel permanecem pendentes

### Executar os Testes

```bash
# Executar apenas os testes de confirmação automática
npx vitest run orders-auto-confirm.test.ts

# Executar todos os testes
npm run test
```

## Considerações Futuras

### Possíveis Extensões

1. **Configuração Dinâmica**: Permitir configurar esta regra via settings da empresa
2. **Regras por Categoria**: Diferentes regras baseadas na categoria do produto
3. **Aprovação por Valor**: Vendas acima de determinado valor podem requerer aprovação
4. **Notificações**: Envio automático de confirmação para vendas auto-confirmadas

### Monitoramento

- Acompanhar a taxa de pedidos auto-confirmados vs. pendentes
- Identificar padrões de conversão entre status
- Medir impacto na eficiência operacional

## Histórico de Mudanças

| Data | Versão | Alteração | Autor |
|------|--------|-----------|-------|
| 2025-09-04 | 1.0 | Implementação inicial da confirmação automática | Sistema |

---

**Observação**: Esta funcionalidade não afeta pedidos já existentes, apenas novos pedidos criados após a implementação.