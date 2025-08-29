import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';

/**
 * Simple webcam dialog that captures a single JPEG frame as base64 (no prefix)
 */
export default function FaceCaptureDialog({ open, title = 'Capture Face', onClose, onCapture }) {
  const videoRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream;
    (async () => {
      if (!open) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error('Camera error', e);
      }
    })();

    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [open]);

  const capture = async () => {
    setBusy(true);
    try {
      const v = videoRef.current;
      const MAX_W = 640;
      const scale = Math.min(1, MAX_W / (v.videoWidth || MAX_W));
      const w = Math.round((v.videoWidth || MAX_W) * scale);
      const h = Math.round((v.videoHeight || MAX_W) * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(v, 0, 0, w, h);

      // Encode to JPEG; strip the "data:image/jpeg;base64," prefix for backend
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      const base64 = dataUrl.split(',')[1];

      await onCapture(base64);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', placeItems: 'center', p: 1 }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={capture} disabled={busy}>Use This Frame</Button>
      </DialogActions>
    </Dialog>
  );
}
