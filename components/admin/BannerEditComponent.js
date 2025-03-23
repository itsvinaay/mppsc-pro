import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { db } from '../../config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const convertGoogleDriveLink = (url) => {
  try {
    if (!url) return '';
    
    // If it's not a Google Drive URL, return as is
    if (!url.includes('drive.google.com')) {
      return url;
    }

    let fileId = '';
    
    if (url.includes('drive.google.com/file/d/')) {
      // Format: https://drive.google.com/file/d/FILE_ID/view...
      fileId = url.split('/file/d/')[1].split('/')[0];
    } else if (url.includes('drive.google.com/open?id=')) {
      // Format: https://drive.google.com/open?id=FILE_ID
      fileId = url.split('open?id=')[1].split('&')[0];
    } else if (url.includes('id=')) {
      // Format: https://drive.google.com/uc?id=FILE_ID
      fileId = url.split('id=')[1].split('&')[0];
    }

    if (fileId) {
      // Use the direct viewing URL format
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    return url;
  } catch (error) {
    console.error('Error converting Google Drive link:', error);
    return url;
  }
};

const BannerSection = React.memo(({ bannerData }) => {
  if (!bannerData) return null;
  
  const [imageError, setImageError] = useState(false);
  const imageUrl = convertGoogleDriveLink(bannerData.imageUrl);
  
  console.log('Bullet Points received:', bannerData.bulletPoints);
  
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.banner}>
        {bannerData.imageUrl && (
          <>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.bannerImage}
              resizeMode="cover"
              onError={(e) => {
                console.error('Image loading error:', e.nativeEvent.error);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', imageUrl);
                setImageError(false);
              }}
            />
            {imageError && (
              <Text style={styles.imageErrorText}>
                Error loading image. Please check the URL: {imageUrl}
              </Text>
            )}
          </>
        )}
        <Text style={styles.bannerTitle}>{bannerData.title || ''}</Text>
        <Text style={styles.bannerSubtitle}>{bannerData.subtitle || ''}</Text>
        <Text style={styles.bannerText}>{bannerData.description || ''}</Text>
        <View style={styles.bulletPoints}>
          {console.log('bannerData:', bannerData)}
          {console.log('bulletPoints:', bannerData?.bulletPoints)}
          {Array.isArray(bannerData?.bulletPoints) ? (
            bannerData.bulletPoints.map((point, index) => {
              console.log('Rendering point:', point);
              return (
                <View key={index} style={styles.bulletPointContainer}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{point || 'No text'}</Text>
                </View>
              );
            })
          ) : (
            <Text>No bullet points available</Text>
          )}
        </View>
      </View>
    </View>
  );
});

