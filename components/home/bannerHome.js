import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Carousel from 'react-native-reanimated-carousel';
import { useNavigation, useIsFocused } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BannerHome() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const carouselRef = useRef(null);

  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0.3)).current;

  const defaultBanner = {
    id: 'default',
    title: 'MPPSC PRELIMINARY EXAMINATION',
    subtitle: 'TEST SERIES',
    description: 'Total 60 Tests: 30 Unit wise+30 FLT',
    bulletPoints: ['Bilingual', 'Detailed Explanations', 'Paid group for Live Quizzes', 'Starts 10 Nov'],
    active: true
  };

  const fetchBanners = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const bannersRef = collection(db, 'banners');
      const q = query(bannersRef, where("active", "==", true));
      const querySnapshot = await getDocs(q);

      const bannersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setBanners(bannersData.length > 0 ? bannersData : [defaultBanner]);
    } catch (err) {
      setError(err.message);
      setBanners([defaultBanner]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]); 

  // Carousel auto-scrolling and progress animation
  useEffect(() => {
    let intervalId;
  
    if (isFocused && banners.length > 1) {
      const startSlideProgress = () => {
        progressAnimation.setValue(0);
        Animated.timing(progressAnimation, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: false,
        }).start();
      };
  
      const moveToNextSlide = () => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
          return nextIndex;
        });
      };
  
      // Start progress animation
      startSlideProgress();
  
      intervalId = setInterval(() => {
        moveToNextSlide();
        startSlideProgress();
      }, 5000);
    }
  
    return () => {
      if (intervalId) clearInterval(intervalId);
      progressAnimation.stopAnimation();
    };
  }, [isFocused, banners.length, progressAnimation]);
  
  // Skeleton loading animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (isLoading) {
      pulse.start();
    }

    return () => {
      pulse.stop();
      pulseAnimation.setValue(0.3);
    };
  }, [isLoading]);

  // Banner rendering function
  const renderBanner = ({ item }) => {
    const getGoogleDriveImageUrl = (url) => {
      const fileIdMatch = url.match(/[-\w]{25,}/);
      return fileIdMatch ? `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}` : url;
    };
    
    const imageUrl = item.imageUrl?.includes('drive.google.com')
      ? getGoogleDriveImageUrl(item.imageUrl)
      : item.imageUrl;

    return (
      <View style={styles.bannerContainer}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.bannerImage} 
            resizeMode="cover" 
            defaultSource={require('../../assets/images/icon.png')}
          />
        ) : (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{item?.title || 'No Title'}</Text>
            <Text style={styles.bannerSubtitle}>{item?.subtitle || ''}</Text>
            <Text style={styles.bannerText}>{item?.description || ''}</Text>
            {item?.bulletPoints && (
              <View style={styles.bulletPointsContainer}>
                {item.bulletPoints.map((point, index) => (
                  <View key={index} style={styles.bulletPointRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <Animated.View 
      style={[
        styles.skeletonBanner,
        { opacity: pulseAnimation }
      ]}
    >
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.skeletonText} />
        <View style={styles.skeletonPoints}>
          <View style={styles.skeletonPoint} />
          <View style={styles.skeletonPoint} />
          <View style={styles.skeletonPoint} />
          <View style={styles.skeletonPoint} />
        </View>
      </View>
    </Animated.View>
  );

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading banners</Text>
      </View>
    );
  }

  // Modify the progress animation setup
  const renderProgressBar = useCallback((index) => {
    const isActive = currentIndex === index;
    
    if (isActive) {
      return (
        <View style={styles.activeProgressBar}>
          <Animated.View
            style={[
              styles.progressIndicator,
              {
                transform: [{
                  scaleX: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  })
                }],
                transformOrigin: 'left',
              },
            ]}
          />
        </View>
      );
    }
    return <View style={styles.inactiveDot} />;
  }, [currentIndex, progressAnimation]);

  // Update the pagination section in the return statement
  return (
    <View style={styles.container}>
      {isLoading ? (
        renderLoadingSkeleton()
      ) : (
        <>
          <Carousel
            ref={carouselRef}
            loop
            width={SCREEN_WIDTH}
            height={300}
            autoPlay={false} // Disabled built-in autoPlay to use our custom implementation
            data={banners}
            scrollAnimationDuration={500}
            renderItem={renderBanner}
            onSnapToItem={(index) => {
              setCurrentIndex(index);
              // Reset and start progress animation when slide changes
              progressAnimation.setValue(0);
              Animated.timing(progressAnimation, {
                toValue: 1,
                duration: 5000,
                useNativeDriver: false,
              }).start();
            }}
          />
          
          {/* Fixed pagination wrapper */}
          <View style={styles.paginationWrapper}>
            {banners.map((_, index) => (
              <View key={index} style={styles.dotContainer}>
                {renderProgressBar(index)}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    height: SCREEN_WIDTH * 0.8,
    marginBottom: SCREEN_WIDTH * 0.05,
    position: 'relative', // Ensure relative positioning for absolute children
  },
  bannerContainer: {
    padding: SCREEN_WIDTH * 0.02,
    height: '100%',
  },
  banner: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: SCREEN_WIDTH * 0.04,
    elevation: 5,
    height: '100%',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bannerTitle: {
    fontSize: SCREEN_WIDTH * 0.055,
    fontWeight: '800',
    color: '#E52020',
    textAlign: 'center',
    marginBottom: SCREEN_WIDTH * 0.01,
  },
  bannerSubtitle: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '600',
    color: '#E52020',
    textAlign: 'center',
    marginBottom: SCREEN_WIDTH * 0.01,
  },
  bannerText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#4a4a4a',
    textAlign: 'left',
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure indicators are above other elements
  },
  dotContainer: {
    marginHorizontal: 4,
  },
  activeProgressBar: {
    height: 4,
    width: 24,
    backgroundColor: 'rgba(229, 32, 32, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#E52020',
    borderRadius: 2,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(229, 32, 32, 0.3)',
    marginHorizontal: 2,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  bulletPointsContainer: {
    marginTop: 10,
  },
  bulletPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  bulletPoint: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#E52020',
    marginRight: 8,
  },
  bulletPointText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#4a4a4a',
    flex: 1,
  },
  skeletonBanner: {
    height: '100%',
    width: SCREEN_WIDTH - (SCREEN_WIDTH * 0.04),
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: SCREEN_WIDTH * 0.04,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: SCREEN_WIDTH * 0.02,
  },
  skeletonTitle: {
    height: SCREEN_WIDTH * 0.055,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    width: '90%',
    alignSelf: 'center',
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  skeletonSubtitle: {
    height: SCREEN_WIDTH * 0.045,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    width: '70%',
    alignSelf: 'center',
    marginBottom: SCREEN_WIDTH * 0.03,
  },
  skeletonText: {
    height: SCREEN_WIDTH * 0.04,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    width: '85%',
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  skeletonPoints: {
    gap: SCREEN_WIDTH * 0.02,
    marginTop: SCREEN_WIDTH * 0.02,
  },
  skeletonPoint: {
    height: SCREEN_WIDTH * 0.04,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    width: '75%',
  },
  errorText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#E52020',
    textAlign: 'center',
  },
});