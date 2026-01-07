import * as ImagePicker from 'expo-image-picker';
import { useShareIntent } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { analyzeImageStream, getHistory } from '@/components/services/guardianApi';
import { GuardianResponse } from '@/components/ui/GuardianResponse';

export default function HomeScreen() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);

  // Load history when app starts
  useEffect(() => {
    loadHistory();
  }, []);

  // Load history function
  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  // Handle incoming share intents
  useEffect(() => {
    const handleShare = async () => {
      if (hasShareIntent && shareIntent?.type === 'media' && shareIntent.files) {
        const shareFile = shareIntent.files[0];
        handleAnalysis(shareFile.path);
      }
    };

    handleShare();
  }, [hasShareIntent, shareIntent]);

  // Action to manually handle an image upload
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
      allowsEditing: true,
    });

    if (!result.canceled) {
      handleAnalysis(result.assets[0].uri);
    }
  };

  const handleAnalysis = async (uri: string) => {
    setImageUri(uri);
    setLoading(true);
    setError(null);
    setAnalysis("");

    try {
      await analyzeImageStream(uri, (newWord) => {
        setLoading(false);
        setAnalysis((prev) => (prev || "") + newWord);
      });

      // Reload history after analysis completes
      loadHistory();
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  // Ping test to verify connection
  const testConnection = async () => {
    try {
      console.log("Pinging server...");
      const res = await fetch("https://edge-guardian.michaelangelo41699.workers.dev/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          prompt: "Ping test. Just say Pong.",
          stream: false
        })
      });
      const text = await res.text();
      console.log("Server says:", text);
      setAnalysis("Connection Success: " + text.substring(0, 200));
    } catch (e: any) {
      console.error("Ping failed:", e);
      setError("Ping Failed: " + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edge Guardian v1.0</Text>
          <Text style={styles.subtitle}>System Status: <Text style={styles.online}>ONLINE</Text></Text>
        </View>

        {/* Show the image being analyzed */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        )}

        {/* Guardian Response Component */}
        <GuardianResponse loading={loading} analysis={analysis} error={error} />

        {/* Test Connection Button */}
        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Text style={styles.buttonText}>TEST CONNECTION (NO IMAGE)</Text>
        </TouchableOpacity>

        {/* Button to pick an image for analysis */}
        <TouchableOpacity style={styles.analyzeButton} onPress={pickImage}>
          <Text style={styles.buttonText}>SELECT IMAGE FOR ANALYSIS</Text>
        </TouchableOpacity>

        {/* Reset/Clear Button */}
        {analysis && (
          <TouchableOpacity style={styles.resetButton} onPress={() => {
            setImageUri(null);
            setAnalysis(null);
            setError(null);
          }}>
            <Text style={styles.buttonText}>CLEAR</Text>
          </TouchableOpacity>
        )}

        {/* Recent Scans History */}
        {history.length > 0 && (
          <>
            <Text style={styles.historyTitle}>RECENT SCANS</Text>
            <FlatList
              data={history}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <Text style={styles.historyPrompt} numberOfLines={1}>
                    {item.prompt || "Analysis"}
                  </Text>
                  <Text style={styles.historyAnalysis} numberOfLines={2}>
                    {item.analysis}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
              )}
            />
          </>
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
    borderBottomColor: '#C0C0C0',
    paddingBottom: 20,
    marginBottom: 20,
  },
  title: {
    color: '#39FF14',
    fontSize: 28,
    fontFamily: 'Courier',
    textShadowColor: 'rgba(57, 255, 20, 0.8)',
    textShadowRadius: 12,
    letterSpacing: 2,
  },
  subtitle: {
    color: '#C0C0C0',
    fontFamily: 'Courier',
    marginTop: 5,
    fontSize: 14,
  },
  online: {
    color: '#39ff14',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C0C0C0',
    marginBottom: 20,
    resizeMode: 'contain',
    backgroundColor: '#111',
  },
  testButton: {
    borderWidth: 1,
    borderColor: '#FFA500',
    padding: 15,
    borderRadius: 2,
    marginBottom: 10,
  },
  analyzeButton: {
    borderWidth: 1,
    borderColor: '#39FF14',
    padding: 15,
    borderRadius: 2,
    marginBottom: 10,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#C0C0C0',
    padding: 15,
    borderRadius: 2,
  },
  buttonText: {
    color: '#C0C0C0',
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: 'Courier',
  },
  historyTitle: {
    color: '#39FF14',
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    letterSpacing: 2,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#39FF14',
  },
  historyPrompt: {
    color: '#39FF14',
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  historyAnalysis: {
    color: '#C0C0C0',
    fontSize: 12,
    fontFamily: 'Courier',
    marginBottom: 5,
  },
  historyTime: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'Courier',
  },
});
