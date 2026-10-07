# Cozy Clutter

Jeu d'objets cachés (HTML) emballé en application Android avec Capacitor.

## Tester dans le navigateur
`npm run web` : les pubs sont simulées (compte à rebours).

## Réglages du jeu
`www/game.js`, objet `CFG` : vies par niveau, indices gratuits, nombre de vies regagnables par pub, fréquence des pubs entre niveaux.
Chaque niveau peut avoir son propre `lives` dans `www/levels/levels.json`.

## Ajouter un niveau
1. Place `nom.webp` et `nom.json` (export de l'éditeur) dans `www/levels/`.
2. Ajoute une ligne dans `www/levels/levels.json`.

## Construire l'application Android
1. `npm install`
2. `npx cap add android` (une seule fois), puis `npm run sync` après chaque modification de `www/`.
3. Dans `capacitor.config.json`, remplace `appId` par ton identifiant définitif (impossible à changer après publication).
4. Dans `android/app/src/main/AndroidManifest.xml`, ajoute dans `<application>` :
   `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXXX~YYYY"/>`
   (en test, utilise l'identifiant d'application de test de Google).
5. `npm run open` ouvre Android Studio : Build > Generate Signed Bundle (AAB).

## Avant la publication
- Remplace les identifiants de test dans `www/ads.js` par tes vrais blocs d'annonces AdMob.
- Politique de confidentialité en ligne, formulaire de sécurité des données, déclaration des pubs sur le Play Console.
- Si le jeu s'adresse aussi aux enfants, les règles pubs sont différentes : à décider avant d'activer AdMob.
- `store/icon-512.png` est une icône provisoire.
