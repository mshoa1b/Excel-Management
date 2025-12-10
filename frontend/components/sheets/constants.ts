
export const blockedByOptions = [
    'Choose', 'PIN Required', 'Code Required', 'Apple ID Required', 'Google ID Required',
    'Awaiting Part', 'Awaiting Replacement', 'Awaiting Customer', 'Awaiting BM', 'Awaiting G&I', 'Awaiting Techezm',
    'OOW', 'Locked'
];

export const lockedOptions = ['Choose', 'No', 'Google ID', 'Apple ID', 'PIN'];
export const oowOptions = ['Choose', 'No', 'Damaged', 'Wrong Device'];

export const MULTILINE_COLS = ['customer_comment', 'additional_notes', 'cs_comment', 'manager_notes'];

export const yesNoOptions = ['Choose', 'Yes', 'No'];
export const returnTypeOptions = ['Choose', 'Refund', 'Replacement', 'Repair'];

export const returnTypeColors: Record<string, string> = {
    'Refund': 'bg-red-50 text-red-700',
    'Replacement': 'bg-blue-50 text-blue-700',
    'Repair': 'bg-amber-50 text-amber-700',
    'Choose': 'bg-slate-50 text-slate-700',
    'default': 'bg-slate-50 text-slate-700'
};

export const resolutionOptions = ['Choose', 'Back in stock',
    'Sent back to supplier', 'Sent repaired back to customer', 'Sent un-repaired back to customer', 'BER'];