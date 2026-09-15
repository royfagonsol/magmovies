//NOTE: Isnt this MUI 5?
import Alert, { AlertColor } from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";

export enum EBasicAlertIcon {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
  NONE = "NONE",
}

export interface IBasicAlertProps {
  /**
   * Specify which icon and style you want to display:
   * ERROR (red !),
   * WARNING (yellow !) etc.
   * INFO (blue i)
   * SUCCESS (green tick)
   */
  icon: EBasicAlertIcon;
  /**
   * Specify a custom title, otherwise the following defaults will be used based on the enum.
   * ERROR, WARNING, INFO or SUCCESS.
   */
  title?: string;
  /**
   * Specify the text to be displayed.
   */
  message?: string;
  /**
   * Specify a handler when the OK button is clicked
   */
  onClose: () => void;
  /**
   * Specify whether the dialog is displayed.
   */
  open: boolean;
}

/**
 * Shows a generic alert dialog.
 * @param props
 * @params props.title - if not set will not have a title
 * @params props.message - if not set will not have a message
 * @params props.icon - will show even if we dont have a title
 * onClose - a function to be called when the "OK" is pressed, you would use this to hide the dialog
 * open - if true we show, if false we dont.
 * @returns
 */
export default function BasicAlert(props: IBasicAlertProps) {
  let aColor: AlertColor = "success";
  let title = props.title;

  switch (props.icon) {
    case EBasicAlertIcon.WARNING:
      aColor = "warning";
      title = props.title || "WARNING";
      break;
    case EBasicAlertIcon.ERROR:
      aColor = "error";
      title = props.title || "ERROR";
      break;
    case EBasicAlertIcon.INFO:
      aColor = "info";
      title = props.title || "INFO";
      break;
    default:
      aColor = "success";
      title = props.title || "SUCCESS";
      break;
  }

  return (
    <Dialog open={props.open}>
      <Alert severity={aColor}>
        <AlertTitle>{title}</AlertTitle>
        <div>{props.message}</div>
        <Box textAlign="center">
          <br />
          <Button
            variant="contained"
            color="inherit"
            size="small"
            onClick={props.onClose}
          >
            OK
          </Button>
        </Box>
      </Alert>
    </Dialog>
  );
}
