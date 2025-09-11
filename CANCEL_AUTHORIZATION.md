# Autorização para Cancelamento de Pedidos

## Visão Geral

Esta funcionalidade implementa controle de acesso restrito para o cancelamento de pedidos, garantindo que apenas usuários com privilégios administrativos possam executar esta operação crítica.

## Regra Implementada

### Controle de Acesso para Status CANCELLED

**Quando**: Tentativa de alterar o status de um pedido para `CANCELLED`
**Restrição**: Apenas usuários com papel `ADMIN` ou `MANAGER` podem executar esta operação
**Papel bloqueado**: `EMPLOYEE` - funcionários comuns não podem cancelar pedidos

```javascript
// Exemplo: Tentativa de cancelamento
PUT /api/orders/123
{
  "status": "CANCELLED"
}

// Resultado para EMPLOYEE: 403 Forbidden
// Resultado para ADMIN/MANAGER: Processamento normal
```

## Justificativa de Negócio

### Por que Restringir o Cancelamento?

1. **Impacto Financeiro**: Cancelamentos afetam receitas e relatórios
2. **Gestão de Estoque**: Cancelar retorna itens ao estoque, afetando disponibilidade
3. **Auditoria**: Operações críticas devem ter rastreabilidade de responsáveis
4. **Prevenção de Erros**: Evita cancelamentos acidentais por funcionários
5. **Hierarquia Operacional**: Decisões de cancelamento requerem supervisão

### Casos de Uso

#### Cenário 1: Funcionário Tenta Cancelar
1. Funcionário (EMPLOYEE) tenta cancelar pedido
2. Sistema bloqueia a operação
3. Retorna erro 403 com mensagem explicativa
4. Funcionário deve solicitar cancelamento ao supervisor

#### Cenário 2: Gerente Cancela Pedido
1. Gerente (MANAGER) altera status para CANCELLED
2. Sistema valida permissões com sucesso
3. Executa lógica de cancelamento (retorno ao estoque, logs)
4. Pedido é cancelado com auditoria completa

#### Cenário 3: Admin Cancela Pedido
1. Administrador (ADMIN) executa cancelamento
2. Sistema permite operação sem restrições
3. Cancelamento é processado normalmente

## Implementação Técnica

### Arquivo Modificado
- `src/routes/api/orders/[id]/+server.ts`

### Lógica Implementada

```typescript
// Validar permissões para alteração de status para CANCELLED
if (validatedData.status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
  const roleCheck = requireRole(locals, 'MANAGER');
  if (!roleCheck.success) {
    return json(
      { error: 'Somente usuários com papel administrativo ou gerente podem cancelar pedidos' },
      { status: 403 }
    );
  }
}
```

### Hierarquia de Permissões

O sistema usa a hierarquia existente definida em `requireRole()`:
- **ADMIN**: Nível 3 - Acesso completo
- **MANAGER**: Nível 2 - Pode cancelar pedidos  
- **EMPLOYEE**: Nível 1 - Bloqueado para cancelamentos

### Validações Aplicadas

1. **Verificação de Transição**: Só valida quando mudando PARA `CANCELLED`
2. **Estado Atual**: Não valida se pedido já está cancelado
3. **Outros Status**: Não afeta alterações para outros status
4. **Atualização Parcial**: Não valida se apenas outros campos são atualizados

## Casos Especiais

### Pedido Já Cancelado
- Se o pedido já está `CANCELLED`, não há validação de permissão
- Permite que qualquer usuário faça outras atualizações em pedidos já cancelados
- Evita bloqueios desnecessários em operações de consulta/auditoria

### Outras Alterações de Status
- Mudanças para `CONFIRMED`, `DELIVERED`, `RETURNED` não são afetadas
- Funcionários (EMPLOYEE) podem continuar executando operações normais
- Apenas o cancelamento requer privilégios elevados

### Atualizações Sem Mudança de Status
- Alterações em campos como `notes`, `attendantId` não são restritas
- Sistema só valida quando há tentativa de mudança para `CANCELLED`

## Testes Automatizados

### Arquivo de Teste
`src/routes/api/orders/cancel-authorization.test.ts`

### Cenários Testados

1. **✅ Bloqueio para EMPLOYEE**
   - Verifica que funcionários recebem erro 403 ao tentar cancelar

2. **✅ Permissão para ADMIN**
   - Confirma que administradores podem cancelar

3. **✅ Permissão para MANAGER**
   - Confirma que gerentes podem cancelar

4. **✅ Pedido já cancelado**
   - Verifica que não há validação para pedidos já cancelados

5. **✅ Outros status permitidos**
   - Confirma que outros status não são afetados pela restrição

6. **✅ Atualizações sem mudança de status**
   - Verifica que outras alterações não são bloqueadas

### Executar os Testes

```bash
# Executar apenas os testes de autorização de cancelamento
npm test cancel-authorization.test.ts

# Executar todos os testes
npm test
```

## Mensagens de Erro

### Para Usuários Sem Permissão
```json
{
  "error": "Somente usuários com papel administrativo ou gerente podem cancelar pedidos"
}
```
**Status HTTP**: 403 Forbidden

## Segurança e Auditoria

### Controles Implementados
- **Validação Prévia**: Verifica permissões antes de processar cancelamento
- **Hierarquia Respeitada**: Usa sistema de papéis existente do middleware
- **Transação Atômica**: Cancelamentos mantêm integridade de dados
- **Logs Automáticos**: Sistema cria logs de inventário para cancelamentos

### Rastreabilidade
- Todos os cancelamentos registram o usuário responsável
- Logs de inventário incluem razão do cancelamento
- Histórico de mudanças mantido para auditoria

## Compatibilidade

### Não Afeta
- **Funcionalidades Existentes**: Outras operações continuam normais
- **Interface do Usuário**: Frontend pode implementar controles visuais
- **APIs Externas**: Integrações existentes mantêm comportamento
- **Relatórios**: Cancelamentos continuam sendo contabilizados normalmente

### Benefícios
- **Segurança Operacional**: Previne cancelamentos não autorizados
- **Controle Gerencial**: Supervisores mantêm controle sobre decisões críticas
- **Conformidade**: Atende requisitos de auditoria e controle interno
- **Rastreabilidade**: Melhora transparência em operações críticas

## Considerações Futuras

### Possíveis Extensões
1. **Configuração Dinâmica**: Permitir configurar quais papéis podem cancelar
2. **Cancelamento com Justificativa**: Exigir motivo obrigatório para cancelamentos
3. **Aprovação em Dois Estágios**: Cancelamentos grandes podem requerer dupla aprovação
4. **Notificações**: Alertas automáticos quando pedidos são cancelados
5. **Relatórios de Cancelamento**: Dashboard específico para acompanhar cancelamentos

### Monitoramento Sugerido
- Taxa de tentativas de cancelamento bloqueadas por papel
- Frequência de cancelamentos por usuário/período
- Análise de impacto de cancelamentos no estoque

---

**Data de Implementação**: 2025-01-11
**Versão**: 1.0
**Autor**: Sistema Mr. Fantasy