import { useEffect } from "react";

export default function usePageTitle(title) {
  useEffect(() => {
    if (title?.includes("•")) {
      document.title = title;
    } else {
      document.title = `${title} • GI FASTag Portal`;
    }
  }, [title]);
}
