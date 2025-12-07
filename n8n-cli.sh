#!/bin/bash

# N8N CLI Helper - Facilite l'utilisation de N8N depuis le terminal

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}N8N CLI Helper${NC}"
    echo ""
    echo "Usage: ./n8n-cli.sh [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  start           - Démarrer N8N"
    echo "  stop            - Arrêter N8N"
    echo "  restart         - Redémarrer N8N"
    echo "  status          - Afficher le statut de N8N"
    echo "  logs            - Afficher les logs en temps réel"
    echo "  shell           - Accéder au terminal du conteneur N8N"
    echo "  exec <cmd>      - Exécuter une commande N8N CLI"
    echo "  list            - Lister tous les workflows"
    echo "  export          - Exporter tous les workflows"
    echo "  import <file>   - Importer un workflow"
    echo "  backup          - Créer une sauvegarde complète"
    echo "  help            - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./n8n-cli.sh start"
    echo "  ./n8n-cli.sh exec n8n list:workflow"
    echo "  ./n8n-cli.sh import workflows/my-workflow.json"
}

# Vérifier si le conteneur est en cours d'exécution
is_running() {
    docker-compose ps | grep -q "n8n.*Up"
    return $?
}

# Commande start
cmd_start() {
    echo -e "${BLUE}🚀 Démarrage de N8N...${NC}"
    mkdir -p workflows credentials
    docker-compose up -d
    sleep 3
    if is_running; then
        echo -e "${GREEN}✅ N8N est démarré !${NC}"
        echo -e "${YELLOW}🌐 Accédez à: http://localhost:5678${NC}"
    else
        echo -e "${RED}❌ Échec du démarrage de N8N${NC}"
        docker-compose logs
    fi
}

# Commande stop
cmd_stop() {
    echo -e "${BLUE}🛑 Arrêt de N8N...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ N8N est arrêté${NC}"
}

# Commande restart
cmd_restart() {
    echo -e "${BLUE}🔄 Redémarrage de N8N...${NC}"
    docker-compose restart
    sleep 3
    if is_running; then
        echo -e "${GREEN}✅ N8N a redémarré${NC}"
    else
        echo -e "${RED}❌ Échec du redémarrage${NC}"
    fi
}

# Commande status
cmd_status() {
    echo -e "${BLUE}📊 Statut de N8N:${NC}"
    docker-compose ps
    echo ""
    if is_running; then
        echo -e "${GREEN}✅ N8N est en cours d'exécution${NC}"
        echo -e "${YELLOW}🌐 URL: http://localhost:5678${NC}"
    else
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
    fi
}

# Commande logs
cmd_logs() {
    echo -e "${BLUE}📋 Logs de N8N (Ctrl+C pour quitter):${NC}"
    docker-compose logs -f
}

# Commande shell
cmd_shell() {
    if ! is_running; then
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
        exit 1
    fi
    echo -e "${BLUE}🐚 Accès au terminal N8N...${NC}"
    docker exec -it n8n /bin/sh
}

# Commande exec
cmd_exec() {
    if ! is_running; then
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
        exit 1
    fi
    echo -e "${BLUE}⚡ Exécution: $@${NC}"
    docker exec -it n8n "$@"
}

# Commande list
cmd_list() {
    if ! is_running; then
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
        exit 1
    fi
    echo -e "${BLUE}📋 Liste des workflows:${NC}"
    docker exec -it n8n n8n list:workflow
}

# Commande export
cmd_export() {
    if ! is_running; then
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
        exit 1
    fi
    echo -e "${BLUE}💾 Export des workflows...${NC}"
    mkdir -p workflows
    docker exec -it n8n n8n export:workflow --all --output=/workflows/
    echo -e "${GREEN}✅ Workflows exportés dans ./workflows/${NC}"
}

# Commande import
cmd_import() {
    if ! is_running; then
        echo -e "${RED}❌ N8N n'est pas en cours d'exécution${NC}"
        echo "Démarrez-le avec: ./n8n-cli.sh start"
        exit 1
    fi
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Veuillez spécifier un fichier à importer${NC}"
        echo "Usage: ./n8n-cli.sh import <fichier>"
        exit 1
    fi
    echo -e "${BLUE}📥 Import du workflow: $1${NC}"
    docker exec -it n8n n8n import:workflow --input="$1"
    echo -e "${GREEN}✅ Workflow importé${NC}"
}

# Commande backup
cmd_backup() {
    echo -e "${BLUE}💾 Création d'une sauvegarde...${NC}"
    BACKUP_FILE="n8n-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    docker run --rm -v n8n_data:/data -v $(pwd):/backup ubuntu tar czf /backup/$BACKUP_FILE /data
    echo -e "${GREEN}✅ Sauvegarde créée: $BACKUP_FILE${NC}"
}

# Parser les arguments
case "$1" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    shell)
        cmd_shell
        ;;
    exec)
        shift
        cmd_exec "$@"
        ;;
    list)
        cmd_list
        ;;
    export)
        cmd_export
        ;;
    import)
        shift
        cmd_import "$@"
        ;;
    backup)
        cmd_backup
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Commande inconnue: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
