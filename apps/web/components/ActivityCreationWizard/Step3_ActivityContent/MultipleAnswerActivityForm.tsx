import { ActivityWizardState } from '@alf/shared';
import ChoiceActivityForm from './ChoiceActivityForm';

interface MultipleAnswerActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function MultipleAnswerActivityForm(props: MultipleAnswerActivityFormProps) {
    return <ChoiceActivityForm {...props} multiple={true} />;
}
