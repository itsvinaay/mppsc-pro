import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Modal, View, ActivityIndicator } from 'react-native';

export default function PaymentButton({ 
  amount, 
  description, 
  userId, 
  onSuccess, 
  onFailure,
  onCancel 
}) {
  const [showRazorpay, setShowRazorpay] = React.useState(false);

  const handlePayment = () => {
    setShowRazorpay(true);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
      <script>
        var options = {
          key: 'rzp_test_DWd9KWCtsWVlb9', // Replace with your Razorpay key
          amount: '${amount * 100}',
          currency: 'INR',
          name: 'StudoTest',
          description: '${description}',
          prefill: {
            name: 'User',
            email: '${userId}@example.com'
          },
          handler: function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'success',
              data: response
            }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'cancel'
              }));
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.open();
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'success') {
      setShowRazorpay(false);
      onSuccess(data.data);
    } else if (data.type === 'cancel') {
      setShowRazorpay(false);
      onCancel();
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePayment}
      >
        <Text style={styles.buttonText}>Pay Now</Text>
      </TouchableOpacity>

      <Modal visible={showRazorpay} transparent={true}>
        <View style={styles.modalContainer}>
          <WebView
            source={{ html: htmlContent }}
            onMessage={handleMessage}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator 
                size="large" 
                color="#4169E1" 
                style={styles.loader} 
              />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4169E1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -15 },
      { translateY: -15 }
    ],
  }
});