import { useEffect } from "react";
import { FieldErrors } from "react-hook-form";
import { firstPath }  from "@/utils/firstPath";   
import { idFromPath } from "@/utils/idFromPath";

export default function useScrollToFirstError(errors: FieldErrors) {
  useEffect(() => {
    const path = firstPath(errors);
    if (!path) return;

    let tries = 0;
    const scroll = () => {
      const el = document.getElementById(idFromPath(path));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus?.({ preventScroll: true });

        if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
          el.classList.add("ring-2", "ring-red-400");
          setTimeout(() => el.classList.remove("ring-2", "ring-red-400"), 2000);
        }
        return;
      }
      if (++tries < 8) requestAnimationFrame(scroll); // wait for motion/accordion
    };

    requestAnimationFrame(scroll);
  });
}
