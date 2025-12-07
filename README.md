# N8N - Configuration Terminal

Ce projet vous permet de lancer et utiliser N8N directement depuis votre terminal.

## 📋 Prérequis

- Docker
- Docker Compose

## 🚀 Installation rapide

### 1. Installer Docker (si pas déjà installé)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Fedora:**
```bash
sudo dnf install docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Arch Linux:**
```bash
sudo pacman -S docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

> ⚠️ Après avoir ajouté votre utilisateur au groupe docker, déconnectez-vous et reconnectez-vous pour que les changements prennent effet.

### 2. Démarrer N8N

```bash
./start-n8n.sh
```

Ou manuellement:
```bash
docker-compose up -d
```

## 🌐 Accès à N8N

Une fois démarré, accédez à N8N dans votre navigateur:

```
http://localhost:5678
```

## 📁 Structure du projet

```
pro/
├── docker-compose.yml    # Configuration Docker
├── start-n8n.sh         # Script de démarrage
├── workflows/           # Vos workflows N8N
└── credentials/         # Vos credentials (sensibles)
```

## 🎯 Commandes utiles

### Démarrer N8N
```bash
docker-compose up -d
```

### Voir les logs en temps réel
```bash
docker-compose logs -f
```

### Arrêter N8N
```bash
docker-compose down
```

### Redémarrer N8N
```bash
docker-compose restart
```

### Accéder au terminal du conteneur N8N
```bash
docker exec -it n8n /bin/sh
```

### Voir le statut
```bash
docker-compose ps
```

## 🔧 Utilisation de N8N CLI depuis le terminal

Une fois le conteneur lancé, vous pouvez utiliser la CLI N8N:

```bash
# Exécuter une commande N8N
docker exec -it n8n n8n --help

# Exporter un workflow
docker exec -it n8n n8n export:workflow --all --output=/workflows/

# Importer un workflow
docker exec -it n8n n8n import:workflow --input=/workflows/workflow.json

# Exporter les credentials
docker exec -it n8n n8n export:credentials --all --output=/credentials/

# Lister les workflows
docker exec -it n8n n8n list:workflow
```

## 🔐 Variables d'environnement

Les variables suivantes sont configurées dans `docker-compose.yml`:

- `N8N_HOST`: 0.0.0.0 (écoute sur toutes les interfaces)
- `N8N_PORT`: 5678 (port d'accès)
- `N8N_PROTOCOL`: http
- `WEBHOOK_URL`: http://localhost:5678/
- `GENERIC_TIMEZONE`: Europe/Paris
- `N8N_LOG_LEVEL`: info

Vous pouvez les modifier selon vos besoins.

## 💾 Sauvegarde des données

Toutes vos données N8N sont persistées dans un volume Docker nommé `n8n_data`.

Pour sauvegarder vos données:

```bash
# Créer un backup du volume
docker run --rm -v n8n_data:/data -v $(pwd):/backup ubuntu tar czf /backup/n8n-backup.tar.gz /data

# Restaurer depuis un backup
docker run --rm -v n8n_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/n8n-backup.tar.gz -C /
```

## 🛠️ Dépannage

### Le port 5678 est déjà utilisé

Modifiez le port dans `docker-compose.yml`:
```yaml
ports:
  - "8080:5678"  # Utilisera le port 8080 au lieu de 5678
```

### Permission denied avec Docker

Ajoutez votre utilisateur au groupe docker:
```bash
sudo usermod -aG docker $USER
```
Puis déconnectez-vous et reconnectez-vous.

### Les logs montrent des erreurs

Consultez les logs détaillés:
```bash
docker-compose logs -f n8n
```

## 📚 Ressources

- [Documentation N8N](https://docs.n8n.io/)
- [N8N Community](https://community.n8n.io/)
- [N8N GitHub](https://github.com/n8n-io/n8n)

## ⚡ Exemples d'utilisation

### Créer un workflow simple depuis le terminal

1. Accédez au terminal du conteneur:
```bash
docker exec -it n8n /bin/sh
```

2. Utilisez la CLI N8N pour gérer vos workflows

### Automatiser avec des scripts

Créez des scripts bash pour interagir avec N8N:

```bash
#!/bin/bash
# Exemple: Trigger un workflow via webhook
curl -X POST http://localhost:5678/webhook/your-webhook-id
```

Bon automatisation ! 🎉
