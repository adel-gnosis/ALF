import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
    const router = useRouter();

    return (
        <View className="flex-1 items-center justify-center bg-blue-500">
            <Text className="text-white text-4xl font-bold mb-8">ALF</Text>
            <Text className="text-white text-lg mb-4">Learn French</Text>

            <TouchableOpacity
                onPress={() => router.push('/auth/login')}
                className="bg-white px-6 py-3 rounded-full"
            >
                <Text className="text-blue-500 font-bold">Get Started</Text>
            </TouchableOpacity>
        </View>
    );
}
