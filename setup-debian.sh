#!/bin/bash

# Script simplificado para setup no Debian 12
# Executa: chmod +x setup-debian.sh && ./setup-debian.sh

echo "Discord Security Bot - Setup Debian 12"
echo "======================================"

# Instalar Node.js se necessário
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Instalar dependências
echo "Instalando dependências..."
npm install discord.js

# Criar diretórios necessários
mkdir -p transcripts

echo ""
echo "Setup concluído!"
echo ""
echo "Configure suas variáveis de ambiente:"
echo "export DISCORD_TOKEN='seu_token'"
echo "export CLIENT_ID='seu_client_id'" 
echo "export GUILD_ID='seu_guild_id'"
echo ""
echo "Depois execute:"
echo "node deploy-commands.js"
echo "node bot.js"