# Sistema de Descontos e Acréscimos - MRFantasy

## Visão Geral

O sistema foi implementado para permitir descontos e acréscimos tanto a nível de item individual quanto a nível de pedido total, com rateio automático quando necessário.

## Estrutura do Banco de Dados

### Tabela `orders`
- `subtotal_amount`: DECIMAL(10,2) - Valor antes dos descontos
- `discount_type`: ENUM('PERCENTAGE', 'FIXED') - Tipo de desconto do pedido
- `discount_value`: DECIMAL(10,2) - Valor do desconto do pedido
- `total_amount`: DECIMAL(10,2) - Valor final após descontos

### Tabela `order_items`
- `discount_type`: ENUM('PERCENTAGE', 'FIXED') - Tipo de desconto do item
- `discount_value`: DECIMAL(10,2) - Valor do desconto do item
- `total_price`: DECIMAL(10,2) - Preço final do item após desconto

## Como Usar

### 1. Desconto por Item Individual

```javascript
// Exemplo de pedido com desconto por item
const orderData = {
  customerId: 1,
  attendantId: 1,
  orderType: 'SALE',
  orderDate: new Date(),
  items: [
    {
      productId: 1,
      quantity: 2,
      unitPrice: 100.00,
      discountType: 'PERCENTAGE',
      discountValue: 10, // 10% de desconto
      itemType: 'SALE'
    },
    {
      productId: 2,
      quantity: 1,
      unitPrice: 50.00,
      discountType: 'FIXED',
      discountValue: 5.00, // R$ 5,00 de desconto
      itemType: 'SALE'
    }
  ],
  payments: [
    {
      paymentMethodId: 1,
      amount: 185.00 // Total após descontos
    }
  ]
};

// Resultado:
// Item 1: R$ 200,00 - 10% = R$ 180,00
// Item 2: R$ 50,00 - R$ 5,00 = R$ 45,00
// Total: R$ 225,00
```

### 2. Desconto Total com Rateio

```javascript
// Exemplo de pedido com desconto total
const orderData = {
  customerId: 1,
  attendantId: 1,
  orderType: 'RENTAL',
  orderDate: new Date(),
  discountType: 'PERCENTAGE',
  discountValue: 15, // 15% de desconto no pedido total
  items: [
    {
      productId: 1,
      quantity: 1,
      unitPrice: 100.00,
      itemType: 'RENTAL'
    },
    {
      productId: 2,
      quantity: 2,
      unitPrice: 50.00,
      itemType: 'RENTAL'
    }
  ],
  payments: [
    {
      paymentMethodId: 1,
      amount: 170.00 // Total após 15% de desconto
    }
  ]
};

// Resultado:
// Subtotal: R$ 200,00
// Desconto 15%: R$ 30,00
// Total: R$ 170,00
// 
// Rateio do desconto:
// Item 1 (50% do pedido): 15% de desconto
// Item 2 (50% do pedido): 15% de desconto
```

### 3. Desconto Fixo com Rateio Proporcional

```javascript
// Desconto fixo distribuído proporcionalmente
const orderData = {
  customerId: 1,
  attendantId: 1,
  orderType: 'SALE',
  orderDate: new Date(),
  discountType: 'FIXED',
  discountValue: 30.00, // R$ 30,00 de desconto no total
  items: [
    {
      productId: 1,
      quantity: 1,
      unitPrice: 200.00, // 66.67% do total
      itemType: 'SALE'
    },
    {
      productId: 2,
      quantity: 1,
      unitPrice: 100.00, // 33.33% do total
      itemType: 'SALE'
    }
  ],
  payments: [
    {
      paymentMethodId: 1,
      amount: 270.00
    }
  ]
};

// Resultado:
// Subtotal: R$ 300,00
// Desconto total: R$ 30,00
// 
// Rateio proporcional:
// Item 1: R$ 20,00 de desconto (66.67% de R$ 30,00)
// Item 2: R$ 10,00 de desconto (33.33% de R$ 30,00)
// 
// Total final: R$ 270,00
```

