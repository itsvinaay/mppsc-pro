import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  url?: string;  // Make url optional
  uploadedAt: {
    toDate: () => Date;
  };
}

interface BookDetailsModalProps {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({ book, visible, onClose }) => {
  if (!book) return null;

  const formatDate = (timestamp: { toDate: () => Date }): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleOpenPDF = async () => {
    try {
      if (!book.url) {
        alert("No URL available");
        return;
      }
      const supported = await Linking.canOpenURL(book.url);
      if (supported) {
        await Linking.openURL(book.url);
      } else {
        alert("Can't open this URL");
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert('Error opening PDF');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Book Details</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.bookIcon}>
              <MaterialIcons name="picture-as-pdf" size={48} color="#E53935" />
            </View>

            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>by {book.author}</Text>

            <View style={styles.metaInfo}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{book.category}</Text>
              </View>
              <Text style={styles.uploadDate}>
                Added on {formatDate(book.uploadedAt)}
              </Text>
            </View>

            {book.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{book.description}</Text>
              </View>
            )}

            {book?.url && (
              <TouchableOpacity onPress={handleOpenPDF}>
                <Text>Open PDF</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1E293B',
  },
  modalBody: {
    padding: 16,
  },
  bookIcon: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadDate: {
    color: '#64748B',
    fontSize: 14,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  openButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  openButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BookDetailsModal;