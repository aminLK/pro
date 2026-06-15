# Velorah — Site de location de voitures premium

Site dynamique de location de véhicules haut de gamme (marque **Velorah**).
HTML / CSS / JavaScript natif — aucune dépendance, aucun build.

## ✨ Fonctionnalités

- **Flotte filtrable** par catégorie (citadine, berline, SUV, sportive, luxe, électrique).
- **Moteur de réservation** : modale par véhicule, sélection des dates, choix du niveau
  d'assurance et **calcul du prix en temps réel** (jours × tarif + options + frais de service).
- **Validation de formulaire** (dates, e-mail, nom) et **confirmation** avec numéro de référence.
- Sauvegarde locale des réservations de démonstration (`localStorage`).
- Barre de recherche dans le hero, formulaire « être rappelé ».
- Animations au scroll, compteurs animés, header sticky, menu mobile, design responsive.
- Accessibilité : `aria-*`, focus, respect de `prefers-reduced-motion`.

## 🚀 Lancer le site

Aucune installation. Servez le dossier `site/` avec n'importe quel serveur statique :

```bash
# Python
cd site && python3 -m http.server 8080

# ou Node
npx serve site
```

Puis ouvrez http://localhost:8080

> Vous pouvez aussi ouvrir directement `site/index.html` dans le navigateur.

## 📁 Structure

```
site/
├── index.html        # Structure de la page
├── css/style.css     # Design system + composants
└── js/
    ├── data.js       # Données de la flotte + options d'assurance
    └── app.js        # Logique : filtres, modale, calcul de prix, validation
```

## 🎨 Personnalisation

- **Couleurs / thème** : variables CSS en haut de `css/style.css` (`:root`).
- **Véhicules** : éditez le tableau `VELORAH_CARS` dans `js/data.js`.
- **Options d'assurance** : tableau `VELORAH_OPTIONS` dans `js/data.js`.

Les photos des véhicules sont chargées depuis Unsplash (CDN). Pour un usage en
production, remplacez les URLs `img` par vos propres visuels dans `site/assets/`.
