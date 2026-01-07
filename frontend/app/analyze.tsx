import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyzeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imageUri = params.imageUri as string;

  useEffect(() => {
    if (imageUri) {
      analyzeImage(imageUri);
    }
  }, [imageUri]);

  const analyzeImage = async (uri: string) => {
    try {
      setAnalyzing(true);
      setError(null);

      // TODO: Replace with your actual Cloudflare Worker endpoint
      const WORKER_URL = 'https://edge-guardian.michaelangelo41699.worker.dev';

      // Fetch the image file
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append('image', blob as any, 'shared-image.jpg');

      // Send to your Edge Guardian worker
      const workerResponse = await fetch(WORKER_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await workerResponse.json();

      if (data.safe !== undefined) {
        setResult(data.safe ? 'Image is SAFE ✓' : 'Image is UNSAFE ⚠️');
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edge Guardian Analysis</Text>

        {imageUri && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {analyzing && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#39FF14" />
            <Text style={styles.statusText}>Analyzing image...</Text>
            <Text style={styles.subText}>Scanning for threats</Text>
          </View>
        )}

        {!analyzing && result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Text style={styles.subText}>
              Make sure your Cloudflare Worker URL is configured
            </Text>
          </View>
        )}

        {!analyzing && (
          <Text
            style={styles.backButton}
            onPress={() => router.back()}
          >
            ← Back to Home
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#39FF14',
    fontSize: 24,
    fontFamily: 'Courier',
    marginBottom: 20,
    textShadowColor: 'rgba(57, 255, 20, 0.8)',
    textShadowRadius: 12,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  statusText: {
    color: '#39FF14',
    fontSize: 18,
    fontFamily: 'Courier',
    marginTop: 20,
  },
  subText: {
    color: '#C0C0C0',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#39FF14',
    borderRadius: 4,
    padding: 20,
    marginTop: 20,
    width: '100%',
  },
  resultText: {
    color: '#39FF14',
    fontSize: 20,
    fontFamily: 'Courier',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#1a0000',
    borderWidth: 2,
    borderColor: '#ff3914',
    borderRadius: 4,
    padding: 20,
    marginTop: 20,
    width: '100%',
  },
  errorText: {
    color: '#ff3914',
    fontSize: 16,
    fontFamily: 'Courier',
    textAlign: 'center',
  },
  backButton: {
    color: '#C0C0C0',
    fontSize: 16,
    marginTop: 30,
    textDecorationLine: 'underline',
  },
});
