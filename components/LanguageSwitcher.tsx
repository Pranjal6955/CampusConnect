import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../config/i18n';

interface LanguageSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

export default function LanguageSwitcher({
  visible,
  onClose,
}: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setCurrentLang(langCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: isDark ? '#fff' : '#000',
              }}
            >
              {t('profile.selectLanguage')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          </View>

          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 8,
                backgroundColor:
                  currentLang === lang.code
                    ? isDark
                      ? 'rgba(14, 165, 233, 0.2)'
                      : 'rgba(14, 165, 233, 0.1)'
                    : 'transparent',
                borderWidth: 1,
                borderColor:
                  currentLang === lang.code
                    ? '#0EA5E9'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.1)',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDark ? '#fff' : '#000',
                    marginBottom: 4,
                  }}
                >
                  {lang.name}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  {lang.nativeName}
                </Text>
              </View>
              {currentLang === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color="#0EA5E9" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
