export interface BaseActivity {
    id: number;
    resourcetype: string;
    question_text: string;
    points: number;
    explanation?: string;
}

export interface MCQActivity extends BaseActivity {
    resourcetype: 'MCQActivity';
    choices: string[];
    correct_answer_index: number;
}

export interface FillBlankActivity extends BaseActivity {
    resourcetype: 'FillBlankActivity';
    correct_answer: string;
}

export interface MatchingActivity extends BaseActivity {
    resourcetype: 'MatchingActivity';
    pairs: Record<string, string>;
}

export interface DragOrderActivity extends BaseActivity {
    resourcetype: 'DragOrderActivity';
    words: string[];
    correct_order: number[];
}

export interface ConjugationActivity extends BaseActivity {
    resourcetype: 'ConjugationActivity';
    verb: string;
    tense: string;
    pronoun: string;
    correct_conjugation: string;
}

export interface MultipleAnswerActivity extends BaseActivity {
    resourcetype: 'MultipleAnswerActivity';
    choices: string[];
    correct_indices: number[];
}

export interface TextInputActivity extends BaseActivity {
    resourcetype: 'TextInputActivity';
    correct_answers: string[];
    case_sensitive: boolean;
}

export type Activity =
    | MCQActivity
    | FillBlankActivity
    | MatchingActivity
    | DragOrderActivity
    | ConjugationActivity
    | MultipleAnswerActivity
    | TextInputActivity;
