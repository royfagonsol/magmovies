import { AsyncThunk } from "@reduxjs/toolkit";
import {
  EBasicAlertIcon,
  IBasicAlertProps,
} from "../../Framework/BasicAlert/BasicAlert";

export interface IAxiosClientHelperArgs {
  result: IAxiosError;
  thunk: AsyncThunk<undefined, void, {}>;
  onClose: (event: any) => void;
}

/**
 * use in the catch block of a thunk call, will strip out the error
 * regadless of if its a SQL error, network, http (400,500) etc.
 * You probably still need to handle errors thrown if you are manipulating a 
 * valid response, probably with its own catch block.
 * @param error the error in the catch block of an axios call.
 * @returns a IAxiosError so your rejected reducer can do something with this information.
 * @example
 * Here's a simple example:
 * ```
 * export const DemoThunk = createAsyncThunk<
  IDemo[],
  void,
  { rejectValue: IAxiosError }
>("demo/demoSave", async (id, thunkAPI) => {
  try {
    //get the current state
    const currentState = thunkAPI.getState() as RootState;

    const response = await axios.post(
      process.env.REACT_APP_BASE_URL +
        "/api/stored_procedure/LIVE_fp_warehouse/Demo_GoodSave_arse",
      JSON.stringify({ testString: currentState.demo.testString }),
      requestHeaders(currentState)
    );

    //Handle any errors with the data return separately, AxiosErrorHandler only covers SQL/HTTP/network errors
    try {
      //process the response in some way if required.
      let dataList = await response.data.Table;
      let newData: IDemo = dataList.map((row: IDemo) => ({
        id: row.id,
      }));
      const returnObj = [newData];
      //return the result to extrabuilder.fullfilled.
      return returnObj;
    } catch (error: any) {
      let err: IAxiosError = {
        message: "could not process the response. " + error.toString(),
        name: "Response Processing Error",
      };
      return thunkAPI.rejectWithValue(err);
    }
  } catch (error: any) {
    return thunkAPI.rejectWithValue(AxiosErrorHandler(error));
  }
});
 * ```
 */
export const AxiosErrorHandler = (error: any): IAxiosError => {
  let err: IAxiosError = { message: "Error - ", name: "default" };

  if (error === undefined) {
    err.message = "Undefined error object.";
    return err;
  }

  if (error.response) {
    //if a SQL error
    if (error.response.data.ExceptionMessage) {
      err.message = String(error.response.data.ExceptionMessage).split("\n")[0];
      err.name = "SQL Error";
    } else if (error.response.status) {
      //Handle 400, 500 etc errors
      err.name = error.response.status.toString() + " : HTTP Error";
      switch (error.response.status) {
        case 401:
          err.message = "User name or password is incorrect.";
          //dispatch(clearPassword());
          break;
        case 404:
          err.message =
            "This url does not exist. " + (error.request.responseURL || "");
          break;
        case 500:
          err.message = "Internal server error";
          break;
      }
    }
    return err;
  }

  //Network Errors
  if (error.toString().includes("Network Error")) {
    //generic error as a problem with the request
    err.message = "You are no longer connect to the network.";
    err.name = "Network Error";
    return err;
  }

  //Axios timeout
  if (error.code && error.code === "ECONNABORTED") {
    err.message =
      (error.message || "") +
      " axios error, is your URL wrong or DNS down or VPN not connected?";
    err.name = error.code + " : Axios Error";
    return err;
  }

  //stored proc typo?
  if (
    error.message &&
    error.message === "Cannot read properties of undefined (reading 'map')"
  ) {
    //Stored procedure doesnt exist or you have a typo, so the reflective API cannot map out the parameters
    err.message =
      (error.message || "") +
      " is you stored procedure name correct (typo? new version?)";
    err.name = "";
    return err;
  }

  return err;
};

///////////////////////////////////// AxiosClientHelper
/**
 *
 * @param error
 * @example
 * ```
 * const resultAction = await dispatch(nameOfYourThunk());
 *  let errorArgs = await AxiosClientHelper(
 *    resultAction.payload as IAxiosError,
 *     onClose //the callback run when the user presses the OK button, e.g. clear the dialog arguments so its hidden SetErrorArgs({ ...errorArgs, open: false });
 *   );
 *   SetErrorArgs(errorArgs); //local state, setting the errorArgs will show the dialog if errorArgs.open is true
 * ```
 */
export const AxiosClientHelper = async (
  payload: IAxiosError,
  callback: () => void
) => {
  //Default return settings
  let retval: IBasicAlertProps = {
    icon: EBasicAlertIcon.ERROR,
    title: "",
    message: "",
    onClose: () => {},
    open: false,
  };

  if (payload.message === undefined) {
    //console.log("Good axios call:", payload);
  } else if (payload) {
    retval = {
      icon: EBasicAlertIcon.ERROR,
      title: payload.name,
      message: payload.message,
      onClose: callback,
      open: true,
    };
  }
  return retval;
};

export interface IAxiosError extends Error {}
