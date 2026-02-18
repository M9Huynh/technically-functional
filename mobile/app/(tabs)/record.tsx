import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { getPoseData } from '../../lib/poseService';
import { saveMetrics } from '../../lib/metricsService';
import PrimaryButton from "../../components/primaryButton";
import ScreenContainer from '@/components/screenContainer';

export default function Record() {
  const router = useRouter();
  
  const [imageData, setImageData] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const lastUpdateRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchPoseFrame = async () => {
    if (!isMountedRef.current) return;
    const now = Date.now();
    
    if (now - lastUpdateRef.current < 50) {
      return;
    }
    
    lastUpdateRef.current = now;
    setIsLoading(true);
    
    try {
      const data = await getPoseData();
      if (data.image) {
        const dataUri = `data:image/jpeg;base64,${data.image}`;
        setImageData(dataUri);
        setMetrics(data.metrics);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error getting image from server: ', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    setStreaming(!streaming);
  };

  const handleSaveMetrics = async () => {
  if (!metrics || isSaving) return;
  
  try {
    setIsSaving(true);
    
    const metricsData = {
      angle: metrics.angle || 0,
      rom_degree: metrics.rom_degree || 0,
      min_degree: metrics.min_degree || 0,
      max_degree: metrics.max_degree || 0,
      rep_count: metrics.rep_count || 0,
      rep_state: metrics.rep_state || 'none',
      avg_rep_duration: metrics.avg_rep_duration || 0, 
      current_rep_duration: metrics.current_rep_duration || 0, 
      timestamp: Date.now(),
    };
    
    await saveMetrics(metricsData);
    
    router.push('/progress');
    
  } catch (error: any) {
    console.error('Error saving metrics:', error);
    Alert.alert('Error', error.message || 'Failed to save metrics');
  } finally {
    setIsSaving(false);
  }
};

  useEffect(() => {
    isMountedRef.current = true;
    
    if (streaming) {
      intervalRef.current = setInterval(fetchPoseFrame, 100);
      fetchPoseFrame();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [streaming]);

  useEffect(() => {
    fetchPoseFrame();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <ScreenContainer> 
      <ScrollView>
        <View style={{ height: 300, backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 20, justifyContent: 'center', alignItems: 'center' }}>
          {isLoading && !imageData ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : imageData ? (
            <Image
              source={{ uri: imageData }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.text}>No image available</Text>
          )}
        </View>

        {error && (
          <View>
            <Text style={{ color: 'red' }}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          label={streaming ? "Stop Recording" : "Start Recording"}
          onPress={handleToggleRecording}
        />

        <PrimaryButton
          label={isSaving ? "Saving..." : "Save Metrics & View Progress"}
          onPress={handleSaveMetrics}
        />
        
        {metrics && (
          <View style={{justifyContent: 'center', alignItems: 'center'}}>
            <Text>
              Live Metrics
            </Text>
            <View>
              <View>
                <Text style={styles.subheading}>Current Angle</Text>
                <Text>
                  {metrics.angle ? `${metrics.angle.toFixed(1)}°` : '--'}
                </Text>
              </View>
              <View>
                <Text style={styles.subheading}>Range of Motion</Text>
                <Text>
                  {metrics.rom_degree ? `${metrics.rom_degree.toFixed(1)}°` : '--'}
                </Text>
              </View>     
              <View>
                <Text style={styles.subheading}>Minimum Angle</Text>
                <Text>
                  {metrics.min_degree ? `${metrics.min_degree.toFixed(1)}°` : '--'}
                </Text>
              </View>
              <View>
                <Text style={styles.subheading}>Number of reps</Text>
                <Text>
                  {metrics.rep_count !== undefined ? metrics.rep_count.toString() : '--'}
                </Text>
              </View>
              <View>
                <Text style={styles.subheading}>rep state</Text>
                <Text>
                  {metrics.rep_state || '--'} 
                </Text>
              </View>
              <View>
                <Text style={styles.subheading}>Maximum Angle</Text>
                <Text>
                  {metrics.max_degree ? `${metrics.max_degree.toFixed(1)}°` : '--'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  subheading: { fontSize: 18, fontWeight: "200", marginBottom: 8 },
  text: { color: "#666", textAlign: "center" },
});