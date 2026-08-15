"use client";

import { createContext, useContext, useState } from "react";
import { Modal } from "./Modal";

interface Request { title:string; message:string; confirmLabel?:string; tone?:"danger"|"primary"; resolve(value:boolean):void; }
const ConfirmationContext = createContext<(options:Omit<Request,"resolve">)=>Promise<boolean>>(() => Promise.resolve(false));

export function ConfirmationProvider({ children }:{children:React.ReactNode}) {
  const [request,setRequest] = useState<Request|null>(null);
  const confirm = (options:Omit<Request,"resolve">) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve }));
  const finish = (value:boolean) => { request?.resolve(value); setRequest(null); };
  return <ConfirmationContext.Provider value={confirm}>{children}{request && <Modal eyebrow="CONFIRM ACTION" title={request.title} onClose={()=>finish(false)}><div className="confirm-body"><p>{request.message}</p><footer><button className="button secondary" onClick={()=>finish(false)}>Cancel</button><button autoFocus className={`button ${request.tone === "primary" ? "primary" : "danger"}`} onClick={()=>finish(true)}>{request.confirmLabel ?? "Confirm"}</button></footer></div></Modal>}</ConfirmationContext.Provider>;
}
export const useConfirmation = () => useContext(ConfirmationContext);
