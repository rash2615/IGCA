import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { cartesApi } from '../services/api';

const CarteScreen = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['carte', 'me'],
    queryFn: () => cartesApi.me().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!data?.data) {
    return (
      <View style={styles.container}>
        <Text>Aucune carte disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ma carte adhérent</Text>
      <View style={styles.card}>
        <Text style={styles.cardNumber}>{data.data.numero_carte}</Text>
        <Text style={styles.cardName}>{data.data.nom} {data.data.prenom}</Text>
        <Text style={styles.cardStatus}>Statut: {data.data.statut}</Text>
      </View>
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
  card: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#667eea',
  },
  cardName: {
    fontSize: 20,
    marginBottom: 10,
    color: '#2c3e50',
  },
  cardStatus: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default CarteScreen;

