import { useState, useEffect } from 'react';
import { startWatchingPosition } from '../platform/location';

export const useGeolocation = (targetLat, targetLng) => {
  const [state, setState] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });
  const [distance, setDistance] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const stopWatching = startWatchingPosition({
      onSuccess: (position) => {
        const { latitude, longitude, accuracy } = position;

        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          loading: false,
        });

        if (targetLat !== undefined && targetLng !== undefined) {
          const dist = calculateDistance(latitude, longitude, targetLat, targetLng);
          setDistance(dist);
        }
      },
      onError: (geoError) => {
        setState((prev) => ({
          ...prev,
          error: geoError?.message || 'Không thể lấy dữ liệu GPS.',
          loading: false,
        }));
      },
      options: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    });

    return () => {
      if (typeof stopWatching === 'function') {
        stopWatching();
      }
    };
  }, [targetLat, targetLng]);

  return { ...state, distance };
};
