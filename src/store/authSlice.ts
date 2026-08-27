import type { UserDto } from "@/api/generated/rekordoAPI.schemas";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthStatus = "unknown" | "anonymous" | "signedIn";

interface AuthState {
  /**
   * Starts as "unknown" rather than "anonymous": until the silent refresh has run we do
   * not know which one is true, and showing a signed-out state to a signed-in person is
   * worse than showing nothing for a moment.
   */
  readonly status: AuthStatus;
  readonly user: UserDto | null;
  /** Set when a signed-in device still has a local collection that has never synced. */
  readonly firstSyncPending: boolean;
}

const initialState: AuthState = { status: "unknown", user: null, firstSyncPending: false };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<{ user: UserDto; firstSyncPending: boolean }>) {
      state.status = "signedIn";
      state.user = action.payload.user;
      state.firstSyncPending = action.payload.firstSyncPending;
    },
    signedOut(state) {
      state.status = "anonymous";
      state.user = null;
      state.firstSyncPending = false;
    },
    /**
     * The account came back changed -- renamed, or its address confirmed. Nothing else
     * about the session changes, which is why one reducer covers both: the server hands
     * back the whole account either way, and the token the client holds is untouched.
     */
    accountChanged(state, action: PayloadAction<UserDto>) {
      state.user = action.payload;
    },
    firstSyncResolved(state) {
      state.firstSyncPending = false;
    },
  },
});

export const { signedIn, signedOut, accountChanged, firstSyncResolved } = authSlice.actions;
export default authSlice.reducer;
