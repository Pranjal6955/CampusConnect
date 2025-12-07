import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../../config/firebase';
import {
  getRoleBasedRoute,
  getUserRole,
  storeUserData,
  storeUserRole,
} from '../../utils/auth';

export default function Login() {
  const { t } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('login');
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const role = await getUserRole(user.uid);

      // If user is authenticated but not found in Firestore, redirect to signup to complete profile
      if (!role) {
        Alert.alert(t('auth.profileIncomplete'), t('auth.completeProfile'), [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/signup'),
          },
        ]);
        return;
      }

      // Store user role and data
      await storeUserRole(user.uid, role);
      // Fetch and store user data
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        await storeUserData(userDoc.data());
      }

      // Navigate based on role and eventId (if present from deep link)
      if (eventId) {
        // If there's an eventId from deep link, navigate to that event
        if (role === 'student') {
          router.replace(`/(student)/events/${eventId}` as any);
        } else if (role === 'organizer') {
          router.replace(`/(organizer)/events/${eventId}` as any);
        } else {
          const route = getRoleBasedRoute(role);
          router.replace(route as any);
        }
      } else {
        // Normal navigation based on role
        const route = getRoleBasedRoute(role);
        // Ensure students are redirected to the student section
        if (role === 'student') {
          router.replace('/(student)/events' as any);
        } else {
          router.replace(route as any);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || t('auth.loginFailed');
      Alert.alert(t('auth.loginFailed'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'}`}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 py-12">
          {/* Icon Section */}
          <View className="items-center mb-8 mt-8">
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                position: 'relative',
              }}
            >
              {/* Neon Circle Outer Glow */}
              <View
                style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: '#0EA5E9',
                  shadowColor: '#0EA5E9',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 25,
                  elevation: 25,
                }}
              />
              {/* Neon Circle Inner */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: '#0EA5E9',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#00FFFF',
                  shadowColor: '#00FFFF',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                  elevation: 20,
                }}
              >
                <Ionicons
                  name="school"
                  size={55}
                  color="#fff"
                  style={{
                    shadowColor: '#fff',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    textShadowColor: '#00FFFF',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 10,
                  }}
                />
              </View>
              {/* Neon Accent Dots */}
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#00FFFF',
                  shadowColor: '#00FFFF',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#8B5CF6',
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              />
            </View>
            {/* Logo Text */}
            <View className="items-center mt-2">
              <Text
                className="text-2xl font-bold"
                style={{
                  color: '#0EA5E9',
                  letterSpacing: 1,
                }}
              >
                {t('common.appName')}
              </Text>
              <View
                style={{
                  width: 60,
                  height: 3,
                  backgroundColor: '#0EA5E9',
                  borderRadius: 2,
                  marginTop: 4,
                }}
              />
            </View>
          </View>

          {/* Title Section */}
          <View className="items-center mb-6">
            <Text
              className="text-3xl font-bold mb-2"
              style={{ color: isDark ? '#fff' : '#000' }}
            >
              {t('common.welcome')}
            </Text>
            <Text
              className={isDark ? 'text-gray-400' : 'text-gray-600'}
              style={{
                fontSize: 14,
                textAlign: 'center',
                paddingHorizontal: 20,
              }}
            >
              {t('common.welcomeSubtitle')}
            </Text>
          </View>

          {/* Tab Navigation */}
          <View
            className="flex-row mb-6 bg-gray-200 rounded-lg p-1"
            style={{
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            <Link href="/signup" asChild>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === 'signup' ? '#0EA5E9' : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    color:
                      activeTab === 'signup'
                        ? '#fff'
                        : isDark
                          ? '#9CA3AF'
                          : '#6B7280',
                  }}
                >
                  {t('auth.signup')}
                </Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity
              onPress={() => setActiveTab('login')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'login' ? '#0EA5E9' : 'transparent',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '600',
                  color:
                    activeTab === 'login'
                      ? '#fff'
                      : isDark
                        ? '#9CA3AF'
                        : '#6B7280',
                }}
              >
                {t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          <View>
            {/* Email Input */}
            <View className="mb-4">
              <Text
                className="text-sm font-semibold mb-2"
                style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
              >
                {t('auth.email')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.9)',
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: isDark ? '#fff' : '#000',
                }}
                placeholder={t('auth.enterEmail')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text
                className="text-sm font-semibold mb-2"
                style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
              >
                {t('auth.password')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.9)',
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)',
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: isDark ? '#fff' : '#000',
                  }}
                  placeholder={t('auth.enterPassword')}
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ paddingHorizontal: 16 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: '#0EA5E9',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 8,
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}
                >
                  {t('auth.login')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
