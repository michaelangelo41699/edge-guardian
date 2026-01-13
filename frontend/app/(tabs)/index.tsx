import * as ImagePicker from 'expo-image-picker';
import { useShareIntent } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import the types we defined
import { AnalysisResult, analyzeImage, getHistory } from '@/components/services/guardianApi';
// Make sure this path matches where you put the component
import { GuardianResponse } from '@/components/ui/GuardianResponse';

export default function HomeScreen() {
  const { hasShareIntent, shareIntent } = useShareIntent();
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // CHANGED: State now holds the Object, not just a string
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  // Load history when app starts
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  // Handle Share Intent (from other apps)
  useEffect(() => {
    const handleShare = async () => {
      if (hasShareIntent && shareIntent?.type === 'media' && shareIntent.files) {
        const shareFile = shareIntent.files[0];
        handleAnalysis(shareFile.path);
      }
    };
    handleShare();
  }, [hasShareIntent, shareIntent]);

  // Pick Image Function
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5, // Lower quality = Faster upload
    });

    if (!result.canceled) {
      handleAnalysis(result.assets[0].uri);
    }
  };

  // Main Analysis Logic
  const handleAnalysis = async (uri: string) => {
    setImageUri(uri);
    setLoading(true);
    setError(null);
    setAnalysis(null); // Clear previous result

    try {
      // Expecting an Object now, not a string
      const result = await analyzeImage(uri);
      setAnalysis(result);

      // Refresh history immediately
      loadHistory();
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  // Ping Test (Updated for JSON)
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Pinging server...");
      // We send a tiny 1x1 pixel image just to wake up the AI
      const res = await analyzeImage("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
      setAnalysis(res);
    } catch (e: any) {
      console.error("Ping failed:", e);
      setError("Ping Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edge Guardian v2.0</Text>
          <Text style={styles.subtitle}>System Status: <Text style={styles.online}>ONLINE</Text></Text>
        </View>

        {/* Image Preview */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        )}

        {/* Error Display */}
        {error && (
            <View style={styles.errorBox}>
                <Text style={styles.errorText}>ERROR: {error}</Text>
            </View>
        )}

        {/* Traffic Light Result Card */}
        {/* We pass 'result' because the component expects an object */}
        <GuardianResponse loading={loading} result={analysis} />

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.analyzeButton} onPress={pickImage}>
            <Text style={styles.buttonText}>SCAN IMAGE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={testConnection}>
            <Text style={styles.buttonText}>PING TEST</Text>
            </TouchableOpacity>

            {analysis && (
            <TouchableOpacity style={styles.resetButton} onPress={() => {
                setImageUri(null);
                setAnalysis(null);
                setError(null);
            }}>
                <Text style={styles.buttonText}>CLEAR</Text>
            </TouchableOpacity>
            )}
        </View>

        {/* History Section - UPDATED for New Data Structure */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>RECENT SCANS</Text>
            <FlatList
              data={history}
              scrollEnabled={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={[
                    styles.historyItem, 
                    // Dynamic Border Color based on Verdict
                    { borderLeftColor: item.verdict === 'DANGER' ? '#ff3333' : item.verdict === 'CAUTION' ? '#ffa500' : '#39FF14' }
                ]}>
                  <View style={styles.historyHeader}>
                      <Text style={[
                          styles.historyVerdict, 
                          { color: item.verdict === 'DANGER' ? '#ff3333' : item.verdict === 'CAUTION' ? '#ffa500' : '#39FF14'}
                        ]}>
                        {item.verdict}
                      </Text>
                      <Text style={styles.historyTime}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}
                      </Text>
                  </View>
                  
                  <Text style={styles.historyTactic}>{item.tactic}</Text>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 20,
    marginBottom: 20,
  },
  title: {
    color: '#39FF14',
    fontSize: 28,
    fontFamily: 'Courier', // Kept your Matrix font
    textShadowColor: 'rgba(57, 255, 20, 0.8)',
    textShadowRadius: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    fontFamily: 'Courier',
    marginTop: 5,
    fontSize: 12,
  },
  online: { color: '#39ff14' },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
    resizeMode: 'contain',
    backgroundColor: '#111',
  },
  errorBox: {
      padding: 15,
      backgroundColor: '#330000',
      borderWidth: 1,
      borderColor: 'red',
      marginBottom: 20,
  },
  errorText: { color: 'red', fontFamily: 'Courier' },
  
  // Buttons
  buttonContainer: { marginTop: 20 },
  testButton: {
    borderWidth: 1,
    borderColor: '#666',
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  analyzeButton: {
    backgroundColor: '#39FF14',
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    borderRadius: 4,
  },
  buttonText: {
    color: '#000', // Black text on green button looks cool
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'Courier',
  },

  // History
  historySection: { marginTop: 40 },
  historyTitle: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 2,
  },
  historyItem: {
    backgroundColor: '#111',
    padding: 15,
    marginBottom: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5
  },
  historyVerdict: {
      fontSize: 16,
      fontWeight: 'bold',
      fontFamily: 'Courier',
  },
  historyTactic: {
    color: '#eee',
    fontSize: 14,
    fontFamily: 'Courier',
  },
  historyTime: {
    color: '#444',
    fontSize: 10,
    fontFamily: 'Courier',
  },
});