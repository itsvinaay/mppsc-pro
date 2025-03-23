import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TestSeries from '../../../components/test-series/test-series';

export default function TestSeriesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
     

      <TestSeries isPaid={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});