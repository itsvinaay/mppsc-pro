import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';


export const useUserRole = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        console.log('Getting user role...'); // Debug log
        
        // First try AsyncStorage
        const storedRole = await AsyncStorage.getItem('userRole');
        console.log('Role from AsyncStorage:', storedRole); // Debug log

        if (storedRole) {
          setUserRole(storedRole);
          setLoading(false);
          return;
        }

        // If no role in AsyncStorage, try getting from Firestore
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('Current user found:', currentUser.uid); // Debug log
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData); // Debug log
            
            if (userData.role) {
              await AsyncStorage.setItem('userRole', userData.role);
              setUserRole(userData.role);
              console.log('Role set from Firestore:', userData.role); // Debug log
            }
          }
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, []);

  return { userRole, loading };
}; 