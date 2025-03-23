import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

export default function CourseManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses] = useState([
    {
      id: '1',
      title: 'Indian History',
      instructor: 'Dr. Rajesh Kumar',
      students: 250,
      lessons: 24,
      duration: '32 hours',
      status: 'active',
      lastUpdated: '20 Nov 2023'
    },
    {
      id: '2',
      title: 'Indian Polity',
      instructor: 'Prof. Meena Sharma',
      students: 180,
      lessons: 18,
      duration: '28 hours',
      status: 'draft',
      lastUpdated: '18 Nov 2023'
    },
    {
      id: '3',
      title: 'Geography',
      instructor: 'Dr. Amit Verma',
      students: 200,
      lessons: 20,
      duration: '30 hours',
      status: 'active',
      lastUpdated: '15 Nov 2023'
    }
  ]);

  const renderCourse = ({ item }) => (
    <TouchableOpacity 
      style={styles.courseCard}
      onPress={() => router.push(`/admin/courses/${item.id}`)}
    >
      <View style={styles.courseHeader}>
        <View style={styles.courseIcon}>
          <Ionicons name="book" size={24} color="#1976D2" />
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{item.title}</Text>
          <Text style={styles.instructorName}>{item.instructor}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#E8F5E9' : '#FFF3E0' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'active' ? '#2E7D32' : '#E65100' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.courseStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.statText}>{item.students} students</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="list" size={16} color="#666" />
          <Text style={styles.statText}>{item.lessons} lessons</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.statText}>{item.duration}</Text>
        </View>
      </View>
      
      <View style={styles.courseFooter}>
        <Text style={styles.lastUpdated}>Last updated: {item.lastUpdated}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Management</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={courses}
        renderItem={renderCourse}
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
  courseCard: {
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
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
    marginLeft: 15,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructorName: {
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
  courseStats: {
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
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    padding: 5,
  },
});