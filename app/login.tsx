import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../context/SessionContext';
import { useEffect } from 'react';

export default function Welcome() {
  const { user } = useSession();

  useEffect(() => {
    if (user) {
      router.replace('/(protected)/(tabs)/home');
    }
  }, [user]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleLogin = () => {
    router.push('/loginForm');
  };

  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.welcomeContent}>
        <Text style={styles.title}>Welcome to MPPSC Pro</Text>
        <Text style={styles.subtitle}>Your complete preparation companion</Text>
        
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  loginButton: {
    padding: 10,
  },
  loginText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  }
});