import type {
  CapturedCookie,
  CapturedRequest,
} from "@acs/shared";
import type { Page } from "playwright";

export type ScanContext = {
  url: string;
  finalUrl: string;
  title: string;
  requests: CapturedRequest[];
  cookies: CapturedCookie[];
  page: Page;
};
