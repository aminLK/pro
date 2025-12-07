#!/bin/bash

# Script de démarrage N8N
echo "🚀 Démarrage de N8N..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé."
    echo "📦 Installation de Docker..."
    echo ""
    echo "Veuillez installer Docker avec la commande appropriée pour votre système:"
    echo "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install docker.io docker-compose"
    echo "  Fedora: sudo dnf install docker docker-compose"
    echo "  Arch: sudo pacman -S docker docker-compose"
    exit 1
fi

# Vérifier si docker-compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose n'est pas installé."
    echo "📦 Veuillez installer docker-compose"
    exit 1
fi

# Créer les répertoires nécessaires
mkdir -p workflows credentials

# Démarrer N8N
echo "📡 Lancement du conteneur N8N..."
docker-compose up -d

# Attendre que N8N démarre
echo "⏳ Attente du démarrage de N8N..."
sleep 5

# Afficher les logs
echo ""
echo "✅ N8N est démarré !"
echo ""
echo "🌐 Accédez à N8N sur: http://localhost:5678"
echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: docker-compose logs -f"
echo "  - Arrêter N8N: docker-compose down"
echo "  - Redémarrer N8N: docker-compose restart"
echo "  - Accéder au terminal du conteneur: docker exec -it n8n /bin/sh"
echo ""
echo "💾 Vos workflows seront sauvegardés dans: ./workflows"
echo "🔐 Vos credentials seront sauvegardés dans: ./credentials"
echo ""

# Afficher les logs en temps réel
docker-compose logs -f
