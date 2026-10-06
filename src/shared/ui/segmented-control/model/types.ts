export interface SegmentedControlItem<V extends string | number = string> {
  value: V
  label?: string
  icon?: string
  // Required for icon-only segments so screen readers get a name.
  ariaLabel?: string
}
