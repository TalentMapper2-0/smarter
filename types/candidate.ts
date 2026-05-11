export type Candidate = {
  id: string;
  linkedInUrl: string;
  name: string;
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
  name: string;
  label: string;
  explanation: string;
  status: string;
};
