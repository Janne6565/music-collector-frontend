import type { UserDto } from "@/api/generated/rekordoAPI.schemas";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthStatus = "unknown" | "anonymous" | "signedIn";

/**
 * What the sign-in conflict resolved to, kept only until the library has said so once.
 *
 * The banner is the only undo there is (29e-5), so it has to survive the navigation from
 * the dialogue to the shelf — and it has to carry the ids, because a line that says twelve
 * records arrived and cannot show you which twelve is decoration.
 */
export interface SyncOutcome {
  readonly resolution: "MERGED" | "KEPT_LOCAL" | "KEPT_ACCOUNT" | "REVIEWED";
  readonly arrived: number;
  readonly edits: number;
  readonly ids: string[];
}

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
  readonly syncOutcome: SyncOutcome | null;
}

const initialState: AuthState = {
  status: "unknown",
  user: null,
  firstSyncPending: false,
  syncOutcome: null,
};

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
      state.syncOutcome = null;
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
    syncOutcomeRecorded(state, action: PayloadAction<SyncOutcome | null>) {
      state.syncOutcome = action.payload;
    },
    /** Dismissed, or acted on. Either way the shelf stops explaining itself. */
    syncOutcomeCleared(state) {
      state.syncOutcome = null;
    },
  },
});

export const {
  signedIn,
  signedOut,
  accountChanged,
  firstSyncResolved,
  syncOutcomeRecorded,
  syncOutcomeCleared,
} = authSlice.actions;
export default authSlice.reducer;
