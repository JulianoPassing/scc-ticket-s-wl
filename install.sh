#!/bin/bash

# Discord Security Bot - Instalador para Debian 12
# Executa automaticamente toda a configuração necessária

set -e  # Parar em caso de erro

echo "=== Instalador do Discord Security Bot ==="
echo "Sistema: Debian 12"
echo "Node.js: 18.x LTS"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se é root/sudo
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root"
   echo "Execute: bash install.sh"
   exit 1
fi

# Verificar sistema
if ! grep -q "Debian GNU/Linux 12" /etc/os-release 2>/dev/null; then
    warn "Este script foi testado no Debian 12. Continuando mesmo assim..."
fi

log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18.x
log "Instalando Node.js 18.x LTS..."
if ! command -v node &> /dev/null || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log "Node.js 18+ já instalado"
fi

# Verificar instalação
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "Node.js: $NODE_VERSION"
log "npm: $NPM_VERSION"

# Criar diretório do projeto
PROJECT_DIR="$HOME/discord-security-bot"
if [ -d "$PROJECT_DIR" ]; then
    warn "Diretório $PROJECT_DIR já existe"
    read -p "Deseja continuar? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

log "Criando diretório do projeto..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Instalar dependências
log "Instalando dependências..."
npm install discord.js@^14.20.0

# Criar estrutura de diretórios
log "Criando estrutura de diretórios..."
mkdir -p commands utils transcripts

# Criar arquivo de serviço systemd
log "Criando arquivo de serviço systemd..."
SERVICE_FILE="/tmp/discord-bot.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Discord Security Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo mv "$SERVICE_FILE" /etc/systemd/system/discord-bot.service

# Criar script de start
log "Criando scripts auxiliares..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "Iniciando Discord Security Bot..."
if [ ! -f ".env" ] && [ -z "$DISCORD_TOKEN" ]; then
    echo "ERRO: Configure as variáveis de ambiente primeiro!"
    echo "Execute: bash configure.sh"
    exit 1
fi
node bot.js
EOF

cat > stop.sh << 'EOF'
#!/bin/bash
echo "Parando Discord Security Bot..."
sudo systemctl stop discord-bot
echo "Bot parado."
EOF

cat > status.sh << 'EOF'
#!/bin/bash
echo "Status do Discord Security Bot:"
sudo systemctl status discord-bot --no-pager
echo ""
echo "Logs recentes:"
sudo journalctl -u discord-bot -n 10 --no-pager
EOF

cat > logs.sh << 'EOF'
#!/bin/bash
echo "Logs em tempo real do Discord Security Bot:"
echo "Pressione Ctrl+C para sair"
sudo journalctl -u discord-bot -f
EOF

# Tornar scripts executáveis
chmod +x start.sh stop.sh status.sh logs.sh

# Criar script de configuração
cat > configure.sh << 'EOF'
#!/bin/bash

echo "=== Configuração do Discord Security Bot ==="
echo ""

# Função para ler input
read_var() {
    local var_name="$1"
    local prompt="$2"
    local current_value="$3"
    
    if [ -n "$current_value" ]; then
        echo -n "$prompt [$current_value]: "
    else
        echo -n "$prompt: "
    fi
    
    read input
    if [ -n "$input" ]; then
        echo "$input"
    else
        echo "$current_value"
    fi
}

# Ler configurações existentes se existirem
if [ -f ".env" ]; then
    source .env
fi

echo "Configure as credenciais do Discord:"
echo ""

DISCORD_TOKEN=$(read_var "DISCORD_TOKEN" "Discord Bot Token" "$DISCORD_TOKEN")
CLIENT_ID=$(read_var "CLIENT_ID" "Discord Client ID" "$CLIENT_ID")
GUILD_ID=$(read_var "GUILD_ID" "Discord Guild ID (opcional)" "$GUILD_ID")

echo ""
echo "Configure os IDs do servidor:"
echo ""

# Ler configurações do config.json se existir
if [ -f "config.json" ]; then
    CATEGORY_ID=$(grep -o '"categoryId": "[^"]*"' config.json | cut -d'"' -f4)
    STAFF_ROLE_ID=$(grep -o '"staffRoleId": "[^"]*"' config.json | cut -d'"' -f4)
    LOG_CHANNEL_ID=$(grep -o '"logChannelId": "[^"]*"' config.json | cut -d'"' -f4)
fi

CATEGORY_ID=$(read_var "CATEGORY_ID" "ID da Categoria de Tickets" "$CATEGORY_ID")
STAFF_ROLE_ID=$(read_var "STAFF_ROLE_ID" "ID do Cargo de Staff" "$STAFF_ROLE_ID")
LOG_CHANNEL_ID=$(read_var "LOG_CHANNEL_ID" "ID do Canal de Logs" "$LOG_CHANNEL_ID")

# Salvar variáveis de ambiente
echo "Salvando configurações..."
cat > .env << EOL
DISCORD_TOKEN="$DISCORD_TOKEN"
CLIENT_ID="$CLIENT_ID"
GUILD_ID="$GUILD_ID"
EOL

# Atualizar config.json
cat > config.json << EOL
{
    "token": "",
    "clientId": "",
    "guildId": "",
    "categoryId": "$CATEGORY_ID",
    "supportRoles": [
        "Support Team",
        "Moderator",
        "Admin",
        "Staff"
    ],
    "staffRoleId": "$STAFF_ROLE_ID",
    "maxTicketsPerUser": 1,
    "ticketChannelPrefix": "ticket",
    "embedColors": {
        "success": "#00FF00",
        "error": "#FF0000",
        "info": "#0099FF",
        "warning": "#FFA500"
    },
    "autoCleanup": {
        "enabled": true,
        "maxAgeHours": 168
    },
    "logChannelId": "$LOG_CHANNEL_ID"
}
EOL

echo ""
echo "✅ Configuração salva!"
echo "Agora você pode:"
echo "1. Registrar comandos: node deploy-commands.js"
echo "2. Iniciar bot: bash start.sh"
echo "3. Ativar serviço: sudo systemctl enable discord-bot"
EOF

chmod +x configure.sh

# Criar .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
transcripts/
ticket-counter.json
EOF

log "Recarregando daemon systemd..."
sudo systemctl daemon-reload

echo ""
echo -e "${GREEN}=== Instalação Concluída! ===${NC}"
echo ""
echo "Próximos passos:"
echo "1. cd $PROJECT_DIR"
echo "2. bash configure.sh  # Configurar credenciais"
echo "3. node deploy-commands.js  # Registrar comandos"
echo "4. bash start.sh  # Testar bot"
echo "5. sudo systemctl enable discord-bot  # Ativar serviço"
echo ""
echo "Scripts disponíveis:"
echo "- configure.sh: Configurar credenciais"
echo "- start.sh: Iniciar bot manualmente"
echo "- stop.sh: Parar serviço"
echo "- status.sh: Ver status"
echo "- logs.sh: Ver logs em tempo real"
echo ""
echo "Localização: $PROJECT_DIR"