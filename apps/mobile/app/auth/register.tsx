import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Input from '../../components/Input';
import Button from '../../components/Button';
import api from '../../services/api';

export default function Register() {
    const router = useRouter();
    const { control, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        try {
            await api.post('/auth/register/', {
                username: data.username,
                email: data.email,
                password: data.password
            });
            Alert.alert('Success', 'Account created! Please log in.');
            router.back();
        } catch (error: any) {
            console.error('Registration error:', error.response?.data || error.message);
            Alert.alert('Error', 'Registration failed. Check console for details.');
        }
    };

    return (
        <View className="flex-1 justify-center p-6 bg-white">
            <Text className="text-3xl font-bold mb-8 text-center text-green-600">Join ALF</Text>

            <Input
                control={control}
                name="username"
                placeholder="Username"
                rules={{ required: 'Username is required' }}
            />

            <Input
                control={control}
                name="email"
                placeholder="Email"
                rules={{ required: 'Email is required' }}
            />

            <Input
                control={control}
                name="password"
                placeholder="Password"
                secureTextEntry
                rules={{ required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } }}
            />

            <Button
                title="Sign Up"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="mt-4 bg-green-600"
            />

            <Button
                title="Back to Login"
                onPress={() => router.back()}
                variant="outline"
                className="mt-4"
            />
        </View>
    );
}
