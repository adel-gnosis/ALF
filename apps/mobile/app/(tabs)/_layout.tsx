import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
            }}>
            <Tabs.Screen
                name="courses"
                options={{
                    title: 'Matières',
                    tabBarIcon: ({ color }) => <Ionicons name="library" size={24} color={color} />,
                    href: '/(tabs)/courses', // explicit href to ensure routing
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
                    href: null, // Hide Dashboard if replacing flow, or keep it. Let's keep it but put Courses first. 
                }}
            />
            <Tabs.Screen
                name="levels"
                options={{
                    title: 'Niveaux',
                    tabBarIcon: ({ color }) => <Ionicons name="layers" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="practice"
                options={{
                    title: 'Pratique',
                    tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progrès',
                    tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
