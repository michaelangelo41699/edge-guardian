 import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AnalysisResult } from '../services/guardianApi';

  interface Props {
    loading: boolean;
    result: AnalysisResult | null;
  }

  export const GuardianResponse = ({ loading, result }: Props) => {
    if (loading) {
      return (
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Scanning for manipulation...</Text>
        </View>
      );
    }

    if (!result) return null;

    // Color Logic - Now handles UNKNOWN verdict for errors
    const isDanger = result.verdict === 'DANGER';
    const isCaution = result.verdict === 'CAUTION';
    const isUnknown = result.verdict === 'UNKNOWN';

    // UNKNOWN = Gray, Danger = Red, Caution = Orange, Safe = Green
    const bg = isUnknown ? '#f5f5f5' : isDanger ? '#ffebee' : isCaution ? '#fff3e0' : '#e8f5e9';
    const text = isUnknown ? '#757575' : isDanger ? '#c62828' : isCaution ? '#ef6c00' : '#2e7d32';

    return (
      <View style={[styles.card, { backgroundColor: bg, borderColor: text }]}>
        <View style={styles.header}>
          <Text style={[styles.verdict, { color: text }]}>
            {isUnknown ? '⚠️ ERROR' : result.verdict}
          </Text>
          <View style={[styles.badge, { backgroundColor: text }]}>
              <Text style={styles.score}>{result.score}/100 Risk</Text>
          </View>
        </View>

        <Text style={styles.tactic}>{result.tactic?.toUpperCase() || 'UNKNOWN'}</Text>
        <Text style={styles.explanation}>{result.explanation || 'Unable to analyze image. Please try again.'}</Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    card: {
      width: '100%',
      padding: 20,
      borderRadius: 16,
      marginTop: 20,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ddd',
      // Shadow
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    loadingText: { textAlign: 'center', marginTop: 10, color: '#666', fontSize: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    verdict: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    score: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    tactic: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, letterSpacing: 0.5 },        
    explanation: { fontSize: 16, color: '#444', lineHeight: 22 },
  });
