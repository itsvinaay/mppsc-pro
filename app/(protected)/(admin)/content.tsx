import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

export default function ContentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contents] = useState([
    {
      id: '1',
      title: 'Modern Indian History Notes',
      type: 'PDF',
      size: '15 MB',
      downloads: '1.2K',
      lastUpdated: '2 days ago',
      category: 'History'
    },
    {
      id: '2',
      title: 'Indian Constitution Lecture Series',
      type: 'Video',
      size: '250 MB',
      downloads: '850',
      lastUpdated: '1 week ago',
      category: 'Polity'
    },
    {
      id: '3',
      title: 'Economics MCQ Bank',
      type: 'Document',
      size: '8 MB',
      downloads: '950',
      lastUpdated: '3 days ago',
      category: 'Economics'
    }
  ]);

  const renderContentItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.contentCard}
      onPress={() => router.push(`/admin/content/${item.id}`)}
    >
      <View style={styles.contentHeader}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={item.type === 'PDF' ? 'document-text' : item.type === 'Video' ? 'videocam' : 'document'} 
            size={24} 
            color="#007AFF" 
          />
          <View style={styles.titleInfo}>
            <Text style={styles.contentTitle}>{item.title}</Text>
            <Text style={styles.contentCategory}>{item.category}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentStats}>
        <View style={styles.stat}>
          <Ionicons name="cloud-download" size={16} color="#666" />
          <Text style={styles.statText}>{item.downloads}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="disc" size={16} color="#666" />
          <Text style={styles.statText}>{item.size}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.statText}>{item.lastUpdated}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Management</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search content..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.contentList}>
        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
            <Text style={styles.activeFilterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>PDFs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Documents</Text>
          </TouchableOpacity>
        </View>

        {contents.map(renderContentItem)}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  contentList: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleInfo: {
    marginLeft: 15,
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  },
  contentStats: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
});