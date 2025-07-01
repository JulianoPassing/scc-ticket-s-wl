# 🔧 Correções de Performance - Bot Discord

## Problemas Identificados e Corrigidos

### 1. **Loop Infinito no Transcript Generator** ⚠️ CRÍTICO
**Problema:** O loop `while(true)` na função `generateTranscript` podia ficar preso indefinidamente.

**Solução:**
- Adicionado limite máximo de 50 fetches
- Implementado delay de 100ms a cada 10 fetches para evitar rate limiting
- Adicionado contador de segurança

### 2. **Operações Síncronas de I/O** 🐌
**Problema:** Uso de `fs.readFileSync` e `fs.writeFileSync` bloqueava o event loop.

**Solução:**
- Migrado para `fs.promises` (operações assíncronas)
- Atualizado `getNextTicketNumber()` para ser assíncrono
- Otimizado `saveTranscript()` para operações não-bloqueantes

### 3. **Verificações Redundantes** 🔄
**Problema:** Múltiplas verificações desnecessárias para tickets existentes.

**Solução:**
- Reduzido verificações duplas
- Otimizado cache de roles
- Implementado verificações mais eficientes

### 4. **Falta de Rate Limiting** 📈
**Problema:** Usuários podiam fazer muitas requisições simultâneas.

**Solução:**
- Implementado sistema de rate limiting (5 requisições por minuto)
- Limpeza automática de entradas antigas
- Feedback visual para usuários rate limited

### 5. **Carregamento Ineficiente de Config** 📁
**Problema:** Config.json era lido múltiplas vezes.

**Solução:**
- Carregamento único na inicialização
- Tratamento de erros melhorado

## Novos Recursos

### 🔍 Sistema de Monitoramento
- **Arquivo:** `monitor.js`
- **Função:** Monitora uso de CPU e reinicia automaticamente se necessário
- **Limite:** 80% de CPU (configurável)
- **Restarts:** Máximo 5 por hora

### 🚀 Script de Inicialização
- **Arquivo:** `start.sh`
- **Função:** Inicialização automatizada com verificações
- **Logs:** Salvamento automático de logs
- **Dependências:** Instalação automática se necessário

## Como Usar

### Inicialização Normal
```bash
node bot.js
```

### Inicialização com Monitoramento (Recomendado)
```bash
./start.sh
```

### Apenas Monitoramento
```bash
node monitor.js
```

## Configurações de Performance

### Rate Limiting
- **Janela:** 60 segundos
- **Máximo:** 5 requisições por usuário
- **Limpeza:** Automática a cada 60 segundos

### Transcript Generation
- **Máximo:** 50 fetches por transcript
- **Delay:** 100ms a cada 10 fetches
- **Limite:** 100 mensagens por fetch

### CPU Monitoring
- **Verificação:** A cada 30 segundos
- **Limite:** 80% de CPU
- **Restart Delay:** 5 segundos
- **Máximo Restarts:** 5 por hora

## Logs e Debugging

### Logs Automáticos
- **Localização:** `logs/bot-YYYYMMDD-HHMMSS.log`
- **Conteúdo:** Todas as saídas do bot e monitor
- **Rotação:** Novo arquivo a cada inicialização

### Monitoramento de CPU
```
📊 Current CPU usage: 15.2%
⚠️ High CPU usage detected: 85.1% > 80%
🔄 Restarting bot (attempt 1/5)...
```

## Recomendações

1. **Use sempre o monitor:** `./start.sh`
2. **Monitore os logs:** Verifique `logs/` regularmente
3. **Ajuste limites:** Modifique `maxCpuUsage` em `monitor.js` se necessário
4. **Backup:** Faça backup regular do `ticket-counter.json`

## Troubleshooting

### Bot não inicia
- Verifique se `DISCORD_TOKEN` está definido
- Confirme se `config.json` existe e é válido
- Execute `npm install` se necessário

### Alto uso de CPU persiste
- Verifique logs em `logs/`
- Ajuste `maxCpuUsage` em `monitor.js`
- Considere aumentar recursos da VPS

### Rate limiting muito restritivo
- Ajuste `MAX_REQUESTS_PER_WINDOW` em `bot.js`
- Modifique `RATE_LIMIT_WINDOW` se necessário 