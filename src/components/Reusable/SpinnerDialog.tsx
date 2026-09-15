// Currently a no-op placeholder (previously rendered a spinner in a Dialog).
// Kept as a component so callers don't need to change; wire up @mui/material's
// Dialog + the /images/loading.gif spinner here if/when this is needed again.
export default function SpinnerDialog(): JSX.Element {
  return <div />;
}
