import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AppState } from 'react-native';
import { db } from '../config/firebase';

export const updateUserStatus = async (userId, isOnline) => {
  if (!userId) return;
  
  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await setDoc(userStatusRef, {
      state: isOnline ? 'online' : 'offline',
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

export const setupUserStatusTracking = (userId) => {
  if (!userId) return;

  // Update when app is in foreground
  const handleAppForeground = () => {
    updateUserStatus(userId, true);
  };

  // Update when app is in background
  const handleAppBackground = () => {
    updateUserStatus(userId, false);
  };

  // Set up app state listeners
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      handleAppForeground();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      handleAppBackground();
    }
  });

  // Set initial online status
  updateUserStatus(userId, true);

  // Clean up function
  return () => {
    updateUserStatus(userId, false);
    subscription.remove();
  };
}; 