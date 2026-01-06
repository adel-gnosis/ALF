import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import courseApi from '../../services/courseService';
import { useCourseStore } from '../../stores/courseStore';
import { Ionicons } from '@expo/vector-icons';

export default function CoursesScreen() {
    const router = useRouter();
    const setSelectedCourse = useCourseStore((state) => state.setSelectedCourse);

    const { data: courses, isLoading } = useQuery({
        queryKey: ['courses'],
        queryFn: courseApi.getCourses,
    });

    const handleCoursePress = (course: any) => {
        setSelectedCourse(course);
        router.push('/(tabs)/levels'); // Navigate to levels tab, which will now filter by this course
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-indigo-600 p-6 pt-12">
                <Text className="text-3xl font-bold text-white">Matières</Text>
                <Text className="text-indigo-100 mt-2">Que voulez-vous apprendre aujourd'hui?</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {courses?.map((course: any) => (
                    <TouchableOpacity
                        key={course.id}
                        onPress={() => handleCoursePress(course)}
                        className="bg-white rounded-xl p-5 mb-4 shadow-sm flex-row items-center"
                        style={{ borderLeftWidth: 6, borderLeftColor: course.color || '#3B82F6' }}
                    >
                        <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mr-4">
                            <Ionicons name={course.icon as any || 'book'} size={28} color={course.color || '#3B82F6'} />
                        </View>

                        <View className="flex-1">
                            <Text className="text-xl font-bold text-gray-900">{course.title}</Text>
                            <Text className="text-sm text-gray-500 mt-1">{course.description}</Text>
                        </View>

                        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
