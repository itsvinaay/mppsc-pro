import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

export default function TestManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tests] = useState([
    {
      id: '1',
      title: 'MPPSC Prelims Mock Test 2024',
      type: 'Mock Test',
      questions: 100,
      duration: '2 hours',
      participants: 150,
      avgScore: 68,
      status: 'active',
      date: '25 Dec 2023'
    },
    {
      id: '2',
      title: 'Indian History Quiz',
      type: 'Subject Test',
      questions: 50,
      duration: '1 hour',
      participants: 200,
      avgScore: 72,
      status: 'scheduled',
      date: '20 Dec 2023'
    },
    {
      id: '3',
      title: 'Geography Practice Test',
      type: 'Practice',
      questions: 75,
      duration: '90 mins',
      participants: 120,
      avgScore: 65,
      status: 'completed',
      date: '15 Dec 2023'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'scheduled': return { bg: '#E3F2FD', text: '#1976D2' };
      case 'completed': return { bg: '#F5F5F5', text: '#616161' };
      default: return { bg: '#FFF3E0', text: '#E65100' };
    }
  };

  const renderTest = ({ item }) => {
    const statusColors = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.testCard}
        onPress={() => router.push(`/admin/tests/${item.id}`)}
      >
        <View style={styles.testHeader}>
          <View style={styles.testIcon}>
            <Ionicons name="document-text" size={24} color="#1976D2" />
          </View>
          <View style={styles.testInfo}>
            <Text style={styles.testTitle}>{item.title}</Text>
            <Text style={styles.testType}>{item.type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.testStats}>
          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={16} color="#666" />
            <Text style={styles.statText}>{item.questions} questions</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.statText}>{item.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.statText}>{item.participants} students</Text>
          </View>
        </View>

        <View style={styles.testFooter}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Avg. Score:</Text>
            <Text style={styles.scoreValue}>{item.avgScore}%</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Test Date:</Text>
            <Text style={styles.dateValue}>{item.date}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Management</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tests..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={tests}
        renderItem={renderTest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testInfo: {
    flex: 1,
    marginLeft: 15,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testType: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  testFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  editButton: {
    padding: 5,
  },
});