import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function Index() {
    const { t } = useTranslation();
    const router = useRouter();

    return (
        <View className="flex-1 items-center justify-center bg-blue-500">
            <Text className="text-white text-4xl font-bold mb-8">{t('index.title')}</Text>
            <Text className="text-white text-lg mb-4">{t('index.subtitle')}</Text>

            <TouchableOpacity
                onPress={() => router.push('/auth/login')}
                className="bg-white px-6 py-3 rounded-full"
            >
                <Text className="text-blue-500 font-bold">{t('index.getStarted')}</Text>
            </TouchableOpacity>
        </View>
    );
}

