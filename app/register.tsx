import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate inputs
      if (!name || !email || !password || !confirmPassword) {
        setError('All fields are required');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Password strength validation
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Show success message
      Alert.alert(
        "Verification Email Sent",
        "Please check your email to verify your account before logging in.",
        [
          { 
            text: "OK", 
            onPress: () => router.replace('/loginForm')
          }
        ]
      );
      
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Simplify Firebase error messages
      if (errorMessage.includes('auth/email-already-in-use')) {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (errorMessage.includes('auth/weak-password')) {
        errorMessage = 'Please choose a stronger password.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    if (!resendEmail) {
      setResendStatus('error');
      return;
    }

    try {
      setResendStatus('loading');
      
      // Send password reset email
      await sendPasswordResetEmail(auth, resendEmail);
      
      // Start cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((current) => {
          if (current <= 1) {
            clearInterval(interval);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
      
      setResendStatus('success');
    } catch (error: any) {
      setResendStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join MPPSC Pro to start your preparation</Text>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <FontAwesome name="user" size={20} color="#007AFF" />
          </View>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={20} color="#007AFF" />
          </View>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={20} color="#007AFF" />
          </View>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
          </View>
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons 
              name={showConfirmPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        </View>
        
        {/* Update the register button to show loading state */}
        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Link href="/loginForm" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
      
      {/* Resend Email Verification Modal */}
      <Modal
        visible={showResendModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resend Verification Email</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowResendModal(false);
                  setResendStatus('idle');
                  setResendEmail('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {resendStatus === 'success' ? (
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#4CD964" />
                <Text style={styles.successText}>Verification email sent successfully!</Text>
                <Text style={styles.instructionText}>Please check your inbox and follow the instructions.</Text>
                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => {
                    setShowResendModal(false);
                    setResendStatus('idle');
                    setResendEmail('');
                  }}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : resendStatus === 'error' ? (
              <View style={styles.statusContainer}>
                <Ionicons name="close-circle" size={60} color="#FF3B30" />
                <Text style={styles.errorText}>Failed to send verification email</Text>
                <Text style={styles.instructionText}>Please check your email address and try again.</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => setResendStatus('idle')}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Enter your email address to receive a verification link</Text>
                
                <View style={styles.modalInputContainer}>
                  <TextInput
                    placeholder="Email"
                    value={resendEmail}
                    onChangeText={setResendEmail}
                    style={styles.modalInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.resendButton} 
                  onPress={handleResendVerification}
                  disabled={resendStatus === 'loading' || resendCooldown > 0}
                >
                  {resendStatus === 'loading' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.resendButtonText}>
                      {resendCooldown > 0 
                        ? `Resend (${resendCooldown}s)` 
                        : 'Send Verification Email'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Add a button to show the modal at the bottom of the form */}
      <TouchableOpacity 
        style={styles.resendLinkButton}
        onPress={() => setShowResendModal(true)}
      >
        <Text style={styles.resendLinkText}>Didn't receive verification email?</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 80,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEEEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  error: {
    color: '#FF3B30',
    marginLeft: 10,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  iconContainer: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    width: 50,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 15,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  linkText: {
    color: '#666',
  },
  link: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  eyeIcon: {
    padding: 15,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  modalInput: {
    padding: 15,
  },
  resendButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CD964',
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 15,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: '#4CD964',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendLinkButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  resendLinkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});