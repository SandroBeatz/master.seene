export interface PageProps {
  title?: string
  description?: string
  /**
   * Fill the available height of the parent (e.g. a dashboard panel) instead of
   * growing with content. The body becomes a flex column that can host a
   * full-height child whose own internals scroll, while the page itself doesn't.
   */
  fill?: boolean
}
