# Fleet Navira — Mobilité de remplacement en moins de 24 h

> **Confidentiel — Tous droits réservés.** Voir `LICENSE` (licence propriétaire).

Plateforme qui connecte **assurances, concessionnaires et particuliers** pour
**débloquer un véhicule de remplacement en moins de 24-48 h** lors d'un sinistre.
Tous types confondus — **VL, VUL, PL et médical (ambulances / VSL)**, électrique ou
thermique, toutes gammes — y compris des cas transport (besoin de **plusieurs camions**,
remplacement d'un véhicule **non conforme aux normes**). Tracking du **kilomètre**, du
**produit** et du **sinistre**, de la déclaration à la restitution.

HTML / CSS / JavaScript natif — aucune dépendance, aucun build. **Fonctionne 100% en local et hors-ligne.**

## 🤖 Moteur de matching « Hubert » (`app/js/match.js`)

Algorithme déterministe qui, pour un sinistre donné :
1. vérifie l'**éligibilité du contrat** (droit au véhicule de courtoisie) ;
2. filtre par **gabarit** (VL/VUL/PL/Médical) et **quantité** disponible (ex. 2 camions) ;
3. classe les solutions par **proximité géographique (Haversine) + délai + marque du contrat + énergie**.

Exemple : sinistre Renault à **Tourcoing** → *Renault Tourcoing (0 km)* l'emporte sur *Renault Roubaix (4 km)*.
Les **pondérations sont réglables en direct** depuis le cockpit (panneau « Réglages du moteur »).

## 🔐 Conformité & protection

- **RGPD by design** : minimisation, consentement (bandeau), droits, données de santé (HDS), sécurité — section dédiée sur le site.
- **Licence propriétaire** (`LICENSE`) : code confidentiel, tous droits réservés, aucune réutilisation sans accord écrit.

## 🧭 Les 3 espaces

- **🛡 Assurance** — déclarer un sinistre et **débloquer une solution en 1 clic**,
  avec sourcing automatique chez les concessionnaires et **compte à rebours SLA** 24/48 h.
- **👤 Particuliers** — mettre son véhicule à disposition des assurances et être rémunéré.
- **🔁 Marketplace inversé** — **enchères urgentes** : un besoin est posté, concessionnaires
  et particuliers enchérissent (prix + délai), la meilleure offre l'emporte avant l'échéance.

## ✨ Site vitrine (`site/`)

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

Le cockpit qui orchestre toute la plateforme, pensé pour la **démonstration aux assureurs**.
Accessible via « Espace Pro » du site, ou directement sur `app/login.html`.

- **Tableau de bord** : sinistres ouverts, **délai moyen de déblocage**, % résolus < 24 h, véhicules mobilisables — graphiques animés (canvas, sans dépendance).
- **Sinistres · 1 clic** ★ : déclaration d'un sinistre, **moteur de matching « Hubert »** (`app/js/match.js`)
  qui vérifie l'**éligibilité du contrat** (droit au véhicule de courtoisie) puis classe les solutions par
  **proximité géographique (Haversine) + délai + marque du contrat** — ex. un sinistre Renault à Tourcoing
  retient *Renault Tourcoing (0 km)* avant *Renault Roubaix (4 km)*. Pipeline (Déclaré → Solution → Mobilisé → Livré),
  **compte à rebours SLA live** et **parcours complet jusqu'à la livraison**.
- **Concessionnaires** : pool de sourcing VL / PL, stock par énergie et délais de mise à disposition.
- **Véhicules à dispo** : espace particuliers (revenus reversés, notes, missions).
- **Enchères urgentes** ★ : marketplace inversé — besoins postés, offres prix + délai, **flux d'enchères en temps réel** (les offres tombent automatiquement, notifications, pause/reprise), meilleure offre surlignée, attribution.
- **Carte temps réel** ★ : Hexagone projeté (lat/lon → SVG), concessions, sinistres en attente et **livraisons en transit** animées (convois), avec **ETA de livraison en direct** par dossier.
- **Maintenance & photos** ★ : fiche d'inspection par véhicule — **upload de photos** (chauffeur), **état des pièces** (disques, plaquettes, pneus, niveaux…) renseigné par le **mécanicien**, kilométrage, commentaire, horodatage.
- **Logistique conseiller** : au déblocage, le parcours affiche le **point de départ (concession) → livraison (sinistre)** avec distance et ETA, pour piloter l'acheminement.
- **Flotte & tracking** : 120 véhicules, recherche + filtres, kilométrage, occupation et **score de risque**.
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

Les visuels (véhicules, hero) sont des **illustrations SVG locales** dans `site/assets/`,
garantissant un rendu **100% hors-ligne**. Pour des photos réelles, remplacez ces fichiers
ou réaffectez les chemins `img` dans `js/data.js`.
