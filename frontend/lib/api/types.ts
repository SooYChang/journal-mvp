export type UserRole = "READER" | "ANNOTATOR" | "SOCIETY_ADMIN";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "READER", label: "Reader — read PDFs and annotations" },
  { value: "ANNOTATOR", label: "Annotator — read and write annotations" },
  { value: "SOCIETY_ADMIN", label: "Administrator" },
];

export function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export function canAnnotate(role: string | undefined): boolean {
  return role === "ANNOTATOR" || role === "SOCIETY_ADMIN" || role === "MEMBER";
}

export function membershipRole(role: string): UserRole {
  if (role === "ANNOTATOR" || role === "MEMBER") return "ANNOTATOR";
  if (role === "SOCIETY_ADMIN") return "SOCIETY_ADMIN";
  return "READER";
}
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type User = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
};

export type JournalSummary = {
  id: string;
  name: string;
  discipline: string;
  description: string;
  issnOnline: string;
  publisher: string;
  foundedYear: number;
  frequency: string;
  coverUrl: string | null;
};

export type IssueStatus = "DRAFT" | "PUBLISHED";

export type IssueSummary = {
  id: number;
  journalId: string;
  volume: number;
  issue: number;
  publishedAt: string;
  description: string;
  status: IssueStatus;
};

export type JournalDetail = JournalSummary & {
  aimsAndScope: string;
  editorInChief: string;
  editorialBoard: string | null;
  contactEmail: string | null;
  openAccessNote: string | null;
  publisherFullName: string | null;
  aboutPublisher: string | null;
  publisherCity: string | null;
  publisherContact: string | null;
  membershipNote: string | null;
  membershipEmail: string | null;
  issues: IssueSummary[];
};

export type JournalProfileUpdate = {
  name: string;
  description: string;
  issnOnline: string;
  publisher: string;
  foundedYear: number;
  frequency: string;
  aimsAndScope: string;
  editorInChief: string;
  editorialBoard: string;
  contactEmail: string;
  openAccessNote: string;
  publisherFullName: string;
  aboutPublisher: string;
  publisherCity: string;
  publisherContact: string;
  membershipNote: string;
  membershipEmail: string;
};

export type IssueArticle = {
  id: number;
  title: string;
  authors: string[];
  pages: string | null;
  doi: string | null;
  articleType: string;
  hasPdf: boolean;
};

export type IssueDetail = {
  id: number;
  journalId: string;
  volume: number;
  issue: number;
  publishedAt: string;
  description: string;
  status: IssueStatus;
  articles: IssueArticle[];
};

export type ArticleSummary = {
  id: number;
  journalId: string;
  journalName: string;
  discipline: string;
  title: string;
  authors: string[];
  abstractPreview: string;
  keywords: string[];
  volume: number;
  issue: number;
  pages: string | null;
  doi: string | null;
  articleType: string;
  publishedAt: string;
  citations: number;
  openAccess: boolean;
  hasPdf: boolean;
};

export type JournalArticleDetail = ArticleSummary & {
  abstractText: string;
  issueId: number;
  pdfOriginalFilename: string | null;
  pdfSizeBytes: number | null;
  uploadedAt: string | null;
  journal: JournalSummary;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type JournalArticleFilterOptions = {
  years: number[];
  volumes: number[];
  issues: number[];
  articleTypes: string[];
  keywords: string[];
};

export type GlobalArticleFilterOptions = {
  journals: { id: string; name: string }[];
  disciplines: string[];
  years: number[];
  articleTypes: string[];
  keywords: string[];
};

export type AnnotationAuthor = {
  id: number;
  displayName: string;
};

export type AnnotationReply = {
  id: number;
  author: AnnotationAuthor;
  body: string;
  createdAt: string;
};

export type Annotation = {
  id: number;
  articleId: number;
  author: AnnotationAuthor;
  pageNumber: number;
  selectedText: string;
  positionData: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canResolve: boolean;
  replies: AnnotationReply[];
};

export type Member = {
  id: number;
  email: string;
  displayName: string;
  affiliation: string | null;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type SiteCoverCopy = {
  title: string;
  subtitle: string;
};
