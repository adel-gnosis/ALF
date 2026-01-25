import { ActivityWizardState } from '@alf/shared';
import DicteeActivityForm from './DicteeActivityForm';
import FillBlankActivityForm from './FillBlankActivityForm';
import DragOrderActivityForm from './DragOrderActivityForm';
import MCQActivityForm from './MCQActivityForm';
import MultipleAnswerActivityForm from './MultipleAnswerActivityForm';
import ConjugationActivityForm from './ConjugationActivityForm';
import TextInputActivityForm from './TextInputActivityForm';
import MatchingActivityForm from './MatchingActivityForm';

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

            case 'DragOrderActivity':
                return <DragOrderActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'MCQActivity':
                return <MCQActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'MultipleAnswerActivity':
                return <MultipleAnswerActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'ConjugationActivity':
                return <ConjugationActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'TextInputActivity':
                return <TextInputActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

            case 'MatchingActivity':
                return <MatchingActivityForm state={state} updateState={updateState} onSuccess={onSuccess} />;

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