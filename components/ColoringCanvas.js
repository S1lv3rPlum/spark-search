// Native fallback: shows the picture. Tap-to-fill painting is implemented for web
// (see ColoringCanvas.web.js); a native version would need a canvas library.
import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

export default function ColoringCanvas({ uri }) {
  return (
    <View style={styles.wrap}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      <Text style={styles.note}>Painting is available in the web version for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%' },
  image: { flex: 1, width: '100%' },
  note: { textAlign: 'center', color: '#7f8c8d', fontSize: 13, marginTop: 8 },
});