## Validações Implementadas

1. **Desconto Percentual**: Não pode ser maior que 100%
2. **Desconto Fixo**: Não pode ser maior que o valor do item/pedido
3. **Tipo Obrigatório**: Se há valor de desconto, o tipo deve ser especificado
4. **Consistência de Pagamento**: Total dos pagamentos deve ser igual ao total do pedido após desconto

## API Endpoints

### POST /api/orders

Aceita os campos adicionais:
- `discountType`: 'PERCENTAGE' | 'FIXED' (opcional)
- `discountValue`: number (opcional)
- `items[].discountType`: 'PERCENTAGE' | 'FIXED' (opcional)
- `items[].discountValue`: number (opcional)

### GET /api/orders

Retorna os campos adicionais:
- `subtotalAmount`: Valor antes dos descontos
- `discountType`: Tipo de desconto do pedido
- `discountValue`: Valor do desconto do pedido
- `totalAmount`: Valor final
- `orderItems[].discountType`: Tipo de desconto do item
- `orderItems[].discountValue`: Valor do desconto do item
- `orderItems[].totalPrice`: Preço final do item

## Stores Svelte

### orderCalculator
Store para calcular totais em tempo real durante a criação de pedidos.

```javascript
import { orderCalculator, orderTotals } from '$lib/stores/discounts.js';

// Adicionar itens
orderCalculator.addItem({
  productId: 1,
  quantity: 2,
  unitPrice: 100.00,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  itemType: 'SALE'
});

// Definir desconto do pedido
orderCalculator.setOrderDiscount('FIXED', 20.00);

// Acessar totais calculados
$orderTotals.subtotal; // Subtotal antes dos descontos
$orderTotals.total; // Total final
$orderTotals.totalDiscountAmount; // Total de descontos aplicados
```

## Utilitários de Cálculo

```javascript
import { 
  calculateDiscount, 
  applyDiscount, 
  distributeOrderDiscount,
  formatCurrency 
} from '$lib/utils/validation.js';

// Calcular valor do desconto
const discount = calculateDiscount(100, 'PERCENTAGE', 10); // 10

// Aplicar desconto
const finalPrice = applyDiscount(100, 'PERCENTAGE', 10); // 90

// Distribuir desconto do pedido
const items = [
  { unitPrice: 100, quantity: 1 },
  { unitPrice: 50, quantity: 2 }
];
const distributed = distributeOrderDiscount(items, 'FIXED', 30);

// Formatar valor
const formatted = formatCurrency(123.45); // "R$ 123,45"
```

## Exemplo de Uso no Frontend

```svelte
<script>
  import { orderCalculator, orderTotals, discountMode } from '$lib/stores/discounts.js';
  
  let selectedDiscountMode = 'item'; // 'item' ou 'order'
  
  $: discountMode.set(selectedDiscountMode);
</script>

<div>
  <h3>Modo de Desconto</h3>
  <label>
    <input type="radio" bind:group={selectedDiscountMode} value="item" />
    Por Item
  </label>
  <label>
    <input type="radio" bind:group={selectedDiscountMode} value="order" />
    Total do Pedido
  </label>
</div>

{#if selectedDiscountMode === 'order'}
  <div>
    <h4>Desconto do Pedido</h4>
    <select bind:value={orderDiscountType}>
      <option value="">Sem desconto</option>
      <option value="PERCENTAGE">Percentual (%)</option>
      <option value="FIXED">Valor fixo (R$)</option>
    </select>
    
    {#if orderDiscountType}
      <input 
        type="number" 
        bind:value={orderDiscountValue}
        max={orderDiscountType === 'PERCENTAGE' ? 100 : $orderTotals.subtotal}
      />
    {/if}
  </div>
{/if}

<div class="totals">
  <p>Subtotal: {formatCurrency($orderTotals.subtotal)}</p>
  <p>Desconto: {formatCurrency($orderTotals.totalDiscountAmount)}</p>
  <p><strong>Total: {formatCurrency($orderTotals.total)}</strong></p>
</div>
```