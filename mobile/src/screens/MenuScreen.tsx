import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { menuApi } from '../services/api';

const MenuScreen = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['menu', 'jour'],
    queryFn: () => menuApi.jour().then((res) => res.data),
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
        <Text>Aucun menu disponible pour aujourd'hui</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Menu du jour</Text>
      <Text style={styles.date}>
        {new Date(data.data.date_menu).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>
      {data.data.plats?.map((plat: any) => (
        <View key={plat.id} style={styles.plat}>
          <Text style={styles.platNom}>{plat.nom}</Text>
          {plat.description && <Text style={styles.platDescription}>{plat.description}</Text>}
          <Text style={styles.platPrix}>{plat.prix} €</Text>
          {!plat.disponible && <Text style={styles.epuise}>Épuisé</Text>}
        </View>
      ))}
    </ScrollView>
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
    marginBottom: 10,
    color: '#2c3e50',
  },
  date: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  plat: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  platNom: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  platDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  platPrix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  epuise: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default MenuScreen;

