import React from 'react';
import { View, Text } from 'react-native';
import Button from '../Button';

interface UnknownActivityProps {
    type: string;
    onNext: () => void;
}

export default function UnknownActivity({ type, onNext }: UnknownActivityProps) {
    return (
        <View className="flex-1 items-center justify-center p-6 bg-gray-50">
            <Text className="text-xl font-bold mb-4 text-center">
                Activité Inconnue
            </Text>
            <Text className="text-gray-600 mb-8 text-center">
                Désolé, nous ne pouvons pas afficher ce type d'activité pour le moment: "{type}".
                Veuillez mettre à jour l'application ou passer à la suivante.
            </Text>
            <Button
                title="Passer à la suite"
                onPress={onNext}
                className="w-full"
            />
        </View>
    );
}
