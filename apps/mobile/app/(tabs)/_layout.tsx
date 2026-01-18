import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    right: 20,
                    height: 70,
                    borderRadius: 25,
                    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF',
                    borderTopWidth: 0,
                    paddingBottom: 10,
                    paddingTop: 10,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                },
                tabBarIconStyle: {
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            backgroundColor: focused ? '#EFF6FF' : 'transparent',
                            padding: 8,
                            borderRadius: 12,
                        }}>
                            <Ionicons 
                                name={focused ? "home" : "home-outline"} 
                                size={24} 
                                color={color} 
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="courses"
                options={{
                    title: 'Cours',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            backgroundColor: focused ? '#EFF6FF' : 'transparent',
                            padding: 8,
                            borderRadius: 12,
                        }}>
                            <Ionicons 
                                name={focused ? "book" : "book-outline"} 
                                size={24} 
                                color={color} 
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="practice"
                options={{
                    title: 'Pratiquer',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            backgroundColor: focused ? '#3B82F6' : '#EFF6FF',
                            padding: 12,
                            borderRadius: 20,
                            marginTop: -20,
                            borderWidth: 4,
                            borderColor: '#FFFFFF',
                            elevation: focused ? 8 : 4,
                            shadowColor: '#3B82F6',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: focused ? 0.4 : 0.2,
                            shadowRadius: 8,
                        }}>
                            <Ionicons 
                                name={focused ? "flash" : "flash-outline"} 
                                size={28} 
                                color={focused ? '#FFFFFF' : color} 
                            />
                        </View>
                    ),
                    tabBarLabel: () => null, // Hide label for center button
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progrès',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            backgroundColor: focused ? '#EFF6FF' : 'transparent',
                            padding: 8,
                            borderRadius: 12,
                        }}>
                            <Ionicons 
                                name={focused ? "stats-chart" : "stats-chart-outline"} 
                                size={24} 
                                color={color} 
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            backgroundColor: focused ? '#EFF6FF' : 'transparent',
                            padding: 8,
                            borderRadius: 12,
                        }}>
                            <Ionicons 
                                name={focused ? "person" : "person-outline"} 
                                size={24} 
                                color={color} 
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="levels"
                options={{
                    href: null, // Hide from tab bar but keep route accessible
                }}
            />
        </Tabs>
    );
}