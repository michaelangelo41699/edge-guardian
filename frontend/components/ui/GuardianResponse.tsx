import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

interface GuardianResponseProps {
    loading: boolean;
    analysis: string | null;  // ← Now accepts null!
    error: string | null;
}

// Define our "Guardian Terminal" Palette
const COLORS = {
  BG_DARK: '#0D0D0D',      // Deepest black background
  BG_TERMINAL: '#1A1A1A',  // Slightly lighter for the text area
  ACCENT_CYBER: '#00FF9D', // Neon green for highlights/loading
  TEXT_PRIMARY: '#E0E0E0', // Off-white for readability
  TEXT_DIM: '#6E6E6E',     // Dimmed text for placeholders
  BORDER: '#333333',       // Subtle borders
  ERROR_BG: '#2A0000',     // Dark red background for errors
  ERROR_TEXT: '#FF3333',   // Bright red text for errors
};

// Platform-specific monospace font selection
const MONO_FONT = Platform.select({
  ios: 'Menlo', // Or 'Courier New'
  android: 'monospace',
  default: 'monospace',
});

export const GuardianResponse = ({ loading, analysis, error }: GuardianResponseProps) => {
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color='#007AFF' />
                <Text style={styles.statusText}>Analyzing image...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    if (!analysis) {
        return (
            <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Share an image to see analysis results.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.resultContainer} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.header}>Edge Guardian Analysis</Text>
            <Text style={styles.bodyText}>{analysis}</Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
    placeholderContainer: { padding: 40, alignItems: 'center', opacity: 0.5 },
    placeholderText: { textAlign: 'center', fontSize: 16, color: '#666' },
    statusText: { marginTop: 10, fontSize: 16, color: '#666' },
    errorContainer: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 20 },
    errorText: { color: '#D32F2F', fontSize: 16 },
    resultContainer: { flex: 1, width: '100%', marginTop: 20, backgroundColor: '#F5F5F7', borderRadius: 12 },
    scrollContent: { padding: 20 },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1C1C1E' },
    bodyText: { fontSize: 16, lineHeight: 24, color: '#333' },
});
