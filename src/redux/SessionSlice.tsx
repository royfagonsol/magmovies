
import {
  createSlice,
  createDraftSafeSelector,
  PayloadAction,
} from "@reduxjs/toolkit";

export interface IMessage {
  msg_id: string;
  app_id: string;
  message: string;
}


export interface ISessionState {
  is_boundary_error: boolean;
  showDialog: boolean;
  view: number;
  last_view: number;
}

const initialState: ISessionState = {
  is_boundary_error: false,
  showDialog: false,
  view: 1,
  last_view: 1,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    UpdateView: (state, action: PayloadAction<number>) => {
      state.last_view = state.view;
      state.view = action.payload;
    },
    UpdateIsBoundaryError: (state, action: PayloadAction<boolean>) => {
      state.is_boundary_error = action.payload;
      console.log("UpdateIsBoundaryError", state.is_boundary_error);
    },
  },
  extraReducers: (builder) => {},
});

export const {
  UpdateView,
  UpdateIsBoundaryError,
} = sessionSlice.actions;

const selectSelf = (state: any) => state;

export const selectBoundaryError = createDraftSafeSelector(
  selectSelf,
  (state) => state.session.is_boundary_error
);

// DIALOG
export const selectDialogMessage = createDraftSafeSelector(
  selectSelf,
  (state) => state.session.dialogMessage
);
export const selectShowDialog = createDraftSafeSelector(
  selectSelf,
  (state) => state.session.showDialog
);

// VIEW STATE
export const selectView = createDraftSafeSelector(
  selectSelf,
  (state) => state.session.view as number
);
export const selectLastView = createDraftSafeSelector(
  selectSelf,
  (state) => state.session.last_view as number
);

export default sessionSlice.reducer;
