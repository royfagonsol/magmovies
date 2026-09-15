import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { RootState } from "../store";
import { AxiosErrorHandler, IAxiosError } from "../Framework/AxiosHelper/AxiosHelper";

interface DvdState { details: Record<string, ImageDetails>; }
const initialState: DvdState = { details: {} };

const dvdSlice=createSlice({name:"dvd",initialState,reducers:{},extraReducers:builder=>{
}});

export default dvdSlice.reducer;
