export {
  whiteboardApi,
  whiteboardKeys,
  whiteboardQueries,
  realtimeSocketUrl,
} from "./api/whiteboard";
export type { WhiteboardLinkCandidate } from "./api/whiteboard";
export { templateErrorMessage, whiteboardErrorMessage } from "./model/errors";
export {
  WHITEBOARD_COMMENT_MAX,
  WHITEBOARD_LINK_LIMIT,
  WHITEBOARD_TEMPLATE_DESCRIPTION_MAX,
  WHITEBOARD_TEMPLATE_LIMIT,
  WHITEBOARD_TEMPLATE_NAME_MAX,
  WHITEBOARD_TITLE_MAX,
  whiteboardTemplateCategories,
  whiteboardTemplateCategoryLabels,
} from "./model/types";
export { groupTemplates } from "./model/templates";
export { TemplatePicker } from "./ui/TemplatePicker";
export { WhiteboardChips } from "./ui/WhiteboardChips";
export type * from "./model/types";
