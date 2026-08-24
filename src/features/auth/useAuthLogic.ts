import { setAccessToken } from "@/api/axios-instance";
import { login, logout, providers, register } from "@/api/generated/auth/auth";
import { useStore } from "@/local/StoreProvider";
import { signedIn, signedOut } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

export type AuthMode = "SIGN_IN" | "REGISTER";
export type AuthError = "badCredentials" | "emailTaken" | "generic";

export function useAuthLogic() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { store } = useStore();
  const auth = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<AuthMode>("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [failed, setFailed] = useState<AuthError | null>(null);

  // Only providers the server can actually complete a flow with, so an unconfigured one
  // is absent rather than a button that fails when pressed.
  const providerQuery = useQuery({ queryKey: ["authProviders"], queryFn: () => providers() });

  const submit = useMutation({
    mutationFn: async () => {
      const session =
        mode === "REGISTER"
          ? await register({ email: email.trim(), password, displayName: displayName.trim() })
          : await login({ email: email.trim(), password, rememberMe });
      if (session.accessToken === undefined || session.user === undefined) {
        throw new Error("The server did not return a session");
      }
      setAccessToken(session.accessToken);

      // A device that already holds a collection has to be asked what to do with it before
      // anything is pushed or pulled — every option is destructive in one direction.
      const hasLocalCollection = (await store.listCopies()).length > 0;
      const hasSyncedBefore = (await store.readSyncCursor()) > 0;
      return { user: session.user, firstSyncPending: hasLocalCollection && !hasSyncedBefore };
    },
    onSuccess: ({ user, firstSyncPending }) => {
      dispatch(signedIn({ user, firstSyncPending }));
      setFailed(null);
      if (!firstSyncPending) void navigate({ to: "/" });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status;
      setFailed(status === 409 ? "emailTaken" : status === 401 ? "badCredentials" : "generic");
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await logout().catch(() => undefined);
      setAccessToken(null);
    },
    onSuccess: async () => {
      dispatch(signedOut());
      // The local collection deliberately stays: signing out returns the app to how it
      // behaves with no account, and wiping someone's records on sign-out would be a
      // spectacular way to lose data.
      await queryClient.invalidateQueries();
    },
  });

  return {
    auth,
    mode,
    setMode: useCallback((next: AuthMode) => {
      setMode(next);
      setFailed(null);
    }, []),
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    rememberMe,
    setRememberMe,
    agreed,
    setAgreed,
    availableProviders: providerQuery.data ?? [],
    // Completeness only — the server validates the address and password properly, and a
    // dead button that will not say why is worse than a rejected submit. The terms box is
    // the exception: it is a required acknowledgement, not a format rule.
    canSubmit: email.trim().length > 0 && password.length > 0 && (mode === "SIGN_IN" || agreed),
    submit: () => submit.mutate(),
    submitting: submit.isPending,
    failed,
    signOut: () => signOut.mutate(),
    signingOut: signOut.isPending,
  };
}
