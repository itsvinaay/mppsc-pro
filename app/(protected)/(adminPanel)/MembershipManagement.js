import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const MembershipManagement = () => {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    duration: '',
    price: '',
    features: [''],
    popular: false
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'membershipPlans'));
      const plansData = [];
      querySnapshot.forEach((doc) => {
        plansData.push({ id: doc.id, ...doc.data() });
      });
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      Alert.alert('Error', 'Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async () => {
    if (!validatePlan(newPlan)) return;

    try {
      const planData = {
        name: newPlan.name.trim(),
        duration: newPlan.duration.trim(),
        price: Number(newPlan.price),
        features: newPlan.features.filter(f => f.trim()),
        popular: newPlan.popular,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'membershipPlans'), planData);
      setNewPlan({ name: '', duration: '', price: '', features: [''], popular: false });
      fetchPlans();
      Alert.alert('Success', 'Membership plan added successfully');
    } catch (error) {
      console.error('Error adding plan:', error);
      Alert.alert('Error', 'Failed to add membership plan');
    }
  };

  const handleEditPlan = async (plan) => {
    if (editingPlan && editingPlan.id === plan.id) {
      if (!validatePlan(editingPlan)) return;

      try {
        await updateDoc(doc(db, 'membershipPlans', plan.id), {
          name: editingPlan.name.trim(),
          duration: editingPlan.duration.trim(),
          price: Number(editingPlan.price),
          features: editingPlan.features.filter(f => f.trim()),
          popular: editingPlan.popular
        });
        setEditingPlan(null);
        fetchPlans();
        Alert.alert('Success', 'Membership plan updated successfully');
      } catch (error) {
        console.error('Error updating plan:', error);
        Alert.alert('Error', 'Failed to update membership plan');
      }
    } else {
      setEditingPlan(plan);
    }
  };

  const handleDeletePlan = async (planId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this membership plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'membershipPlans', planId));
              fetchPlans();
              Alert.alert('Success', 'Membership plan deleted successfully');
            } catch (error) {
              console.error('Error deleting plan:', error);
              Alert.alert('Error', 'Failed to delete membership plan');
            }
          }
        }
      ]
    );
  };

  const validatePlan = (plan) => {
    if (!plan.name.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return false;
    }
    if (!plan.duration.trim()) {
      Alert.alert('Error', 'Duration is required');
      return false;
    }
    if (isNaN(Number(plan.price)) || Number(plan.price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    if (!plan.features.some(f => f.trim())) {
      Alert.alert('Error', 'At least one feature is required');
      return false;
    }
    return true;
  };

  const renderFeatureInputs = (plan, setPlan) => (
    <View style={styles.featuresContainer}>
      <Text style={styles.label}>Features</Text>
      {plan.features.map((feature, index) => (
        <View key={index} style={styles.featureRow}>
          <TextInput
            style={styles.featureInput}
            value={feature}
            onChangeText={(text) => {
              const newFeatures = [...plan.features];
              newFeatures[index] = text;
              setPlan(prev => ({ ...prev, features: newFeatures }));
            }}
            placeholder={`Feature ${index + 1}`}
          />
          <TouchableOpacity
            style={styles.removeFeatureButton}
            onPress={() => {
              const newFeatures = plan.features.filter((_, i) => i !== index);
              setPlan(prev => ({ ...prev, features: newFeatures }));
            }}
          >
            <Ionicons name="remove-circle" size={24} color="#f44336" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.addFeatureButton}
        onPress={() => setPlan(prev => ({ 
          ...prev, 
          features: [...prev.features, ''] 
        }))}
      >
        <Text style={styles.addFeatureText}>Add Feature</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
     
      <ScrollView style={styles.content}>
        {/* Add New Plan Section */}
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add New Plan</Text>
          <TextInput
            style={styles.input}
            placeholder="Plan Name"
            value={newPlan.name}
            onChangeText={(text) => setNewPlan(prev => ({ ...prev, name: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Duration (e.g., 1 Month, 3 Months)"
            value={newPlan.duration}
            onChangeText={(text) => setNewPlan(prev => ({ ...prev, duration: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Price"
            value={newPlan.price}
            onChangeText={(text) => setNewPlan(prev => ({ ...prev, price: text }))}
            keyboardType="numeric"
          />
          {renderFeatureInputs(newPlan, setNewPlan)}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Popular Plan</Text>
            <Switch
              value={newPlan.popular}
              onValueChange={(value) => setNewPlan(prev => ({ ...prev, popular: value }))}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={newPlan.popular ? "#2196F3" : "#f4f3f4"}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPlan}>
            <Text style={styles.buttonText}>Add Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Plans List */}
        <Text style={styles.sectionTitle}>Existing Plans</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading plans...</Text>
        ) : (
          plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              {editingPlan?.id === plan.id ? (
                // Edit Mode
                <View>
                  <TextInput
                    style={styles.input}
                    value={editingPlan.name}
                    onChangeText={(text) => setEditingPlan(prev => ({ ...prev, name: text }))}
                    placeholder="Plan Name"
                  />
                  <TextInput
                    style={styles.input}
                    value={editingPlan.duration}
                    onChangeText={(text) => setEditingPlan(prev => ({ ...prev, duration: text }))}
                    placeholder="Duration"
                  />
                  <TextInput
                    style={styles.input}
                    value={editingPlan.price.toString()}
                    onChangeText={(text) => setEditingPlan(prev => ({ ...prev, price: text }))}
                    placeholder="Price"
                    keyboardType="numeric"
                  />
                  {renderFeatureInputs(editingPlan, setEditingPlan)}
                  <View style={styles.switchContainer}>
                    <Text style={styles.label}>Popular Plan</Text>
                    <Switch
                      value={editingPlan.popular}
                      onValueChange={(value) => setEditingPlan(prev => ({ ...prev, popular: value }))}
                      trackColor={{ false: "#767577", true: "#81b0ff" }}
                      thumbColor={editingPlan.popular ? "#2196F3" : "#f4f3f4"}
                    />
                  </View>
                </View>
              ) : (
                // View Mode
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                  <Text style={styles.planPrice}>₹{plan.price}</Text>
                  {plan.features.map((feature, index) => (
                    <Text key={index} style={styles.featureText}>• {feature}</Text>
                  ))}
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular Plan</Text>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]} 
                  onPress={() => handleEditPlan(plan)}
                >
                  <Text style={styles.buttonText}>
                    {editingPlan?.id === plan.id ? 'Save' : 'Edit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeletePlan(plan.id)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  content: {
    padding: 16,
  },
  addSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  removeFeatureButton: {
    padding: 4,
  },
  addFeatureButton: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addFeatureText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  planDuration: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '500',
    color: '#2196F3',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  popularBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  popularText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default MembershipManagement;