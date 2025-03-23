import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserInfo } from '../../../components/UserInfo';
import PaymentButton from '../../../components/PaymentButton';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import * as firebase from 'firebase/app';


const Membership = () => {
  const router = useRouter();
  const { userInfo } = useUserInfo();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentMembership, setCurrentMembership] = useState(null);
  const [membershipPlans, setMembershipPlans] = useState([]);

  useEffect(() => {
    checkCurrentMembership();
    fetchMembershipPlans();
  }, []);

  const checkCurrentMembership = async () => {
    if (!userInfo?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userInfo.uid));
      const userData = userDoc.data();
      
      if (userData?.membership) {
        const membershipEndDate = userData.membership.endDate;
        if (membershipEndDate instanceof firebase.firestore.Timestamp) {
          const endDate = membershipEndDate.toDate();
          if (endDate > new Date()) {
            setCurrentMembership({
              ...userData.membership,
              endDate: endDate
            });
          }
        } else {
          setCurrentMembership(userData.membership);
        }
      }
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const fetchMembershipPlans = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'membershipPlans'));
      const plans = [];
      querySnapshot.forEach((doc) => {
        plans.push({ id: doc.id, ...doc.data() });
      });
      setMembershipPlans(plans.sort((a, b) => a.price - b.price));
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      Alert.alert('Error', 'Failed to load membership plans');
    }
  };


  const handleStartPayment = (plan) => {
    setSelectedPlan(plan);
    setIsProcessingPayment(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      const endDate = new Date();
      const months = parseInt(selectedPlan.duration);
      endDate.setMonth(endDate.getMonth() + months);

      const membershipData = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        startDate: new Date(),
        endDate: endDate,
        paymentId: paymentData.razorpay_payment_id,
        amount: selectedPlan.price
      };

      await updateDoc(doc(db, 'users', userInfo.uid), {
        membership: membershipData,
        membershipStatus: 'active'
      });

      Alert.alert(
        'Welcome to Premium!',
        'Your membership has been activated successfully.',
        [
          {
            text: 'Start Learning',
            onPress: () => router.back()
          }
        ]
      );
      
      setCurrentMembership(membershipData);
    } catch (error) {
      console.error('Error processing membership:', error);
      Alert.alert('Error', 'Failed to activate membership. Please contact support.');
    } finally {
      setIsProcessingPayment(false);
      setSelectedPlan(null);
    }
  };

  const PaymentModal = () => (
    <Modal
      visible={isProcessingPayment}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setIsProcessingPayment(false);
        setSelectedPlan(null);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setIsProcessingPayment(false);
              setSelectedPlan(null);
            }}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Complete Payment</Text>
          <Text style={styles.modalSubtitle}>{selectedPlan?.name}</Text>
          <Text style={styles.modalPrice}>₹{selectedPlan?.price}</Text>
          
          <PaymentButton 
            amount={selectedPlan?.price || 0}
            description={`${selectedPlan?.name} Membership`}
            userId={userInfo?.uid || 'guest'}
            onSuccess={handlePaymentSuccess}
            onFailure={() => {
              Alert.alert('Payment Failed', 'Unable to process your payment. Please try again.');
              setIsProcessingPayment(false);
              setSelectedPlan(null);
            }}
            onCancel={() => {
              setIsProcessingPayment(false);
              setSelectedPlan(null);
            }}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Membership</Text>
      </View>

      <ScrollView style={styles.content}>
        {currentMembership ? (
          <View style={styles.currentMembershipCard}>
            <Ionicons name="shield-checkmark" size={40} color="#10b981" />
            <Text style={styles.activeTitle}>Active Membership</Text>
            <Text style={styles.planName}>{currentMembership.planName}</Text>
            <Text style={styles.expiryDate}>
              Expires: {currentMembership.endDate.toDate().toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Choose your premium plan to access all features
            </Text>

            {membershipPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan
                ]}
                onPress={() => handleStartPayment(plan)}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.duration}>{plan.duration}</Text>
                </View>

                <Text style={styles.price}>
                  ₹{plan.price}
                  <Text style={styles.priceSubtext}>/{plan.duration.toLowerCase()}</Text>
                </Text>

                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <MaterialCommunityIcons 
                        name="check-circle" 
                        size={20} 
                        color="#10b981" 
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    plan.popular && styles.popularButton
                  ]}
                  onPress={() => handleStartPayment(plan)}
                >
                  <Text style={styles.selectButtonText}>Select Plan</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <PaymentModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  currentMembershipCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 16,
  },
  planName: {
    fontSize: 18,
    color: '#1f2937',
    marginTop: 8,
  },
  expiryDate: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  popularPlan: {
    borderColor: '#4f46e5',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  duration: {
    fontSize: 16,
    color: '#6b7280',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 24,
  },
  priceSubtext: {
    fontSize: 16,
    color: '#6b7280',
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4b5563',
  },
  selectButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: '#4f46e5',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 24,
  },
});

export default Membership;