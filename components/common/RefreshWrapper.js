import React from 'react';
import { ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useRefresh } from '../../hooks/useRefresh';

export const RefreshWrapper = ({ 
  children, 
  onRefresh, 
  style,
  scrollViewProps = {} 
}) => {
  const { refreshing, onRefresh: handleRefresh } = useRefresh(onRefresh);

  return (
    <ScrollView
      style={[styles.container, style]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#2196F3']} // Android
          tintColor="#2196F3" // iOS
        />
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 


//use on file to refresh
// import { RefreshWrapper } from '../common/RefreshWrapper';

// const SomeOtherScreen = () => {
//   const handleRefresh = async () => {
//     // Implement your refresh logic here
//     await fetchData();
//   };

//   return (
//     <RefreshWrapper onRefresh={handleRefresh}>
//       {/* Your screen content */}
//     </RefreshWrapper>
//   );
// };