# 🚴‍♂️ DelivHub – Optimisation de tournées Pickup & Delivery

Projet réalisé dans le cadre du **Projet Longue Durée (PLD Agile)** à l’**INSA Lyon**.  
L’objectif est de concevoir une application permettant d’optimiser des tournées de livraison **Pickup & Delivery à vélo** en milieu urbain, à partir de plans et de demandes décrits en XML.

---

## 📌 Contexte du projet


L’application permet de :
- Charger un **plan de ville** (intersections + tronçons)
- Charger ou créer des **demandes de livraison**
- Répartir les demandes entre plusieurs **coursiers**
- Calculer des **tournées optimisées** respectant les contraintes Pickup → Delivery
- Visualiser les tournées sur une **carte interactive**
- Sauvegarder et restaurer les tournées

---

## 🧠 Fonctionnalités principales

### 📂 Chargement des données
- Chargement d’un **plan XML** (nœuds, segments, entrepôt)
- Chargement de **demandes XML** (pickup, delivery, durées)
- Validation automatique des fichiers (structure et cohérence)

### 🚚 Gestion des coursiers
- Création dynamique de coursiers
- Sélection multiple de coursiers
- Distribution automatique des demandes entre coursiers

### 🧮 Calcul des tournées
- Respect strict des contraintes de précédence (**Pickup avant Delivery**)
- Minimisation du temps total de tournée
- Vitesse constante : **15 km/h**
- Départ et retour à l’entrepôt à **08:00**
- Limite maximale d’une tournée : **8 heures**

### 🗺️ Visualisation
- Carte interactive via **Leaflet**
- Affichage des itinéraires réels (Dijkstra / A*)
- Timeline détaillée :
  - Étapes
  - Heures d’arrivée et de départ
  - Type d’étape (Warehouse, Pickup, Delivery)

### 💾 Sauvegarde & historique
- Sauvegarde des tournées en **JSON**
- Rechargement depuis le serveur
- Historique des tournées calculées

---

## 🏗️ Architecture du projet

Le projet suit une **architecture MVC** claire et modulaire.

### 🔹 Modèle (Backend logique – JavaScript)
Dossier `/backend/` :

- `Plan`, `Node`, `Segment` : représentation du graphe de la ville
- `Demand` : demande Pickup & Delivery
- `Courier` : coursier
- `Tour`, `TourPoint`, `Leg` : structure d’une tournée
- `ComputerTour` :
  - Calcul des plus courts chemins (Dijkstra / A*)
  - Résolution du TSP avec contraintes de précédence
- `System` :
  - Chargement des données
  - Distribution des demandes (K-means)
  - Calcul des tournées
  - Sauvegarde / restauration

### 🔹 Vue (Frontend)
Dossier `/front/` :

- Interface HTML / CSS
- Carte interactive Leaflet
- Timeline des tournées
- Sidebar de gestion (coursiers, demandes)

### 🔹 Contrôleur
- `app.js` : gestion des interactions utilisateur
- Coordination entre la vue et la logique métier

---

## 🧩 Algorithmes utilisés

### 🔸 Plus courts chemins
- **Dijkstra**
- **A*** (heuristique euclidienne)

### 🔸 Optimisation de tournée (TSP)
- Branch & Bound (petits ensembles)
- Heuristique Nearest Neighbor
- Amélioration locale (2-opt)
- Respect strict des contraintes Pickup → Delivery

### 🔸 Répartition multi-coursiers
- **K-means clustering**
- Chaque demande est atomique (pickup + delivery toujours ensemble)

---

## 🛠️ Technologies utilisées

- **JavaScript (ES6)**
- **HTML / CSS**
- **Leaflet**
- **Node.js**
- **XML / JSON**
- **Git**

---

## 🚀 Lancer le projet en local

### 1️⃣ Prérequis
- Node.js installé
- Navigateur moderne (Chrome, Firefox)

### 2️⃣ Lancer le serveur
```bash
node server.js
```
### 3️⃣ Ouvrir l’application

👉 http://localhost:8080

---
## 📁 Structure du projet

```bash
.
├── backend/
│   ├── demand.js
│   ├── node.js
│   ├── segment.js
│   ├── plan.js
│   ├── courier.js
│   ├── tourpoint.js
│   ├── leg.js
│   ├── tours.js
│   ├── computerTour.js
│   └── system.js
│
├── front/
│   ├── scripts/
│   │   ├── app.js
│   │   ├── view.js
│   │   └── geocoding.js
│   └── styles/
│       └── styles.css
│
├── index.html
├── server.js
└── README.md
```
---
## 🧪 Tests & robustesse
- Vérification systématique des fichiers XML
- Gestion des cas limites :
  - demandes invalides
  - nœuds hors plan
  - tournées impossibles
- Logs détaillés pour l’analyse des 

---
## 📈 Perspectives d’amélioration

- Contraintes horaires de livraison
- Capacité des coursiers
- Recalcul dynamique des tournées
- Algorithmes d’optimisation avancés
- Backend persistant (API REST)

---