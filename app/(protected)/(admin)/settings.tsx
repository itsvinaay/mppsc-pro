import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminSettings() {
  const systemColorScheme = useColorScheme();
  const [selectedTheme, setSelectedTheme] = useState('system');

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setSelectedTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const handleThemeSelect = async (themeId) => {
    try {
      await AsyncStorage.setItem('theme', themeId);
      setSelectedTheme(themeId);
      
      // Apply the theme
      const effectiveTheme = themeId === 'system' ? systemColorScheme : themeId;
      // You can dispatch this to your theme context or state management
      console.log('Applied theme:', effectiveTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const themes = [
    {
      id: 'light',
      title: 'Light Theme',
      icon: 'sunny',
      description: 'Classic light appearance'
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      icon: 'moon',
      description: 'Easier on the eyes in low light'
    },
    {
      id: 'system',
      title: 'System Theme',
      icon: 'phone-portrait',
      description: 'Matches your device settings'
    }
  ];

  // Remove the second handleThemeSelect declaration that was here

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeContainer}>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeCard,
                selectedTheme === theme.id && styles.selectedTheme
              ]}
              onPress={() => handleThemeSelect(theme.id)}
            >
              <View style={styles.themeHeader}>
                <Ionicons 
                  name={theme.icon} 
                  size={24} 
                  color={selectedTheme === theme.id ? '#fff' : '#007AFF'} 
                />
                <View style={styles.radioButton}>
                  {selectedTheme === theme.id && <View style={styles.radioSelected} />}
                </View>
              </View>
              <Text style={[
                styles.themeTitle,
                selectedTheme === theme.id && styles.selectedText
              ]}>
                {theme.title}
              </Text>
              <Text style={[
                styles.themeDescription,
                selectedTheme === theme.id && styles.selectedText
              ]}>
                {theme.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  themeContainer: {
    gap: 15,
  },
  themeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTheme: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  themeDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedText: {
    color: '#fff',
  },
});