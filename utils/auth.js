// import auth from '@react-native-firebase/auth';
import firestore from 'firebase/firestore';

import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign In
export const signIn = async (email, password) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign Up
export const signUp = async (email, password, fullName) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user profile
    await firestore().collection('users').doc(user.uid).set({
      fullName,
      email,
      createdAt: firestore.FieldValue.serverTimestamp(),
      member: false
    });

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign Out
export const logOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    throw error;
  }
};

// Get current user data
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    console.log('Raw user data from storage:', userData); // Debug log
    
    if (!userData) {
      // Try to get current Firebase user as fallback
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          name: firebaseUser.displayName
        };
      }
      return null;
    }
    
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    // First, sign out from Firebase
    await signOut(auth);
    
    // Then clear all auth-related items from AsyncStorage
    const keysToRemove = ['user', 'authToken'];
    await AsyncStorage.multiRemove(keysToRemove);
    
    // For debugging
    console.log('Firebase sign out successful');
    console.log('AsyncStorage cleared');
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Log specific error details
    if (error.code) {
      console.error('Firebase error code:', error.code);
    }
    throw error;
  }
};

// Helper function to check if user is signed in
export const isUserSignedIn = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user !== null;
  } catch (error) {
    console.error('Error checking auth state:', error);
    return false;
  }
};

export const updateUserProfile = async (updatedData) => {
  try {
    // Get current user data
    const currentData = await getCurrentUser();
    
    // Merge current data with updates
    const newUserData = {
      ...currentData,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem('user', JSON.stringify(newUserData));

    // If using Firebase, update profile there too
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updatedData.name,
        // Add other Firebase profile updates here
      });
    }

    console.log('Profile updated successfully:', newUserData);
    return newUserData;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};