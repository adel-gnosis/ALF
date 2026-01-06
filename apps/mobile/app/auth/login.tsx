import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import api from '../../services/api';
import { userApi } from '@alf/shared';

export default function Login() {
    const { signIn } = useAuth();
    const router = useRouter();
    const { control, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        try {
            const response = await api.post('/auth/login/', data);
            await signIn(response.data.access, response.data.refresh);

            // If native_language is 'fr' (default) or not set, user needs to pick their native language
            if (!response.data.user?.native_language || response.data.user?.native_language === 'fr') {
                router.replace('/language-selection');
            } else {
                router.replace('/(tabs)/dashboard');
            }
        } catch (error: any) {
            console.error('Login Error:', error.response?.data || error.message);
            Alert.alert('Login Failed', 'Invalid credentials');
        }
    };

    return (
        <View className="flex-1 justify-center p-6 bg-white">
            <Text className="text-3xl font-bold mb-8 text-center text-blue-600">Welcome Back</Text>

            <Input
                control={control}
                name="username"
                placeholder="Username"
                rules={{ required: 'Username is required' }}
            />

            <Input
                control={control}
                name="password"
                placeholder="Password"
                secureTextEntry
                rules={{ required: 'Password is required' }}
            />

            <Button
                title="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="mt-4"
            />

            <Button
                title="Create Account"
                onPress={() => router.push('/auth/register')}
                variant="outline"
                className="mt-4"
            />
        </View>
    );
}
