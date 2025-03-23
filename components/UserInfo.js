import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUser } from '../utils/auth';

export const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState({
    displayName: '',
    email: '',
    username: '',
    role: null
  });

  useEffect(() => {
    let unsubscribe;

    const setupUserListener = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return;

        // Set up real-time listener for user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setUserInfo({
              displayName: userData.username || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              email: currentUser.email || '',
              username: userData.username || '',
              role: userData.role || null,
              uid: currentUser.uid
            });
          }
        }, (error) => {
          console.error('User document listener error:', error);
        });
      } catch (error) {
        console.error('Error setting up user listener:', error);
      }
    };

    setupUserListener();
    return () => unsubscribe?.();
  }, []);

  return { userInfo };
};