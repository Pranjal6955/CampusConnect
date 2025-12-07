import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getPermissionExplanation, PermissionType } from '../utils/permissions';

interface PermissionRequestModalProps {
  visible: boolean;
  permissionType: PermissionType;
  onGrant: () => void;
  onDeny: () => void;
  onClose?: () => void;
}

export default function PermissionRequestModal({
  visible,
  permissionType,
  onGrant,
  onDeny,
  onClose,
}: PermissionRequestModalProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const explanation = getPermissionExplanation(permissionType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onDeny}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <View
          className={`rounded-3xl p-6 w-full max-w-sm ${isDark ? 'bg-gray-900' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className={`w-16 h-16 rounded-full items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}
            >
              <Ionicons
                name={explanation.icon as any}
                size={32}
                color="#0EA5E9"
              />
            </View>
          </View>

          {/* Title */}
          <Text
            className={`text-xl font-bold text-center mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {explanation.title}
          </Text>

          {/* Description */}
          <Text
            className={`text-base text-center mb-6 leading-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            {explanation.shortDescription}
          </Text>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onDeny}
              className={`flex-1 py-3 rounded-xl items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <Text
                className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {t('permissions.later')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onGrant}
              className="flex-1 py-3 rounded-xl items-center bg-blue-500"
            >
              <Text className="font-semibold text-white">
                {t('permissions.grant')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional note for location */}
          {permissionType === 'location' && (
            <Text
              className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
            >
              {t('permissions.optionalNote')}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
