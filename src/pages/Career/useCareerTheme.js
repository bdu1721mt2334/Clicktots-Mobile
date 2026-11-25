// Purpose: Dark / light preference for the Career overlay, synced with the site-wide theme switch.
import useSiteTheme from "@/hooks/useSiteTheme";

export default function useCareerTheme() {
  return useSiteTheme();
}