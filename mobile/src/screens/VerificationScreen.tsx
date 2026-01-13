import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { verificationApi } from '../services/api';

const VerificationScreen = () => {
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState<'nom' | 'email' | 'numero_carte'>('nom');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['verification', search, searchType],
    queryFn: () => {
      const params: any = {};
      params[searchType] = search;
      return verificationApi.check(params).then((res) => res.data);
    },
    enabled: false,
  });

  const handleSearch = () => {
    if (!search.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un critère de recherche');
      return;
    }
    refetch();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vérification d'adhésion</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Rechercher par ${searchType === 'nom' ? 'nom' : searchType === 'email' ? 'email' : 'numéro de carte'}`}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Rechercher</Text>
        </TouchableOpacity>
      </View>
      {isLoading && <Text>Recherche en cours...</Text>}
      {data && (
        <View style={styles.result}>
          {data.found ? (
            <>
              <Text style={styles.resultTitle}>
                {data.valid ? '✅ Adhésion valide' : '❌ Adhésion expirée'}
              </Text>
              <Text>Nom: {data.data.nom} {data.data.prenom}</Text>
              <Text>Email: {data.data.email}</Text>
              <Text>Date: {new Date(data.data.date_adhesion).toLocaleDateString('fr-FR')}</Text>
            </>
          ) : (
            <Text>Aucun adhérent trouvé</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  searchContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
  },
  searchButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  result: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default VerificationScreen;

