-- Script SQL pour mettre à jour la contrainte CHECK de la colonne statut
-- À exécuter manuellement avec les droits administrateur

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE adhesions DROP CONSTRAINT IF EXISTS adhesions_statut_check;

-- Ajouter la nouvelle contrainte CHECK avec tous les statuts possibles
ALTER TABLE adhesions ADD CONSTRAINT adhesions_statut_check 
  CHECK (statut IN ('actif', 'expire', 'renouvele', 'inactif', 'suspendu', 'banni', 'a_generer'));