const BannerEdit = () => {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState(null); // 'saving' | 'deleting' | 'success' | 'error'
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [selectedBannerId, setSelectedBannerId] = useState(null);

  const showStatusAnimation = (newStatus) => {
    setStatus(newStatus);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setStatus(null));
  };

  const emptyBanner = {
    title: "MPPSC PRELIMINARY EXAMINATION",
    subtitle: "TEST SERIES",
    description: "Total 60 Tests: 30 Unit wise+30 FLT",
    bulletPoints: [
      "Bilingual",
      "Detailed Explanations", 
      "Paid group for Live Quizzes",
      "Starts 10 Nov"
    ],
    imageUrl: "",
    active: true
  };

  useEffect(() => {
    console.log('🔥 Checking Firebase connection...');
    console.log('📊 Firestore instance:', db);
    
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    console.log('📥 Fetching banners...');
    try {
      const bannersCollection = collection(db, 'banners');
      const bannersSnapshot = await getDocs(bannersCollection);
      const bannersList = bannersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date().toISOString() // Add timestamp if not exists
      }));
      // Sort banners by createdAt in descending order (newest first)
      const sortedBanners = bannersList.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      console.log('✅ Banners fetched successfully:', sortedBanners);
      setBanners(sortedBanners);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error fetching banners:', error);
      Alert.alert('Error', 'Failed to load banners');
    }
  };

  const handleChange = (bannerId, field, value) => {
    // Only update local state, don't auto-save
    setBanners(prevBanners => 
      prevBanners.map(banner => 
        banner.id === bannerId 
          ? { 
              ...banner, 
              [field]: field === 'bulletPoints' 
                ? value.split(',').map(item => item.trim()).filter(item => item !== '')
                : value 
            }
          : banner
      )
    );
  };

  const handleSave = async (banner) => {
    try {
      setIsLoading(true);
      showStatusAnimation('saving');
      const bannerRef = doc(db, 'banners', banner.id);
      
      await setDoc(bannerRef, {
        ...banner,
        imageUrl: banner.imageUrl || ''
      });
      
      showStatusAnimation('success');
      setTimeout(() => {
        fetchBanners();
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      showStatusAnimation('error');
    } finally {
      setIsLoading(false);
    }
  };

  const addNewBanner = async () => {
    try {
      setIsLoading(true);
      const newBannerRef = doc(collection(db, 'banners'));
      const newBanner = {
        id: newBannerRef.id,
        ...emptyBanner,
        createdAt: new Date().toISOString() // Add timestamp for new banners
      };
      await setDoc(newBannerRef, {
        ...emptyBanner,
        createdAt: newBanner.createdAt
      });
      setBanners(prev => [newBanner, ...prev]); // Add new banner at the beginning
      showStatusAnimation('success');
    } catch (error) {
      console.error('Error adding banner:', error);
      showStatusAnimation('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePress = (bannerId) => {
    console.log('Delete button pressed for:', bannerId);
    
    handleDelete(bannerId);
  };

  const handleDelete = async (bannerId) => {
    console.log('Starting delete for:', bannerId);
    try {
      setDeletingId(bannerId);
      showStatusAnimation('deleting');
      
      // Delete from Firestore
      const bannerRef = doc(db, 'banners', bannerId);
      await deleteDoc(bannerRef);
      
      // Update local state
      setBanners(current => 
        current.filter(banner => banner.id !== bannerId)
      );
      
      showStatusAnimation('success');
    } catch (error) {
      console.error('Delete error:', error);
      showStatusAnimation('error');
    } finally {
      setDeletingId(null);
    }
  };

  const renderBanner = (banner) => {
    console.log('Rendering banner:', banner.id);
    return (
      <View key={banner.id} style={styles.bannerEditContainer}>
        <Text style={styles.previewLabel}>Preview:</Text>
        
        <BannerSection bannerData={banner} />
        
        <View style={styles.divider} />
        
        <View style={styles.imageUrlContainer}>
          <TextInput
            style={[styles.input, styles.imageUrlInput]}
            value={banner.imageUrl}
            onChangeText={(value) => handleChange(banner.id, 'imageUrl', value)}
            placeholder="Enter Image URL (e.g., Google Drive link)"
            placeholderTextColor="#95a5a6"
          />
          
        </View>

        <TextInput
          style={styles.input}
          value={banner.title}
          onChangeText={(value) => handleChange(banner.id, 'title', value)}
          placeholder="Title"
          placeholderTextColor="#95a5a6"
        />
        <TextInput
          style={styles.input}
          value={banner.subtitle}
          onChangeText={(value) => handleChange(banner.id, 'subtitle', value)}
          placeholder="Subtitle"
          placeholderTextColor="#95a5a6"
        />
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={banner.description}
          onChangeText={(value) => handleChange(banner.id, 'description', value)}
          placeholder="Description"
          placeholderTextColor="#95a5a6"
          multiline
        />
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={banner.bulletPoints?.join(', ')}
          onChangeText={(value) => handleChange(banner.id, 'bulletPoints', value)}
          placeholder="Bullet Points (comma-separated)"
          placeholderTextColor="#95a5a6"
          multiline
        />
        
        <View style={styles.buttonContainer}>
          <Button 
            title={isLoading ? "Saving..." : "Save"}
            onPress={() => handleSave(banner)}
            disabled={isLoading || deletingId === banner.id}
          />
          
          <TouchableOpacity
            style={[
              styles.deleteButton,
              deletingId === banner.id && styles.deleteButtonDisabled
            ]}
            onPress={() => handleDeletePress(banner.id)}
            disabled={deletingId === banner.id}
          >
            {deletingId === banner.id ? (
              <View style={styles.deleteButtonContent}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.deleteLoadingText}>Deleting...</Text>
              </View>
            ) : (
              <Text style={styles.deleteButtonText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>

        {status && (
          <Animated.View style={[styles.statusOverlay, { opacity: fadeAnim }]}>
            <View style={styles.statusContent}>
              {status === 'saving' && (
                <>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.statusText}>Saving...</Text>
                </>
              )}
              {status === 'deleting' && (
                <>
                  <ActivityIndicator size="large" color="#F44336" />
                  <Text style={styles.statusText}>Deleting...</Text>
                </>
              )}
              {status === 'success' && (
                <>
                  <MaterialIcons name="check-circle" size={50} color="#4CAF50" />
                  <Text style={[styles.statusText, { color: '#4CAF50' }]}>Success!</Text>
                </>
              )}
              {status === 'error' && (
                <>
                  <MaterialIcons name="error" size={50} color="#F44336" />
                  <Text style={[styles.statusText, { color: '#F44336' }]}>Error!</Text>
                </>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} key={refreshKey}>
      <View style={styles.headerRow}>
        <View style={styles.headerButtons}>
       
          <TouchableOpacity 
            style={[styles.addButton, isLoading && styles.disabledButton]}
            onPress={addNewBanner}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>Add Banner</Text>
          </TouchableOpacity>
        </View>
      </View>
      {banners.length === 0 ? (
        <Text style={styles.noDataText}>No banners available</Text>
      ) : (
        banners.map(renderBanner)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  bannerEditContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
     boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)'
  },
  banner: {
    backgroundColor: '#e8f4f8',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  bulletPoints: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  bulletPointContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#000000',
    marginRight: 8,
    width: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    zIndex: 1,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    height: 45,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#999',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    marginLeft: 10,
    width: 150,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  previewLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e8ed',
    marginVertical: 16,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLoadingText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  statusContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
  },
  bannerImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageUrlInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  previewUrlButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  previewUrlButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10,
  },
  imageErrorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  }
});

export default BannerEdit;
