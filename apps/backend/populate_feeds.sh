#!/bin/bash

# Activate venv
cd /home/iori/Desktop/ALF/backend
source venv/bin/activate

echo "🚀 Starting Bulk Import..."
echo "--------------------------------"

# Import all JSON files in the feeds directory
for file in data/activities/feeds/*.json; do
    echo "📦 Importing $file..."
    python3 manage.py import_activities "$file" --skip-duplicates
    echo "--------------------------------"
done

echo "✅ All feeds imported successfully!"
echo "--------------------------------"
echo "📊 Database Status:"
python3 manage.py shell -c "from activities.models import Activity; from courses.models import Level, Subject; print(f'Levels: {Level.objects.count()}, Subjects: {Subject.objects.count()}, Activities: {Activity.objects.count()}')"
