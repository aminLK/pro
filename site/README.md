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

## 🏢 Espace Pro — Cockpit SaaS (`site/app/`)

Un véritable back-office de gestion de flotte, pensé pour un **pitch aux assureurs**.
Accessible depuis le lien « Espace Pro » du site, ou directement sur `app/index.html`.

- **Tableau de bord** : CA mensuel, taux d'occupation, locations actives, ratio S/P — graphiques animés (canvas, sans dépendance).
- **Flotte** : 120 véhicules, recherche + filtres (catégorie, statut), occupation et **score de risque** par véhicule.
- **Réservations** : suivi des locations (confirmée / en cours / terminée), recherche et filtres.
- **Assurance & Risque** ★ : la pièce maîtresse — sinistralité, ratio S/P, scoring **télématique**
  de conduite, jauge de risque flotte, véhicules à surveiller et **économie de prime estimée**.
- **Simulateur de prime** ★ : curseurs (taille de flotte, valeur, score conducteur, franchise, télématique)
  → prime annuelle recalculée **en direct**, décomposition des remises et économie estimée.
- **Carte d'activité** : l'Hexagone stylisé avec bulles par ville (flotte, locations, sinistres), survol interactif.
- **Rapport assureur** : dossier de souscription auto-généré, exportable en PDF (impression navigateur).

Accès protégé par un **écran de connexion** (`app/login.html`, démo : identifiants pré-remplis).

Moteur de graphiques maison (`app/js/charts.js`) : courbes, barres, donut, jauge, sparkline —
haute résolution (devicePixelRatio), animés, responsive, **zéro CDN**.

## 📁 Structure

```
site/
├── index.html              # Site vitrine
├── css/style.css           # Design system vitrine
├── js/
│   ├── data.js             # Flotte + options d'assurance
│   └── app.js              # Filtres, modale, calcul de prix, validation
└── app/                    # ── Espace Pro (SaaS) ──
    ├── index.html          # Shell du back-office
    ├── css/dashboard.css   # UI du cockpit
    └── js/
        ├── charts.js       # Moteur de graphiques canvas
        ├── dashboard-data.js # Données métier (flotte, sinistres, télématique)
        └── dashboard.js    # Vues, navigation, filtres, rapport
```

## 🎨 Personnalisation

- **Couleurs / thème** : variables CSS en haut de `css/style.css` (`:root`).
- **Véhicules** : éditez le tableau `VELORAH_CARS` dans `js/data.js`.
- **Options d'assurance** : tableau `VELORAH_OPTIONS` dans `js/data.js`.

Les photos des véhicules sont chargées depuis Unsplash (CDN). Pour un usage en
production, remplacez les URLs `img` par vos propres visuels dans `site/assets/`.
