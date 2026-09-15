import { createAsyncThunk, createSlice, createDraftSafeSelector, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { RootState } from "../store";
import { AxiosErrorHandler, IAxiosError } from "../Framework/AxiosHelper/AxiosHelper";
import { ELoadingStatus } from "./Enums";

const API_BASE = process.env.REACT_APP_BASE_URL;

export interface IDisc {
  id: string;
  title: string;
  mainTitle: string;
  barcode?: string;
  format?: string;
  category: string;
  cast?: string[];
  year?: number;
  imageUrl?: string | null;
  coverSource?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NewDisc = Omit<IDisc, "id" | "createdAt" | "updatedAt">;

interface DvdState {
  discs: IDisc[];
  status: ELoadingStatus;
  error?: string;
  savingIds: string[]; // ids currently being saved/deleted, for per-card spinners
  coverLookupStatus: ELoadingStatus;
}

const initialState: DvdState = {
  discs: [],
  status: ELoadingStatus.idle,
  savingIds: [],
  coverLookupStatus: ELoadingStatus.idle,
};

// ---- Thunks -----------------------------------------------------------

export const fetchDiscs = createAsyncThunk<IDisc[], void, { rejectValue: IAxiosError }>(
  "dvd/fetchDiscs",
  async (_arg, thunkApi) => {
    try {
      const response = await axios.get(`${API_BASE}/api/discs`);
      return response.data as IDisc[];
    } catch (error: any) {
      return thunkApi.rejectWithValue(AxiosErrorHandler(error));
    }
  }
);

export const createDisc = createAsyncThunk<IDisc, NewDisc, { rejectValue: IAxiosError }>(
  "dvd/createDisc",
  async (disc, thunkApi) => {
    try {
      const response = await axios.post(`${API_BASE}/api/discs`, disc);
      return response.data as IDisc;
    } catch (error: any) {
      return thunkApi.rejectWithValue(AxiosErrorHandler(error));
    }
  }
);

export const updateDisc = createAsyncThunk<
  IDisc,
  { id: string; changes: Partial<NewDisc> },
  { rejectValue: IAxiosError }
>("dvd/updateDisc", async ({ id, changes }, thunkApi) => {
  try {
    const response = await axios.put(`${API_BASE}/api/discs/${id}`, changes);
    return response.data as IDisc;
  } catch (error: any) {
    return thunkApi.rejectWithValue(AxiosErrorHandler(error));
  }
});

export const deleteDisc = createAsyncThunk<string, string, { rejectValue: IAxiosError }>(
  "dvd/deleteDisc",
  async (id, thunkApi) => {
    try {
      await axios.delete(`${API_BASE}/api/discs/${id}`);
      return id;
    } catch (error: any) {
      return thunkApi.rejectWithValue(AxiosErrorHandler(error));
    }
  }
);

// Looks up cover art + a suggested mainTitle for a barcode via the backend,
// which tries UPCitemdb then falls back to a title-based provider.
export const lookupCoverByBarcode = createAsyncThunk<
  { imageUrl: string | null; suggestedMainTitle: string | null; coverSource: string | null },
  string,
  { rejectValue: IAxiosError }
>("dvd/lookupCoverByBarcode", async (barcode, thunkApi) => {
  try {
    const response = await axios.get(`${API_BASE}/api/discs/lookup/${encodeURIComponent(barcode)}`);
    return response.data;
  } catch (error: any) {
    return thunkApi.rejectWithValue(AxiosErrorHandler(error));
  }
});

// Uploads a manually attached cover image (e.g. pasted from the clipboard) to the
// backend's local covers folder and returns the served URL.
export const uploadCoverImage = createAsyncThunk<
  { fileName: string; imageUrl: string },
  { blob: Blob; barcode?: string },
  { rejectValue: IAxiosError }
>("dvd/uploadCoverImage", async ({ blob, barcode }, thunkApi) => {
  try {
    const formData = new FormData();
    formData.append("file", blob, "pasted-cover.png");
    if (barcode) formData.append("barcode", barcode);
    const response = await axios.post(`${API_BASE}/api/discs/covers`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error: any) {
    return thunkApi.rejectWithValue(AxiosErrorHandler(error));
  }
});

// ---- Slice --------------------------------------------------------------

const dvdSlice = createSlice({
  name: "dvd",
  initialState,
  reducers: {
    resetCoverLookupStatus: (state) => {
      state.coverLookupStatus = ELoadingStatus.idle;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscs.pending, (state) => {
        state.status = ELoadingStatus.loading;
        state.error = undefined;
      })
      .addCase(fetchDiscs.fulfilled, (state, action: PayloadAction<IDisc[]>) => {
        state.status = ELoadingStatus.loaded;
        state.discs = action.payload;
      })
      .addCase(fetchDiscs.rejected, (state, action) => {
        state.status = ELoadingStatus.error;
        state.error = action.payload?.message ?? "Failed to load discs.";
      })

      .addCase(createDisc.fulfilled, (state, action: PayloadAction<IDisc>) => {
        state.discs.unshift(action.payload);
      })

      .addCase(updateDisc.pending, (state, action) => {
        state.savingIds.push(action.meta.arg.id);
      })
      .addCase(updateDisc.fulfilled, (state, action: PayloadAction<IDisc>) => {
        state.savingIds = state.savingIds.filter((id) => id !== action.payload.id);
        const index = state.discs.findIndex((disc) => disc.id === action.payload.id);
        if (index !== -1) state.discs[index] = action.payload;
      })
      .addCase(updateDisc.rejected, (state, action) => {
        state.savingIds = state.savingIds.filter((id) => id !== action.meta.arg.id);
        state.error = action.payload?.message ?? "Failed to save changes.";
      })

      .addCase(deleteDisc.pending, (state, action) => {
        state.savingIds.push(action.meta.arg);
      })
      .addCase(deleteDisc.fulfilled, (state, action: PayloadAction<string>) => {
        state.discs = state.discs.filter((disc) => disc.id !== action.payload);
        state.savingIds = state.savingIds.filter((id) => id !== action.payload);
      })
      .addCase(deleteDisc.rejected, (state, action) => {
        state.savingIds = state.savingIds.filter((id) => id !== action.meta.arg);
        state.error = action.payload?.message ?? "Failed to delete disc.";
      })

      .addCase(lookupCoverByBarcode.pending, (state) => {
        state.coverLookupStatus = ELoadingStatus.loading;
      })
      .addCase(lookupCoverByBarcode.fulfilled, (state) => {
        state.coverLookupStatus = ELoadingStatus.loaded;
      })
      .addCase(lookupCoverByBarcode.rejected, (state, action) => {
        state.coverLookupStatus = ELoadingStatus.error;
        state.error = action.payload?.message ?? "Cover lookup failed.";
      });
  },
});

export const { resetCoverLookupStatus } = dvdSlice.actions;

// ---- Selectors ------------------------------------------------------------

const selectSelf = (state: RootState) => state;

export const selectDiscs = createDraftSafeSelector(selectSelf, (state) => state.dvd.discs);
export const selectDvdStatus = createDraftSafeSelector(selectSelf, (state) => state.dvd.status);
export const selectDvdError = createDraftSafeSelector(selectSelf, (state) => state.dvd.error);
export const selectSavingIds = createDraftSafeSelector(selectSelf, (state) => state.dvd.savingIds);
export const selectCoverLookupStatus = createDraftSafeSelector(
  selectSelf,
  (state) => state.dvd.coverLookupStatus
);

export const selectCategories = createDraftSafeSelector(selectDiscs, (discs) => {
  const set = new Set<string>();
  discs.forEach((disc) => set.add(disc.category || "Uncategorized"));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

export default dvdSlice.reducer;
