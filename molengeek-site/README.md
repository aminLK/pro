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
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css   # Design system complet (tokens, composants, responsive, thème sombre)
    ├── js/main.js      # Thème, navigation, révélations, compteurs, filtres, validation
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
