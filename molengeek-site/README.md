# Site MolenGeek

Site vitrine statique (HTML / CSS / JavaScript, sans dépendance ni build) présentant
l'écosystème MolenGeek : école, coworking, incubateur et événements.

> ⚠️ **Projet de démonstration.** Ce site n'est pas le site officiel de MolenGeek et
> n'est affilié à aucune organisation. Les textes, chiffres, tarifs et coordonnées
> sont des contenus d'exemple : ils doivent être remplacés par les informations
> réelles — et validés avec l'organisation — avant toute mise en ligne publique.

## Lancer le site

Aucun outil n'est nécessaire : ouvrez `index.html` dans un navigateur.

Pour un rendu identique à la production (chemins relatifs, service worker éventuel) :

```bash
cd molengeek-site
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Structure

```
molengeek-site/
├── index.html          # Accueil : hero, chiffres, piliers, formations, agenda, témoignages
├── formations.html     # Catalogue filtrable + processus d'admission + formulaire de candidature
├── coworking.html      # Espace, formules tarifaires, incubateur, projets accompagnés
├── evenements.html     # Agenda filtrable + actualités
├── a-propos.html       # Mission, histoire, impact, équipe, partenaires
├── contact.html        # Formulaire, coordonnées, FAQ
├── hackathon.html      # Landing d'événement autonome (thème sombre, style « event »)
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css   # Design system du site (tokens, composants, responsive, thème sombre)
    ├── css/event.css   # Design autonome de la landing événement
    ├── js/main.js      # Thème, navigation, révélations, compteurs, filtres, validation
    ├── js/event.js     # Compte à rebours, agenda à onglets, marquee, barre collante
    └── img/            # Logo et favicon (SVG)
```

Chaque page est autonome : l'en-tête et le pied de page sont dupliqués dans le HTML,
ce qui évite tout build et garde le site fonctionnel sans JavaScript.

## Fonctionnalités

| Fonctionnalité | Où | Détail |
|---|---|---|
| Thème clair / sombre | toutes les pages | Suit la préférence système, bouton dans l'en-tête, choix mémorisé en `localStorage` |
| Navigation mobile | toutes les pages | Menu plein écran, fermeture au clic ou avec `Échap`, `aria-expanded` géré |
| Lien actif | toutes les pages | Déduit de l'URL, exposé via `aria-current="page"` |
| Apparition au scroll | toutes les pages | `IntersectionObserver`, désactivée si `prefers-reduced-motion` |
| Compteurs animés | accueil, à propos | Attribut `data-count`, formatage `fr-BE` |
| Filtres | formations, événements | Générique : `data-filter-for` + `data-category`, état vide géré |
| Validation de formulaire | formations, contact | Messages en français, `aria-invalid`, focus sur le premier champ fautif |

## La landing événement (`hackathon.html`)

Page autonome au style volontairement différent du reste du site : thème sombre
permanent, typographie display surdimensionnée, halos colorés et grain. Elle ne
partage ni `style.css` ni `main.js` — tout est dans `event.css` et `event.js`,
sous le préfixe `.ev` — on peut donc la retravailler sans aucun risque pour les
six autres pages.

Ce qu'elle contient : navigation flottante en pilule, compte à rebours en direct,
bandeau de partenaires défilant, grille bento, programme sur trois jours en
onglets (pattern ARIA `tablist`, navigation aux flèches), grille de mentors,
trois formules d'inscription, FAQ en accordéon et barre d'inscription collante
sur mobile.

**Le compte à rebours ne périme jamais.** Plutôt qu'une date figée, il vise le
dernier vendredi du mois choisi, et bascule automatiquement sur l'année suivante
une fois la date passée :

```html
<div data-countdown data-target-month="9" data-target-weekday="5" data-target-hour="18">
  <span data-unit="days">00</span> <span data-unit="hours">00</span>
  <span data-unit="minutes">00</span> <span data-unit="seconds">00</span>
</div>
```

`data-target-weekday` suit la convention JavaScript (0 = dimanche, 5 = vendredi).
L'élément portant `data-countdown-date` reçoit la date complète en toutes lettres.
Pour une date fixe et définitive, remplacez `nextOccurrence()` dans `event.js` par
un `new Date(...)` explicite.

### Ajouter un filtre

La barre de filtres et sa cible sont reliées par un identifiant :

```html
<div class="filters" data-filter-for="courses">
  <button class="filter-btn" data-filter="all" aria-pressed="true">Tout</button>
  <button class="filter-btn" data-filter="web" aria-pressed="false">Développement</button>
</div>

<div class="grid grid--3" id="courses">
  <article class="card" data-category="web soirée">…</article>
</div>

<p class="empty-state" data-empty-for="courses" hidden>Aucun résultat.</p>
```

Un élément peut appartenir à plusieurs catégories (séparées par des espaces).

## Personnalisation

Les couleurs, la typographie et les espacements sont centralisés en haut de
`assets/css/style.css` :

```css
:root {
  --brand: #ff6a13;   /* orange principal */
  --accent: #ffb100;  /* jaune d'accent */
  --container: 1180px;
}
```

Le thème sombre redéfinit ces mêmes variables plus bas dans le fichier — modifier
un token suffit donc à propager le changement sur tout le site.

## Ce qu'il reste à brancher

- [ ] Remplacer les contenus d'exemple par les textes, chiffres et tarifs réels
- [ ] Ajouter les vraies photos (les blocs `.media-frame` servent de réserves)
- [ ] Renseigner les partenaires et leurs logos, avec leur accord
- [ ] Compléter les liens sociaux du pied de page (actuellement `href="#"`)
- [ ] Brancher les formulaires à un back-end ou à un service tiers (Formspree, Netlify Forms, API maison)
- [ ] Intégrer une carte dans `contact.html` (bloc `.map-frame`), en tenant compte du RGPD
- [ ] Mettre à jour `sitemap.xml` avec le domaine définitif
- [ ] Ajouter les pages légales : mentions légales, politique de confidentialité, cookies

## Accessibilité & performances

- HTML sémantique, lien d'évitement, contrastes conformes AA sur les deux thèmes
- Navigation clavier complète et `:focus-visible` visible partout
- Animations désactivées avec `prefers-reduced-motion`
- Aucune bibliothèque tierce : seule la feuille Google Fonts est chargée depuis
  l'extérieur (le site reste lisible avec les polices système si elle est bloquée)
