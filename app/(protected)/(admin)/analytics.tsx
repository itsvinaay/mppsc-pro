import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AnalyticsManagement() {
  const userStats = [
    {
      title: 'Total Users',
      value: '2,500',
      change: '+15%',
      icon: 'people',
      color: '#007AFF'
    },
    {
      title: 'Active Users',
      value: '1,800',
      change: '+8%',
      icon: 'person',
      color: '#34C759'
    },
    {
      title: 'Premium Users',
      value: '500',
      change: '+25%',
      icon: 'star',
      color: '#FF9500'
    }
  ];

  const performanceStats = [
    {
      title: 'Average Score',
      value: '72%',
      change: '+5%',
      icon: 'trophy',
      color: '#FF9500'
    },
    {
      title: 'Completion Rate',
      value: '85%',
      change: '+12%',
      icon: 'checkmark-circle',
      color: '#34C759'
    },
    {
      title: 'Daily Active',
      value: '1.2K',
      change: '+18%',
      icon: 'pulse',
      color: '#007AFF'
    }
  ];

  const subjectPerformance = [
    { subject: 'History', score: '75%', students: '850' },
    { subject: 'Polity', score: '68%', students: '920' },
    { subject: 'Geography', score: '82%', students: '760' },
    { subject: 'Economics', score: '70%', students: '680' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity>
          <Ionicons name="download" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={styles.statsGrid}>
          {userStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={[styles.statChange, { color: stat.change.includes('+') ? '#34C759' : '#FF3B30' }]}>
                {stat.change}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.statsGrid}>
          {performanceStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={[styles.statChange, { color: stat.change.includes('+') ? '#34C759' : '#FF3B30' }]}>
                {stat.change}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Subject Performance</Text>
        {subjectPerformance.map((item, index) => (
          <View key={index} style={styles.subjectCard}>
            <Text style={styles.subjectName}>{item.subject}</Text>
            <View style={styles.subjectStats}>
              <View style={styles.subjectStat}>
                <Ionicons name="trophy" size={16} color="#FF9500" />
                <Text style={styles.subjectValue}>{item.score}</Text>
              </View>
              <View style={styles.subjectStat}>
                <Ionicons name="people" size={16} color="#007AFF" />
                <Text style={styles.subjectValue}>{item.students}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#34C759" />
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>User engagement increased by 23% this month</Text>
              <Text style={styles.insightDate}>Last 30 days</Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="trophy" size={24} color="#FF9500" />
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>Average test scores improved by 12%</Text>
              <Text style={styles.insightDate}>Last quarter</Text>
            </View>
          </View>
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
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  subjectCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '500',
  },
  subjectStats: {
    flexDirection: 'row',
  },
  subjectStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  subjectValue: {
    fontSize: 14,
    marginLeft: 5,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 10,
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightContent: {
    marginLeft: 15,
    flex: 1,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});