# Feuille de route du module Ressources Humaines (RH)

Ce document présente l’architecture fonctionnelle et la planification des 8 phases du module **Ressources Humaines (RH)** d’**Atlas Bites CRM & Facturation**.

---

## Vue d’ensemble des 8 phases

```text
- [x] Phase 1 — HR foundation, security and employee records [COMPLETED]
- [x] Phase 2 — Sites, departments, positions, contracts and documents [COMPLETED]
- [x] Phase 3 — Schedules, shifts and staffing coverage [COMPLETED]
- [x] Phase 4 — Attendance, time clock and worked-hour validation [COMPLETED]
- [ ] Phase 5 — Leave, absences and approval workflows [PLANIFIÉ]
- [ ] Phase 6 — Payroll, salary calculations and payslip PDFs [PLANIFIÉ]
- [ ] Phase 7 — Employee self-service portal and manager approvals [PLANIFIÉ]
- [ ] Phase 8 — HR dashboard, reporting, security audit and final production validation [PLANIFIÉ]
```

---

## Phase 1: HR Foundation, Security & Employee Records

* **Statut** : **Complété**
* **Objectif** : Créer le socle RH sécurisé permettant la gestion complète des collaborateurs (CRUD), la séparation stricte entre compte Utilisateur et Fiche Employé, le chiffrement/masquage des données sensibles et la traçabilité immuable.

---

## Phase 2: Sites, Départements, Postes, Contrats et Gestion Documentaire

* **Statut** : **Complété**
* **Objectif** : Structurer l'organisation RH par sites géographiques, départements et postes, et gérer le cycle de vie des contrats de travail et des documents administratifs.

---

## Phase 3: Plannings, Équipes et Couverture de Personnel

* **Statut** : **Complété**
* **Objectif** : Gérer les plannings de travail, les roulements d'équipes, les affectations temporaires/permanentes et la couverture minimale de personnel.

---

## Phase 4: Pointage, Présences, Anomalies et Validation des Heures Travaillées

* **Statut** : **Complété & Recetté**
* **Objectif** : Enregistrer le pointage effectif (web et borne tablette), exécuter la machine d'état avec verrous transactionnels advisory lock, calculer les heures travaillées/pauses/retards/majorations, détecter automatiquement les anomalies, gérer les demandes de correction avec protection contre l'auto-approbation, et valider/verrouiller les périodes (`VERROUILLER POINTAGE`).

---

## Phase 5: Congés, Absences et Workflows de Validation (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Gérer le solde des congés payés, les demandes d'absences, les arrêts maladie et les circuits de validation.

---

## Phase 6: Paie, Calculs Salariaux et Génération des Bulletins PDF (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Calculer les éléments variables de paie, appliquer les cotisations sociales marocaines (CNSS, AMO, IR) et générer les bulletins de paie PDF conformes.

---

## Phase 7: Portail Libre-Service Employé et Approbations Managers (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Permettre aux collaborateurs d'accéder à leur espace personnel et aux managers d'approuver les demandes.

---

## Phase 8: Tableau de Bord RH, Reporting, Audit de Sécurité et Recette Finale (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Fournir des indicateurs RH avancés, auditer la conformité globale et procéder à la validation finale de production.
