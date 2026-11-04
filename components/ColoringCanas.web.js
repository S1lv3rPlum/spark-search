import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { floodFill, hexToRgb } from '../utils/floodFill';

const MAX_SIZE = 900; // longest side in pixels, keeps fills fast
const MAX_UNDO = 15;

export default function ColoringCanvas({ uri, color }) {
  const canvasRef = useRef(null);
  const originalRef = useRef(null);
  const undoRef = useRef([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    setStatus('loading');
    undoRef.current = [];
    setUndoCount(0);
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // needed so the canvas can be read back for filling
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff'; // transparent PNGs get a white page behind the lines
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        originalRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setStatus('ready');
      } catch (e) {
        setStatus('error'); // canvas was tainted: image host sent no CORS headers
      }
    };
    img.onerror = () => setStatus('error');
    img.src = uri;
  }, [uri]);

  const handleClick = (e) => {
    if (status !== 'ready') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) * canvas.width) / rect.width);
    const y = Math.floor(((e.clientY - rect.top) * canvas.height) / rect.height);
    const before = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const work = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (floodFill(work, x, y, hexToRgb(color))) {
      undoRef.current.push(before);
      if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
      setUndoCount(undoRef.current.length);
      ctx.putImageData(work, 0, 0);
    }
  };

  const handleUndo = () => {
    const prev = undoRef.current.pop();
    if (prev) canvasRef.current.getContext('2d').putImageData(prev, 0, 0);
    setUndoCount(undoRef.current.length);
  };

  const handleStartOver = () => {
    if (!originalRef.current) return;
    canvasRef.current.getContext('2d').putImageData(originalRef.current, 0, 0);
    undoRef.current = [];
    setUndoCount(0);
  };

  const handleSave = () => {
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'my-coloring-page.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  return (
    <View style={styles.wrap}>
      {status === 'ready' && (
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.tool, undoCount === 0 && styles.toolDisabled]}
            onPress={handleUndo}
            disabled={undoCount === 0}
          >
            <Text style={styles.toolText}>↩ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tool} onPress={handleStartOver}>
            <Text style={styles.toolText}>🧽 Start over</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tool} onPress={handleSave}>
            <Text style={styles.toolText}>💾 Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === 'loading' && <Text style={styles.message}>Getting your page ready…</Text>}
      {status === 'error' && (
        <>
          <Text style={styles.message}>This picture can't be painted. Try another one!</Text>
          {React.createElement('img', { src: uri, alt: '', style: imgStyle })}
        </>
      )}
      {React.createElement('canvas', {
        ref: canvasRef,
        onClick: handleClick,
        style: { ...canvasStyle, display: status === 'ready' ? 'block' : 'none' },
      })}
    </View>
  );
}

const canvasStyle = {
  maxWidth: '100%',
  maxHeight: '55vh',
  background: '#ffffff',
  cursor: 'crosshair',
  touchAction: 'manipulation',
  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
};
const imgStyle = { maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' };

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  toolbar: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tool: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#667eea',
  },
  toolDisabled: { opacity: 0.4 },
  toolText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  message: { fontSize: 16, color: '#2c3e50', marginBottom: 12, textAlign: 'center' },
});
