"use client";

import { useState, useEffect } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
}

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    touchDevice: false
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = width > height ? 'landscape' : 'portrait';
      const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
        touchDevice
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize events
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
}

// Hook for responsive breakpoints
export function useResponsiveBreakpoints() {
  const { screenWidth } = useMobileDetection();

  return {
    xs: screenWidth < 480,    // Extra small devices
    sm: screenWidth >= 480 && screenWidth < 640,   // Small devices
    md: screenWidth >= 640 && screenWidth < 768,   // Medium devices
    lg: screenWidth >= 768 && screenWidth < 1024,  // Large devices
    xl: screenWidth >= 1024 && screenWidth < 1280, // Extra large devices
    xxl: screenWidth >= 1280, // 2X large devices
    mobile: screenWidth < 768,
    tablet: screenWidth >= 768 && screenWidth < 1024,
    desktop: screenWidth >= 1024
  };
}

// Hook for touch interactions
export function useTouchInteractions() {
  const { touchDevice } = useMobileDetection();
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return null;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Minimum swipe distance
    const minSwipeDistance = 50;

    if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) return null;

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      return deltaX > 0 ? 'left' : 'right';
    } else {
      // Vertical swipe
      return deltaY > 0 ? 'up' : 'down';
    }
  };

  const resetTouch = () => {
    setTouchStart(null);
    setTouchEnd(null);
  };

  return {
    touchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouch,
    touchStart,
    touchEnd
  };
}
