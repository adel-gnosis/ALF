import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'outline' | 'ghost';
    className?: string;
}

export default function Button({
    title,
    onPress,
    disabled = false,
    loading = false,
    variant = 'primary',
    className = ''
}: ButtonProps) {
    const styles = {
        primary: 'bg-blue-500 ',
        outline: 'bg-transparent border-2 border-blue-500',
        ghost: 'bg-transparent',
    };

    const textStyles = {
        primary: 'text-white',
        outline: 'text-blue-500',
        ghost: 'text-blue-500',
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={`px-6 py-3 rounded-lg flex-row items-center justify-center ${styles[variant]
                } ${disabled || loading ? 'opacity-50' : ''} ${className}`}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : '#3B82F6'} />
            ) : (
                <Text className={`font-semibold ${textStyles[variant]}`}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}
