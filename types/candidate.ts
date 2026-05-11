export type Candidate = {
  id: string;
  linkedInUrl: string;
  firstName: string;
  lastName: string;
  explanation: string;
  label: string;
  salesNavigatorId: string;
  chatId: string;
};

export type CandidateCreate = {
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  salesNavigatorId?: string;
};

export type CandidateClassificationRow = {
  id: string;
  linkedinUrl: string;
  salesNavigatorId: string;
  firstName: string;
  lastName: string;
  label: string;
  explanation: string;
  status: string;
};
