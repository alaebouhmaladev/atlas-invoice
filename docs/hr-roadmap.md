# Feuille de route du module Ressources Humaines (RH)

Ce document présente l’architecture fonctionnelle et la planification des 8 phases du module **Ressources Humaines (RH)** d’**Atlas Bites CRM & Facturation**.

---

## Vue d’ensemble des 8 phases

```text
- [x] Phase 1 — HR foundation, security and employee records [COMPLETED]
- [ ] Phase 2 — Sites, departments, positions, contracts and documents [PLANIFIÉ]
- [ ] Phase 3 — Schedules, shifts and staffing coverage [PLANIFIÉ]
- [ ] Phase 4 — Attendance, time clock and worked-hour validation [PLANIFIÉ]
- [ ] Phase 5 — Leave, absences and approval workflows [PLANIFIÉ]
- [ ] Phase 6 — Payroll, salary calculations and payslip PDFs [PLANIFIÉ]
- [ ] Phase 7 — Employee self-service portal and manager approvals [PLANIFIÉ]
- [ ] Phase 8 — HR dashboard, reporting, security audit and final production validation [PLANIFIÉ]
```

---

* **Statut** : **En cours d’implémentation**
* **Objectif** : Créer le socle RH sécurisé permettant la gestion complète des collaborateurs (CRUD), la séparation stricte entre compte Utilisateur et Fiche Employé, le chiffrement/masquage des données sensibles et la traçabilité immuable.
* **Entités principales** : `Employee`, `EmploymentStatus`, `Gender`, `AuditLog`, `AppNotification`.
* **Flux principaux** :
  - Création d’employé avec génération automatique du matricule (`EMP-YYYY-0001`).
  - Consultation, recherche multi-critères, filtrage et pagination de l'annuaire RH.
  - Déclarations et modifications de fiche avec contrôle de concurrence optimiste (`version`).
  - Archivage et restauration guidés par confirmation explicite (`ARCHIVER EMP-2026-0001`).
  - Liage/déliage optionnel et étanche avec un compte utilisateur `User`.
* **Permissions RH** : `hr.employee.list`, `hr.employee.read`, `hr.employee.create`, `hr.employee.update`, `hr.employee.archive`, `hr.employee.restore`, `hr.employee.view_sensitive`, `hr.employee.manage_salary`, `hr.employee.link_user`.
* **Considérations de sécurité** :
  - Chiffrement AES-256-GCM applicatif du CIN, RIB et numéro CNSS.
  - Empreinte HMAC-SHA256 pour l'unicité du CIN sans stockage en clair.
  - Absence totale de données sensibles dans les logs, Toasts et URLs.
* **Critères d’acceptation** : Annuaire fonctionnel, tests d'isolation multi-tenant validés, masquage des champs sensibles, pas de calcul de paie ni de gestion de congés.

---

## Phase 2: Sites, Départements, Postes, Contrats et Gestion Documentaire (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Structurer l'organisation RH par sites géographiques, départements et postes, et gérer le cycle de vie des contrats de travail et des documents administratifs.
* **Entités principales** : `Site`, `Department`, `Position`, `Contract` (CDI, CDD, Anaprec, Intérim), `EmployeeDocument`.
* **Flux principaux** :
  - Affectation des employés à un site/département.
  - Suivi des périodes d'essai et renouvellements de contrats.
  - Coffre-fort documentaire employé avec téléversement et contrôle des pièces (CIN, CNSS, Diplômes).
* **Dépendances** : Phase 1.

---

## Phase 3: Plannings, Équipes et Couverture de Personnel (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Gérer les plannings de travail, les roulements d'équipes et s'assurer de la couverture minimale des sites et événements traiteur.
* **Entités principales** : `ShiftTemplate`, `EmployeeSchedule`, `StaffingRequirement`.
* **Flux principaux** :
  - Modèles de plannings hebdomadaires et mensuels.
  - Affectation des équipes sur les événements traiteur et sites opérationnels.
  - Alertes de sous-effectif.
* **Dépendances** : Phase 2.

---

## Phase 4: Pointage, Présences et Validation des Heures Travaillées (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Enregistrer le pointage effectif, calculer les heures travaillées, les heures supplémentaires et valider les feuilles de temps.
* **Entités principales** : `TimeClockEntry`, `Timesheet`, `OvertimeRule`.
* **Flux principaux** :
  - Pointage d'entrée/sortie.
  - Calcul automatique des heures normales et majorées (heures de nuit/dimanche).
  - Validation hiérarchique des feuilles de temps mensuelles.
* **Dépendances** : Phase 3.

---

## Phase 5: Congés, Absences et Workflows de Validation (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Gérer le solde des congés payés, les demandes d'absences, les arrêts maladie et les circuits de validation.
* **Entités principales** : `LeaveBalance`, `LeaveRequest`, `AbsenceType`.
* **Flux principaux** :
  - Calcul et incrémentation des soldes de congés légaux.
  - Soumission de demandes de congés.
  - Circuit d’approbation par le manager RH / responsable de site.
* **Dépendances** : Phase 4.

---

## Phase 6: Paie, Calculs Salariaux et Génération des Bulletins PDF (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Calculer les éléments variables de paie, appliquer les cotisations sociales marocaines (CNSS, AMO, IR) et générer les bulletins de paie PDF conformes.
* **Entités principales** : `PayrollPeriod`, `Payslip`, `PayrollItem`, `TaxTable`.
* **Flux principaux** :
  - Import des heures validées et congés de la période.
  - Calcul du brut, cotisations CNSS/AMO, retenues d'impôts (IR) et net à payer.
  - Génération sécurisée des bulletins de paie PDF.
* **Dépendances** : Phase 4, Phase 5.

---

## Phase 7: Portail Libre-Service Employé et Approbations Managers (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Permettre aux collaborateurs d'accéder à leur espace personnel (consultation des bulletins, solde de congés, demande d'acompte) et aux managers d'approuver les demandes.
* **Entités principales** : Extensions du rôle `EMPLOYEE` et `MANAGER`.
* **Flux principaux** :
  - Connexion autonome de l'employé lié à son compte utilisateur.
  - Visualisation des plannings et téléchargement des bulletins de paie.
  - Interface d'approbation manager sur mobile/desktop.
* **Dépendances** : Phase 5, Phase 6.

---

## Phase 8: Tableau de Bord RH, Reporting, Audit de Sécurité et Recette Finale (Planned, not implemented)

* **Statut** : **Planifié (Non implémenté)**
* **Objectif** : Fournir des indicateurs RH avancés (masse salariale, taux de rotation, absentéisme), auditer la conformité globale et procéder à la validation finale de production.
* **Entités principales** : `HRAnalytics`, Audit global.
* **Flux principaux** :
  - Rapports statistiques et exports réglementaires.
  - Contrôle d'audit de sécurité automatisé.
  - Certification de mise en production.
* **Dépendances** : Phases 1 à 7.
