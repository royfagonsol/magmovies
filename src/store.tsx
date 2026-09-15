import { configureStore } from "@reduxjs/toolkit";
import sessionSliceReducer from "./redux/SessionSlice";
import dvdSliceReducer from "./redux/GallerySlice";

const store = configureStore({
  reducer: {
    session: sessionSliceReducer,
    gallery: dvdSliceReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
