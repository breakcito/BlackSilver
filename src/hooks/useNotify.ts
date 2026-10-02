import { useCallback } from "react";
import { useUIStore, type IMessage } from "../stores/ui.store";

/**
 * Las acciones del store (`notify`, `clearMessage`) ya son estables, pero los
 * wrappers que se exponían aquí se creaban en cada render. Eso rompía la
 * identidad de `notifyError` / `notifySuccess` / `notifyInfo`, y con ella
 * cualquier `useCallback` que las listara en sus dependencias: si ese callback
 * alimentaba un `useEffect`, el effect se re-disparaba en cada render y el
 * módulo refetcheaba en loop, pisando los updates optimistas de estado.
 *
 * No simplificar de vuelta a funciones inline sin `useCallback`.
 */
export const useNotify = () => {
  const notify = useUIStore((state) => state.notify);
  const message = useUIStore((state) => state.message);
  const clearMessage = useUIStore((state) => state.clearMessage);

  const notifyMessage = useCallback((msg: IMessage) => notify(msg), [notify]);

  const notifySuccess = useCallback(
    (content: string) => notify({ type: "success", content }),
    [notify],
  );

  const notifyError = useCallback(
    (content: string) => notify({ type: "error", content }),
    [notify],
  );

  const notifyInfo = useCallback(
    (content: string) => notify({ type: "info", content }),
    [notify],
  );

  const clearNotify = useCallback(
    () => notify({ type: "", content: "" }),
    [notify],
  );

  return {
    message,
    clearMessage,
    notify: notifyMessage,
    notifySuccess,
    notifyError,
    notifyInfo,
    clearNotify,
  };
};
