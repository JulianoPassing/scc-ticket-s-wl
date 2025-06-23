# Discord Support Ticket Bot

## Overview

This is a Discord bot built with Discord.js v14 that provides comprehensive support ticket management functionality. The bot allows users to create support tickets through slash commands, manages ticket channels with proper permissions, and provides tools for staff to manage tickets effectively.

## System Architecture

### Backend Architecture
- **Framework**: Discord.js v14 - Modern Discord API wrapper with slash command support
- **Runtime**: Node.js 20 - Latest LTS version for optimal performance and security
- **Architecture Pattern**: Command-based modular architecture with separate command files
- **File System**: JSON-based configuration and data persistence for simplicity

### Command System
- **Command Loading**: Dynamic command loading from `/commands` directory
- **Slash Commands**: Modern Discord slash command implementation
- **Permission System**: Role-based access control for ticket management

## Key Components

### Core Files
- **`bot.js`**: Main application entry point, handles client initialization and event management
- **`config.json`**: Centralized configuration file for bot settings, roles, and customization options
- **`deploy-commands.js`**: Command deployment utility for registering slash commands with Discord API

### Command Structure
- **`commands/ticket.js`**: Complete ticket management command with subcommands:
  - `create`: Create new support tickets with reason
  - `close`: Close existing tickets
  - `add`: Add users to tickets
  - `remove`: Remove users from tickets

### Utility Systems
- **`utils/ticketManager.js`**: Core ticket management functionality including:
  - Ticket numbering system with persistent counter
  - Channel creation with permission management
  - Category organization

## Data Flow

### Ticket Creation Flow
1. User executes `/ticket create` command with reason
2. System validates user permissions and ticket limits
3. Generates unique ticket number from persistent counter
4. Creates private channel in designated category
5. Sets appropriate permissions for user and support staff
6. Sends confirmation embed with ticket information

### Permission Management
- **User Access**: Original ticket creator gets view/send permissions
- **Staff Access**: Configurable support roles get full management permissions
- **Category Organization**: All tickets organized under designated category

## External Dependencies

### Primary Dependencies
- **discord.js v14.20.0**: Core Discord API wrapper
  - Provides modern slash command support
  - Handles WebSocket connections and API interactions
  - Includes permission management and embed builders

### Environment Configuration
- **Discord Token**: Bot authentication token
- **Client ID**: Discord application client identifier
- **Guild ID**: Target Discord server identifier (optional for global commands)

## Deployment Strategy

### Replit Integration
- **Auto-install**: Automatic dependency installation via npm
- **Workflow System**: Parallel workflow execution for bot startup
- **Environment Variables**: Support for environment-based configuration override

### Configuration Management
- **Flexible Setup**: Environment variables take precedence over config.json
- **Role Configuration**: Customizable support role names
- **Embed Customization**: Configurable colors for different message types

### Auto-cleanup Features
- **Configurable Cleanup**: Optional automatic ticket cleanup after specified hours
- **Resource Management**: Prevents channel accumulation through automated maintenance

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 23, 2025: Comando alterado de /panel para /painelseg para criar painel sem mencionar usuário
- June 23, 2025: Implementado modal para motivo de fechamento do ticket pelo staff
- June 23, 2025: Configurado canal de logs específico (ID: 1309235378317951158)
- June 23, 2025: Categoria específica configurada (ID: 1378778140528087191)
- June 23, 2025: Modificado sistema para tickets de segurança com formato "seg-@usuario"
- June 23, 2025: Implementado controle de acesso restrito apenas para staff (ID: 1277638402019430501)
- June 23, 2025: Apenas staff pode fechar tickets de segurança
- June 23, 2025: Painel visual de tickets com modal interativo
- June 23, 2025: Sistema de transcript HTML automático implementado
- June 23, 2025: Canal de logs automático com transcripts em arquivo
- June 23, 2025: Campo "Prioridade" removido do painel para simplificação
- June 23, 2025: Criados scripts de instalação automática para Debian 12
- June 23, 2025: Documentação completa em português para deployment

## Changelog

- June 23, 2025: Initial setup
- June 23, 2025: Implementado sistema completo de painel e transcripts

## Configuration Options

### Ticket Management
- **Maximum Tickets**: Configurable per-user ticket limits
- **Channel Naming**: Customizable ticket channel prefix
- **Category Management**: Automatic category creation and organization

### Access Control
- **Support Roles**: Multiple configurable support role names
- **Permission Inheritance**: Automatic permission setup for new tickets
- **User Management**: Add/remove users from active tickets

### Visual Customization
- **Embed Colors**: Customizable colors for success, error, info, and warning messages
- **Activity Status**: Bot status display for ticket management activity