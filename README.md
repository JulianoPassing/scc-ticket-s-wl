# Discord Security Bot

Bot de Discord para gerenciamento de tickets de segurança com sistema de transcripts automático.

## Requisitos do Sistema

- **Node.js**: 18.0.0 ou superior
- **Sistema Operacional**: Linux (testado no Debian 12)
- **Memória RAM**: Mínimo 512MB
- **Espaço em Disco**: 100MB livres

## Instalação no Debian 12

### 1. Instalar Node.js

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 2. Baixar e Configurar o Bot

```bash
# Clonar/baixar arquivos do projeto
mkdir discord-security-bot
cd discord-security-bot

# Copiar todos os arquivos do projeto para esta pasta
# Estrutura necessária:
# ├── bot.js
# ├── commands/
# │   ├── panel.js
# │   └── ticket.js
# ├── utils/
# │   ├── ticketManager.js
# │   └── transcriptGenerator.js
# ├── config.json
# └── deploy-commands.js
```

### 3. Instalar Dependências

```bash
npm install discord.js
```

### 4. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env (opcional) ou usar variáveis do sistema
sudo nano /etc/environment

# Adicionar as seguintes linhas:
DISCORD_TOKEN="seu_token_aqui"
CLIENT_ID="seu_client_id_aqui"
GUILD_ID="seu_guild_id_aqui"

# Recarregar variáveis
source /etc/environment
```

### 5. Configurar config.json

```bash
nano config.json
```

Verificar se as configurações estão corretas:
- `categoryId`: ID da categoria onde os tickets serão criados
- `staffRoleId`: ID do cargo que pode fechar tickets
- `logChannelId`: ID do canal de logs

### 6. Registrar Comandos do Bot

```bash
node deploy-commands.js
```

### 7. Iniciar o Bot

```bash
# Executar uma vez para testar
node bot.js

# Para rodar em background
nohup node bot.js > bot.log 2>&1 &
```

## Configuração como Serviço Systemd

Para rodar o bot automaticamente:

### 1. Criar arquivo de serviço

```bash
sudo nano /etc/systemd/system/discord-bot.service
```

### 2. Adicionar configuração

```ini
[Unit]
Description=Discord Security Bot
After=network.target

[Service]
Type=simple
User=seu_usuario
WorkingDirectory=/caminho/para/discord-security-bot
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DISCORD_TOKEN=seu_token_aqui
Environment=CLIENT_ID=seu_client_id_aqui
Environment=GUILD_ID=seu_guild_id_aqui

[Install]
WantedBy=multi-user.target
```

### 3. Ativar serviço

```bash
# Recarregar daemon
sudo systemctl daemon-reload

# Ativar serviço
sudo systemctl enable discord-bot

# Iniciar serviço
sudo systemctl start discord-bot

# Verificar status
sudo systemctl status discord-bot

# Ver logs
sudo journalctl -u discord-bot -f
```

## Comandos do Bot

### `/painelseg`
Cria o painel visual para os usuários abrirem tickets de segurança.

### `/ticket create`
Comando alternativo para criar tickets (além do painel).

### `/ticket close`
Fecha tickets (apenas staff).

### `/ticket add <usuário>`
Adiciona usuário ao ticket (apenas staff).

### `/ticket remove <usuário>`
Remove usuário do ticket (apenas staff).

## Estrutura dos Arquivos

```
discord-security-bot/
├── bot.js                    # Arquivo principal
├── config.json              # Configurações do bot
├── deploy-commands.js        # Script para registrar comandos
├── commands/
│   ├── panel.js             # Comando /painelseg
│   └── ticket.js            # Comandos /ticket
├── utils/
│   ├── ticketManager.js     # Gerenciamento de tickets
│   └── transcriptGenerator.js # Geração de transcripts HTML
└── transcripts/             # Pasta criada automaticamente
```

## Funcionalidades

- **Tickets de Segurança**: Formato `seg-@usuario`
- **Controle de Acesso**: Apenas staff pode fechar tickets
- **Transcripts HTML**: Gerados automaticamente ao fechar
- **Logs Automáticos**: Enviados para canal específico
- **Modal de Fechamento**: Staff deve informar motivo
- **Painel Visual**: Interface amigável para usuários

## Troubleshooting

### Bot não inicia
```bash
# Verificar logs
sudo journalctl -u discord-bot -n 50

# Verificar se Node.js está instalado
node --version

# Verificar dependências
npm list
```

### Comandos não aparecem
```bash
# Re-registrar comandos
node deploy-commands.js

# Aguardar até 1 hora para comandos globais
```

### Erro de permissões
- Verificar se o bot tem permissões no servidor
- Confirmar IDs de categoria, canal e cargo
- Verificar se o bot está no servidor correto

## Logs e Monitoramento

```bash
# Ver logs em tempo real
sudo journalctl -u discord-bot -f

# Ver logs do dia
sudo journalctl -u discord-bot --since today

# Ver logs com erro
sudo journalctl -u discord-bot -p err
```

## Backup e Manutenção

```bash
# Backup dos transcripts
cp -r transcripts/ backup-transcripts-$(date +%Y%m%d)/

# Atualizar bot (após alterações)
sudo systemctl stop discord-bot
# Substituir arquivos
sudo systemctl start discord-bot
```

## Suporte

Para problemas ou dúvidas, verificar:
1. Logs do sistema: `sudo journalctl -u discord-bot -f`
2. Arquivo de configuração: `config.json`
3. Permissões do bot no Discord
4. Conectividade de rede