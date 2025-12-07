import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface SuccessAnimationProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
  title?: string;
}

export default function SuccessAnimation({
  visible,
  onClose,
  message,
  title,
}: SuccessAnimationProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const displayMessage = message || t('events.joinSuccessMessage');
  const displayTitle = title || t('events.joinSuccessTitle');

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      checkmarkScale.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Checkmark animation
      setTimeout(() => {
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }).start();
      }, 150);

      // Auto close after 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1 }}>
        <BlurView
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <Animated.View
          className="flex-1 items-center justify-center px-6"
          style={{
            opacity: opacityAnim,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            <View
              className={`rounded-2xl p-8 items-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
              style={{
                minWidth: 280,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              {/* Checkmark Icon */}
              <Animated.View
                style={{
                  transform: [{ scale: checkmarkScale }],
                }}
              >
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{
                    backgroundColor: '#22c55e',
                  }}
                >
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
              </Animated.View>

              {/* Title */}
              <Text
                className={`text-xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {displayTitle}
              </Text>

              {/* Message */}
              <Text
                className={`text-sm text-center mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {displayMessage}
              </Text>

              {/* Close Button */}
              <TouchableOpacity
                onPress={handleClose}
                className="px-6 py-2.5 rounded-lg"
                style={{
                  backgroundColor: '#22c55e',
                }}
              >
                <Text className="text-white font-semibold text-sm">
                  {t('common.ok')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
