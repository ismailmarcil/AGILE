# Documentation Technique (Sprint 1)

## 1. Introduction

Ce projet constitue la base du système de gestion de livraisons développé dans le cadre du projet AGILE.
L’objectif actuel est de :

* Charger un plan de ville au format XML.
* Visualiser ce plan dans le frontend via Leaflet.
* Afficher également une tournée d’exemple.
* Mettre en place un backend avec les classes métier.
* Fournir un environnement de tests automatisés.

Le système est séparé en deux parties :

1. Une partie "backend" contenant les classes métier.
2. Une partie "frontend" avec des pages de test et l’affichage Leaflet.

---

## 2. Architecture du projet

Arborescence simplifiée :

```
project-root/
│
├── backend/
│   ├── Node.js
│   ├── Segment.js
│   ├── Demand.js
│   ├── Courier.js
│   ├── TourPoint.js
│   ├── Tour.js
│   └── Plan.js
│
├── front/
│   ├── scripts/
│   │     ├── displayTour.js
│   │     └── displayPlan.js
│   │
│   ├── styles/
│   │     └── styles.css
│   │
│   ├── tests/
│   │     ├── server.js
│   │     ├── test_display_tour.html
│   │     └── test_display_plan.html
│   │
│   └── index.html
│
└── fichiersXMLPickupDelivery/
      └── petitPlan.xml
```

Points importants :

* Le backend n’est pas un serveur HTTP, il sert uniquement à charger et manipuler les données (Plan, Node, Segment, Tour, etc.).
* Le frontend de test utilise un petit serveur HTTP (server.js) pour servir les pages et les fichiers XML.
* Le dossier `fichiersXMLPickupDelivery` doit obligatoirement être à la racine du projet.

---

## 3. Backend (Node.js)

Le backend contient l’ensemble des classes métier nécessaires au fonctionnement du système :

* `Node` : représente un nœud du plan (intersection).
* `Segment` : représente un tronçon entre deux nœuds.
* `Plan` : charge un fichier XML et construit le graphe interne (Map de nœuds, liste de segments).
* `Demand`, `Courier`, `Tour`, `TourPoint` : seront utilisés pour la gestion des pickup/delivery.

### Chargement d’un plan XML

La méthode suivante dans `Plan.js` permet de charger un fichier XML :

```js
Plan.loadFromXML(filepath)
```

Elle retourne une instance de `Plan` contenant :

* `nodes` : Map<id, Node>
* `segments` : liste des tronçons
* `warehouse` : entrepôt (optionnel pour l’instant)

`toJSON()` permet de convertir un Plan en structure exploitable par le frontend.

---

## 4. Frontend (Leaflet)

Le frontend de test permet d’afficher :

* une tournée d’exemple (`test_display_tour.html`) ;
* un plan complet chargé depuis un fichier XML (`test_display_plan.html`).

Le mini serveur HTTP `server.js` :

* sert les fichiers HTML du dossier `front/tests` ;
* sert les scripts frontend ;
* sert les scripts backend utilisés dans le frontend ;
* sert le fichier XML depuis `fichiersXMLPickupDelivery`.

---

## 5. Affichage du plan (DisplayPlan)

Le fichier :

```
front/scripts/displayPlan.js
```

contient une classe Leaflet capable d’afficher :

* tous les nœuds du plan en tant que points ;
* tous les segments en tant que lignes ;
* un centrage automatique de la carte sur les données.

Le test correspondant :

```
front/tests/test_display_plan.html
```

Charge le fichier XML, le parse côté navigateur, reconstruit les objets Node et Segment, puis appelle :

```js
displayPlan.displayPlan(planJSON);
```

---

## 6. Affichage d’une tournée (DisplayTour)

Le fichier :

```
front/scripts/displayTour.js
```

permet d'afficher une tournée exemple avec :

* les nœuds du parcours ;
* les segments du trajet ;
* les points pickup/delivery.

La page de test :

```
front/tests/test_display_tour.html
```

sert à valider cet affichage de manière isolée.

---

## 7. Lancement du serveur de test

Pour lancer l’environnement de test Leaflet :

```
cd front/tests
node server.js
```

Ensuite ouvrir dans un navigateur :

* Test du plan :
  `http://localhost:8080/test_display_plan.html`

* Test d’une tournée :
  `http://localhost:8080/test_display_tour.html`

* Interface principale (non encore fonctionnelle) :
  `http://localhost:8080/index.html`

---

## 8. Tests unitaires

Un ensemble de tests unitaires existe pour chaque classe du backend :

```
TESTS/
   node.test.js
   segment.test.js
   plan.test.js
   demand.test.js
   tour.test.js
   ...
```

Chaque test exporte un objet `{ total, passed, failed }`.

Le script global :

```
runAllTests.js
```

exécute toutes les suites et génère un rapport complet. Exemple d’appel :

```
node runAllTests.js
```

Ce runner affiche :

* le nombre total de tests ;
* le nombre de succès / erreurs ;
* un récapitulatif par module.

---
