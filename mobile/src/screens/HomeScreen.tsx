import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const menuItems = [
    { screen: 'Verification', label: 'Vérification adhésion', roles: ['admin', 'benevole'] },
    { screen: 'Carte', label: 'Ma carte', roles: ['membre', 'admin', 'benevole'] },
    { screen: 'Menu', label: 'Menu du jour', roles: ['membre', 'admin', 'benevole'] },
  ].filter((item) => !item.roles || item.roles.includes(user?.role || ''));

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bienvenue {user?.prenom} {user?.nom}</Text>
      <Text style={styles.role}>Rôle: {user?.role}</Text>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen as never)}
        >
          <Text style={styles.menuText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  role: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  menuItem: {
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
  menuText: {
    fontSize: 18,
    color: '#2c3e50',
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

