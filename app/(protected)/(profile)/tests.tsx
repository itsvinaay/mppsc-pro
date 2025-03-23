import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { commonStyles, colors } from '../../../constants/styles';
import { appText } from '../../../constants/text';

export default function Tests() {
  const testCategories = [
    { id: 1, name: 'All Tests' },
    { id: 2, name: 'Daily Quiz' },
    { id: 3, name: 'Mock Tests' },
    { id: 4, name: 'Subject Tests' },
    { id: 5, name: 'Previous Year' },
  ];

  const upcomingTests = [
    {
      id: 1,
      title: 'Daily Current Affairs Quiz',
      questions: 20,
      duration: '20 minutes',
      date: 'Today',
      type: 'Daily Quiz'
    },
    {
      id: 2,
      title: 'MPPSC Full Mock Test',
      questions: 100,
      duration: '2 hours',
      date: 'Tomorrow',
      type: 'Mock Tests'
    },
    {
      id: 3,
      title: 'Indian History Test',
      questions: 50,
      duration: '1 hour',
      date: '25 Jun 2023',
      type: 'Subject Tests'
    }
  ];

  const completedTests = [
    {
      id: 4,
      title: 'Geography Test',
      questions: 50,
      duration: '1 hour',
      score: '42/50',
      percentage: 84,
      type: 'Subject Tests'
    },
    {
      id: 5,
      title: 'Previous Year MPPSC 2022',
      questions: 100,
      duration: '2 hours',
      score: '78/100',
      percentage: 78,
      type: 'Previous Year'
    }
  ];

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>{appText.menuItems.tests}</Text>
        <TouchableOpacity>
          <Ionicons name="filter" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {testCategories.map(category => (
            <TouchableOpacity 
              key={category.id} 
              style={[
                styles.categoryItem, 
                category.id === 1 && styles.activeCategoryItem
              ]}
            >
              <Text 
                style={[
                  styles.categoryText, 
                  category.id === 1 && styles.activeCategoryText
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Tests</Text>
          {upcomingTests.map(test => (
            <TouchableOpacity key={test.id} style={styles.testCard}>
              <View style={styles.testHeader}>
                <Text style={styles.testType}>{test.type}</Text>
                <Text style={styles.testDate}>{test.date}</Text>
              </View>
              <Text style={styles.testTitle}>{test.title}</Text>
              <View style={styles.testDetails}>
                <Text style={styles.testInfo}>
                  <Ionicons name="help-circle-outline" size={14} color="#666" /> {test.questions} questions
                </Text>
                <Text style={styles.testInfo}>
                  <Ionicons name="time-outline" size={14} color="#666" /> {test.duration}
                </Text>
              </View>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Test</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Tests</Text>
          {completedTests.map(test => (
            <TouchableOpacity key={test.id} style={styles.testCard}>
              <View style={styles.testHeader}>
                <Text style={styles.testType}>{test.type}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={[
                    styles.scoreText, 
                    test.percentage >= 80 ? styles.highScore : 
                    test.percentage >= 60 ? styles.mediumScore : styles.lowScore
                  ]}>
                    {test.score}
                  </Text>
                </View>
              </View>
              <Text style={styles.testTitle}>{test.title}</Text>
              <View style={styles.testDetails}>
                <Text style={styles.testInfo}>
                  <Ionicons name="help-circle-outline" size={14} color="#666" /> {test.questions} questions
                </Text>
                <Text style={styles.testInfo}>
                  <Ionicons name="time-outline" size={14} color="#666" /> {test.duration}
                </Text>
              </View>
              <TouchableOpacity style={styles.reviewButton}>
                <Text style={styles.reviewButtonText}>Review Test</Text>
              </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryItem: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '500',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  testType: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testDate: {
    fontSize: 12,
    color: '#666',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  highScore: {
    color: '#34C759',
    backgroundColor: '#E6F9ED',
  },
  mediumScore: {
    color: '#FF9500',
    backgroundColor: '#FFF2E8',
  },
  lowScore: {
    color: '#FF3B30',
    backgroundColor: '#FFE8E8',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testDetails: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  testInfo: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});