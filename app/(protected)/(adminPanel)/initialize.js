import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { initializeTestData } from '../../../services/testService';
import { testConnection } from '../../../config/firebase';
import { useRouter } from 'expo-router';

export default function InitializeData() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleInitialize = async () => {
    try {
      setLoading(true);
      setStatus('Testing Firebase connection...');
      
      // Test Firebase connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        Alert.alert('Error', 'Could not connect to Firebase');
        return;
      }

      setStatus('Initializing data...');
      await initializeTestData();
      
      Alert.alert(
        'Success',
        'Test data initialized successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert(
        'Error',
        'Failed to initialize data: ' + (error.message || 'Unknown error')
      );
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <View style={styles.container}>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleInitialize}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Initializing...' : 'Initialize Test Data'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#3457D5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    marginBottom: 20,
    color: '#666',
    fontSize: 16,
  },
}); 