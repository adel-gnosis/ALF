import { ActivityWizardState } from '@alf/shared';
import ChoiceActivityForm from './ChoiceActivityForm';

interface MCQActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function MCQActivityForm(props: MCQActivityFormProps) {
    return <ChoiceActivityForm {...props} multiple={false} />;
}
