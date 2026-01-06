import { TextInput, View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import clsx from 'clsx';

interface InputProps {
    control: any;
    name: string;
    placeholder?: string;
    secureTextEntry?: boolean;
    rules?: any;
    className?: string;
}

export default function Input({
    control,
    name,
    placeholder,
    secureTextEntry,
    rules,
    className
}: InputProps) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View className="mb-4">
                    <TextInput
                        placeholder={placeholder}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        secureTextEntry={secureTextEntry}
                        className={clsx(
                            "bg-gray-100 p-4 rounded-xl text-lg border-2",
                            error ? "border-red-500" : "border-transparent focus:border-blue-500",
                            className
                        )}
                        placeholderTextColor="#9CA3AF"
                    />
                    {error && (
                        <Text className="text-red-500 text-sm mt-1 ml-1">
                            {error.message || 'Error'}
                        </Text>
                    )}
                </View>
            )}
        />
    );
}
