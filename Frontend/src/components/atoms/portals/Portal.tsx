import { createPortal } from "react-dom";

export default function Portal({ children }: { children: React.ReactNode }) {
  const root = document.body;          
  return createPortal(children, root);
}