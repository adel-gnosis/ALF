#!/bin/bash

# Activate virtual environment and run seed_minimal command

cd /home/iori/Desktop/ALF/backend

# Activate venv
source venv/bin/activate

# Run seed command with clear flag
python3 manage.py seed_minimal --clear --levels 30

echo ""
echo "✅ Database seeded with 30 levels!"
echo ""
echo "Next steps:"
echo "1. Use INTERACTIVE_ACTIVITY_GENERATOR.md to generate activities"
echo "2. Import with: python3 manage.py import_activities <json_file>"
