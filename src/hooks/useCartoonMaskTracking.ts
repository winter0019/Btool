import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';

export interface MaskTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
}

const LEFT_EYE_INDEX = 33;
const RIGHT_EYE_INDEX = 263;
const NOSE_TIP_INDEX = 1;
const MOUTH_CENTER_INDEX = 13;

export const useCartoonMaskTracking = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  maskImageRef: React.RefObject<HTMLImageElement | null>,
  isActive: boolean
) => {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [showLowLightWarning, setShowLowLightWarning] = useState(false);

  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const requestRef = useRef<number | null>(null);
  const lowLightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const smoothedRef = useRef<MaskTransform>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    visible: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detectorRef.current = await faceLandmarksDetection.createDetector(model, {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1,
        });
      } catch (error) {
        console.error('Failed to load landmarks detector:', error);
      } finally {
        setIsModelLoading(false);
      }
    };

    load();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (lowLightTimerRef.current) clearTimeout(lowLightTimerRef.current);
    };
  }, []);

  const drawMask = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const maskImg = maskImageRef.current;

    if (!detector || !video || !canvas || !isActive) {
      requestRef.current = requestAnimationFrame(drawMask);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(drawMask);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const faces = await detector.estimateFaces(video, { flipHorizontal: false });

      if (!faces.length || !faces[0].keypoints?.length) {
        setIsFaceDetected(false);
        smoothedRef.current.visible = false;

        if (!lowLightTimerRef.current) {
          lowLightTimerRef.current = setTimeout(() => {
            setShowLowLightWarning(true);
          }, 4000);
        }

        requestRef.current = requestAnimationFrame(drawMask);
        return;
      }

      setIsFaceDetected(true);
      setShowLowLightWarning(false);
      if (lowLightTimerRef.current) {
        clearTimeout(lowLightTimerRef.current);
        lowLightTimerRef.current = null;
      }

      const pts = faces[0].keypoints;
      const leftEye = pts[LEFT_EYE_INDEX];
      const rightEye = pts[RIGHT_EYE_INDEX];
      const nose = pts[NOSE_TIP_INDEX];
      const mouth = pts[MOUTH_CENTER_INDEX];

      if (!leftEye || !rightEye || !nose || !mouth || !maskImg) {
        requestRef.current = requestAnimationFrame(drawMask);
        return;
      }

      const dx = rightEye.x - leftEye.x;
      const dy = rightEye.y - leftEye.y;
      const eyeDistance = Math.sqrt(dx * dx + dy * dy);
      const rotation = Math.atan2(dy, dx);

      const targetWidth = eyeDistance * 2.6;
      const targetHeight = targetWidth;
      const targetX = nose.x;
      const targetY = (nose.y + mouth.y) / 2 - targetHeight * 0.12;

      const alpha = 0.28;

      const prev = smoothedRef.current;
      const next: MaskTransform = {
        x: prev.visible ? prev.x * (1 - alpha) + targetX * alpha : targetX,
        y: prev.visible ? prev.y * (1 - alpha) + targetY * alpha : targetY,
        width: prev.visible ? prev.width * (1 - alpha) + targetWidth * alpha : targetWidth,
        height: prev.visible ? prev.height * (1 - alpha) + targetHeight * alpha : targetHeight,
        rotation: prev.visible ? prev.rotation * (1 - alpha) + rotation * alpha : rotation,
        visible: true,
      };

      smoothedRef.current = next;

      ctx.save();
      ctx.translate(next.x, next.y);
      ctx.rotate(next.rotation);
      ctx.drawImage(maskImg, -next.width / 2, -next.height / 2, next.width, next.height);
      ctx.restore();
    } catch (error) {
      console.error('Mask tracking error:', error);
    }

    requestRef.current = requestAnimationFrame(drawMask);
  }, [isActive, overlayCanvasRef, videoRef, maskImageRef]);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(drawMask);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, drawMask]);

  return {
    isModelLoading,
    isFaceDetected,
    showLowLightWarning,
  };
};
