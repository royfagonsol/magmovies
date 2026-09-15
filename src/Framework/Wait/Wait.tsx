import { Backdrop, CircularProgress, Fade } from "@mui/material";

export interface IWaitProps {
  /**
   * If true the wait cursor will show over the whole screen
   */
  open: boolean;
  /** MUI guidlines state you dont need a wait cursor for processes that take < 1 second. So we should really do a fade at 800ms
   * if you want no delay at all then set this to be "0ms"
   */
  delayms?: string;
}

/**
 * Shows a indeterminate spinner over the top of your app.
 * Ideal when data is being fetched, but remember to handle your timeouts or this dialog will never go away and users will be locked out of the app!
 * @param props
 */
export function Wait(props: IWaitProps): JSX.Element {
  return (
    <Fade
      in={props.open}
      style={{
        transitionDelay: props.open ? props.delayms || "100ms" : "0ms",
      }}
      unmountOnExit
    >
      <Backdrop sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} open={props.open}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Fade>
  );
}
