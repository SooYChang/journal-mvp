export type UserRole = "MEMBER" | "SOCIETY_ADMIN";
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
  issues: IssueSummary[];
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
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type SiteCoverCopy = {
  title: string;
  subtitle: string;
};
