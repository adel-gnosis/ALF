import { ActivityWizardState } from '@alf/shared';
import DicteeActivityForm from './DicteeActivityForm';
import FillBlankActivityForm from './FillBlankActivityForm';

interface Step4Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function Step4_ActivityContent({ state, updateState, onSuccess }: Step4Props) {
    // Render the appropriate form based on activity type
    const renderActivityForm = () => {
        switch (state.activityType) {
            case 'DicteeActivity':
                return <DicteeActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'FillBlankActivity':
                return <FillBlankActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            // Add other activity types here
            case 'ConjugationActivity':
            case 'TextInputActivity':
            case 'DragOrderActivity':
            case 'MCQActivity':
            case 'MatchingActivity':
            case 'MultipleAnswerActivity':
                return (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🚧</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Formulaire en développement
                        </h3>
                        <p className="text-gray-600">
                            Le formulaire pour {state.activityType} sera disponible bientôt.
                        </p>
                    </div>
                );

            default:
                return (
                    <div className="text-center py-12 text-gray-500">
                        Sélectionnez un type d'activité pour continuer.
                    </div>
                );
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-1">
            {renderActivityForm()}
        </div>
    );
}