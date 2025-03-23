import { View, Image, ActivityIndicator, StyleSheet, Dimensions, Animated } from 'react-native';

import { Redirect } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Index() {
 
  // Navigate to appropriate screen
  return <Redirect href={"/(protected)/(tabs)/home"} />;
}




// import { useEffect } from 'react';
// import { useRouter } from 'expo-router';
// import { View, ActivityIndicator } from 'react-native';
// import { useSession } from '../context/SessionContext';

// export default function Index() {
//   const router = useRouter();
//   const { user, loading } = useSession();

//   useEffect(() => {
//     if (!loading) {
//       if (user) {
//         router.replace('/(protected)/(tabs)/home');
//       } else {
//         router.replace('/login');
//       }
//     }
//   }, [user, loading]);

//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <ActivityIndicator size="large" color="#4f46e5" />
//     </View>
//   );
// }

// import { useEffect } from 'react';
// import { Redirect, useRouter } from 'expo-router';
// import { auth } from '../config/firebase';

// export default function Index() {
//   const router = useRouter();

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (user) {
//         router.replace('/(protected)/(tabs)/home');
//       } else {
//         router.replace('/login');
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   return null;
// }