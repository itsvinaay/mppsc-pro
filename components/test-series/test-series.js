import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebase';
import { collection, getDocs, query, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import ThreeDotsLoader from '../../components/ThreeDotsLoader';
import PaymentButton from '../../components/PaymentButton';
import { useUserInfo } from '../../components/UserInfo';
const { width } = Dimensions.get('window');


const TestSeries = ({ isPaid = true }) => {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedData, setFetchedData] = useState([]);
  const [testCounts, setTestCounts] = useState({});
  const [selectedTest, setSelectedTest] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [purchasedTests, setPurchasedTests] = useState({});
  const { userInfo } = useUserInfo();
  const [hasMembership, setHasMembership] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState([]);

  useEffect(() => {
    fetchTests();
    checkMembershipStatus();
    fetchMembershipPlans();
  }, [isPaid]);

  useEffect(() => {
    const loadPurchaseStatus = async () => {
      try {
        const userRef = doc(db, 'users', userInfo.uid);
        const userDoc = await getDoc(userRef);
        const purchased = userDoc.data()?.purchasedTests || [];
        const purchasedMap = {};
        purchased.forEach(test => {
          purchasedMap[test.testId] = true;
        });
        setPurchasedTests(purchasedMap);
      } catch (error) {
        console.error('Error checking purchase status:', error);
      }
    };

    if (userInfo?.uid) {
      loadPurchaseStatus();
    }
  }, [userInfo]);

  const checkMembershipStatus = async () => {
    if (!userInfo?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userInfo.uid));
      const userData = userDoc.data();
      
      if (userData?.membership) {
        const membershipEndDate = userData.membership.endDate.toDate();
        setHasMembership(membershipEndDate > new Date());
      } else {
        setHasMembership(false);
      }
    } catch (error) {
      console.error('Error checking membership:', error);
      setHasMembership(false);
    }
  };

  const fetchMembershipPlans = async () => {
    try {
      const plansRef = collection(db, 'membershipPlans');
      const plansSnapshot = await getDocs(plansRef);
      const plans = [];
      plansSnapshot.forEach((doc) => {
        plans.push({ id: doc.id, ...doc.data() });
      });
      // Sort plans by price to get the lowest price
      setMembershipPlans(plans.sort((a, b) => a.price - b.price));
    } catch (error) {
      console.error('Error fetching membership plans:', error);
    }
  };

  // Payment handling functions
  const handleStartPayment = (test) => {
    console.log('Payment process started for:', test.name);
    console.log('Payment amount:', test.price);
    console.log('User info:', userInfo);
    setSelectedTest(test);
    setIsProcessingPayment(true);
  };

  const handlePaymentInitiation = () => {
    console.log('Payment initialization phase');
    console.log('Creating payment intent for test:', selectedTest?.name);
    // Typically here you would create a payment intent on your server
  };

  const handlePaymentProcessing = () => {
    console.log('Payment processing phase');
    console.log('User selected payment method, processing payment...');
    // This would be called when the user has selected a payment method
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Processing successful payment:', paymentData);
      
      // 1. Record the payment in Firestore
      const paymentRef = await addDoc(collection(db, 'payments'), {
        userId: userInfo.uid,
        testId: selectedTest.id,
        testName: selectedTest.name,
        amount: selectedTest.price,
        paymentId: paymentData.razorpay_payment_id,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
      console.log('Payment recorded:', paymentRef.id);

      // 2. Update user's purchased tests
      const userRef = doc(db, 'users', userInfo.uid);
      await updateDoc(userRef, {
        purchasedTests: arrayUnion({
          testId: selectedTest.id,
          purchasedAt: serverTimestamp(),
          paymentId: paymentRef.id
        })
      });
      console.log('User purchases updated');

      // 3. Update test purchase count (optional)
      const testRef = doc(db, 'categories', selectedTest.id);
      await updateDoc(testRef, {
        purchaseCount: increment(1)
      });
      console.log('Test purchase count updated');

      // 4. Show success message
      Alert.alert(
        'Purchase Successful',
        'You can now access the test series!',
        [
          {
            text: 'Start Now',
            onPress: () => router.push(`(screen)/test-list/${selectedTest.id}?name=${encodeURIComponent(selectedTest.name)}`)
          }
        ]
      );

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert(
        'Error',
        'Payment was successful but we encountered an error updating your access. Please contact support.',
        [
          {
            text: 'OK',
            onPress: () => setIsProcessingPayment(false)
          }
        ]
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentFailure = async (error) => {
    try {
      // Record failed payment attempt
      await addDoc(collection(db, 'payments'), {
        userId: userInfo.uid,
        testId: selectedTest.id,
        testName: selectedTest.name,
        amount: selectedTest.price,
        status: 'failed',
        error: error.message,
        createdAt: serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Error recording failed payment:', dbError);
    }

    Alert.alert(
      'Payment Failed',
      'Unable to process your payment. Please try again.',
      [
        {
          text: 'OK',
          onPress: () => setIsProcessingPayment(false)
        }
      ]
    );
  };

  const handlePaymentCancellation = () => {
    console.log('Payment cancellation phase');
    console.log('User cancelled payment for test:', selectedTest?.name);
    
    setIsProcessingPayment(false);
  };

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching test categories...');
      
      // Fetch categories first
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(query(categoriesRef));
      
      const categoriesData = [];
      const testCountsData = {};
      // Process each category and fetch its tests
      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryId = categoryDoc.id;
        const categoryData = {
          id: categoryId,
          ...categoryDoc.data()
        };

        // Only include categories matching isPaid filter
        if (categoryData.isPaid === isPaid) {
          // Fetch tests count for this category
          const testsRef = collection(db, `categories/${categoryId}/tests`);
          const testsSnapshot = await getDocs(query(testsRef));
          
          testCountsData[categoryId] = testsSnapshot.docs.length;
          categoriesData.push(categoryData);
        }
      }
      setTests(categoriesData);
      setTestCounts(testCountsData);
      console.log('Test categories fetched successfully:', categoriesData.length);
      console.log('Test counts:', testCountsData);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFirstTest = (tests, currentTest) => {
    const premiumTests = tests.filter(test => test.isPaid);
    return premiumTests[0]?.id === currentTest.id;
  };

  const handleTestAccess = (item) => {
    if (isPaid) {
      if (hasMembership) {
        // Member can access all tests
        router.push(`(screen)/test-list/${item.id}?name=${encodeURIComponent(item.name)}`);
      } else if (isFirstTest(tests, item)) {
        // Non-member can only access the first test (free trial)
        router.push(`(screen)/test-list/${item.id}?name=${encodeURIComponent(item.name)}`);
      } else {
        // Show membership prompt for locked tests
        Alert.alert(
          'Premium Content',
          'This test is locked. Get premium membership to access all tests.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Get Premium',
              onPress: () => router.push('/(screen)/membership')
            }
          ]
        );
      }
    } else {
      // Free tests are accessible to everyone
      router.push(`(screen)/test-list/${item.id}?name=${encodeURIComponent(item.name)}`);
    }
  };

  const PremiumAccessButton = () => (
    <TouchableOpacity 
      style={styles.premiumAccessContainer}
      onPress={() => router.push('/(screen)/membership')}
    >
      <View style={styles.premiumAccessContent}>
        <Ionicons name="lock-closed" size={20} color="#FFD700" />
        <Text style={styles.premiumAccessText}>Get Premium Access</Text>
        {membershipPlans.length > 0 && (
          <View style={styles.premiumPrice}>
            <Text style={styles.priceText}>
              Starting at ₹{membershipPlans[0]?.price || '---'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTestItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.testItem,
        isPaid && !hasMembership && !isFirstTest(tests, item) && styles.lockedTestItem
      ]}
      onPress={() => handleTestAccess(item)}
      activeOpacity={isPaid && !hasMembership && !isFirstTest(tests, item) ? 1 : 0.7}
    >
      <View style={styles.testHeader}>
        <View style={styles.testIconContainer}>
          <FontAwesome5 name="clipboard-list" size={20} color="white" />
        </View>
        {isPaid && !hasMembership && !isFirstTest(tests, item) && (
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={18} color="#4f46e5" />
          </View>
        )}
      </View>
      
      <View style={styles.testContent}>
        <Text style={styles.testName} numberOfLines={2}>
          {item.name || 'No Title'} 
        </Text>
        <Text style={styles.testDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.testStats}>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={16} color="#6b7280" />
            <Text style={styles.statText}>
              Available tests: {testCounts[item.id] || 0}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.actionButton,
          isPaid ? (
            hasMembership || isFirstTest(tests, item) 
              ? styles.accessButton 
              : styles.lockedButton
          ) : styles.startButton
        ]}
        onPress={() => handleTestAccess(item)}
      >
        <Text style={styles.actionButtonText}>
          {isPaid 
            ? (hasMembership 
                ? 'Start Test'
                : isFirstTest(tests, item)
                  ? 'Start Free Trial'
                  : 'Locked')
            : 'Start Test'}
        </Text>
        <Ionicons 
          name={isPaid 
            ? (hasMembership 
                ? "play"
                : isFirstTest(tests, item)
                  ? "gift"
                  : "lock-closed")
            : "play"} 
          size={16} 
          color="white" 
          style={{marginLeft: 4}}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={isPaid ? "star" : "document-text-outline"} 
        size={64} 
        color="#d1d5db" 
      />
      <Text style={styles.emptyTitle}>No Tests Available</Text>
      <Text style={styles.emptySubtitle}>
        {isPaid 
          ? 'We\'re preparing amazing premium content for you.' 
          : 'No free tests available. Check our premium section!'
        }
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.emptyButtonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );

  const PaymentModal = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handlePaymentCancellation}
        >
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <Text style={styles.modalTitle}>Complete Payment</Text>
        <Text style={styles.modalSubtitle}>Purchase: {selectedTest?.name}</Text>
        <Text style={styles.modalPrice}>₹{selectedTest?.price || 0}</Text>
        
        <PaymentButton 
          amount={selectedTest?.price || 0}
          description={selectedTest?.name || 'Test Series'}
          userId={userInfo?.uid || 'guest'}
          onSuccess={(data) => {
            console.log('Payment successful:', data);
            handlePaymentSuccess(data);
          }}
          onFailure={(error) => {
            console.error('Payment failed:', error);
            handlePaymentFailure(error);
          }}
          onCancel={() => {
            console.log('Payment cancelled');
            handlePaymentCancellation();
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPaid ? 'Premium Test Series' : 'Free Practice Tests'}
        </Text>
      </View>
      
      {isPaid && !hasMembership && <PremiumAccessButton />}
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ThreeDotsLoader size={20} color="#2196F3" />
          <Text style={styles.loaderText}>Loading tests...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#f87171" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchTests}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
            <Ionicons name="refresh" size={16} color="white" style={{marginLeft: 4}} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tests}
          keyExtractor={(item) => item.id}
          renderItem={renderTestItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={tests.length > 0 ? styles.row : null}
        />
      )}

      {/* Payment Modal */}
      {isProcessingPayment && selectedTest && <PaymentModal />}
    </View>
  );
};

const newStyles = StyleSheet.create({
  premiumAccessContainer: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  premiumAccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumAccessText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  premiumPrice: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  lockIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  lockedButton: {
    backgroundColor: '#9ca3af',
  },
  listContainer: {
    padding: 8,
    flexGrow: 1,
    paddingTop: 0, // Adjust for the premium access button
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
    marginLeft: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  testItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: width / 2 - 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: 12,
    paddingTop: 12,
  },
  testIconContainer: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  priceTag: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  testContent: {
    padding: 12,
  },
  testName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  testStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buyButton: {
    backgroundColor: '#f97316',
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  accessButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f97316',
    marginBottom: 24,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  premiumButton: {
    backgroundColor: '#4f46e5',
  },
  freePremiumBadge: {
    backgroundColor: '#10b981',
  },
  ...newStyles
});

export default TestSeries;